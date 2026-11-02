'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { DomainBadge, DomainIcon } from '@/components/booking/DomainBadge';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { TargetDialog } from '@/features/targets/TargetDialog';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { DomainDashboard as DashboardData, Severity, StageAnalysis, StageId } from '@/lib/api/types';
import { fmtHours, fmtLongHours } from '@/lib/format';
import { STAGE_COLOR, STAGE_ORDER, STAGE_SHORT, WAIT_LABEL } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { BottlenecksPanel } from './BottlenecksPanel';
import { indexStages, Pipeline, TrendChart, worstStage } from './charts';

const SEVERITY: Record<Severity, { label: string; tone: 'bad' | 'warn' | 'ok' | '' }> = {
  critical: { label: 'חריגה', tone: 'bad' },
  warning: { label: 'קרוב ליעד', tone: 'warn' },
  ok: { label: 'תקין', tone: 'ok' },
  no_target: { label: 'ללא יעד', tone: '' },
};

const WINDOWS = [
  { value: '7', label: 'שבוע' },
  { value: '30', label: '30 ימים' },
  { value: '90', label: 'רבעון' },
];

/** Stages where a booking waits for an approver's decision. */
const APPROVAL_STAGES: StageId[] = ['control_officer', 'vice_approver', 'approver'];

function parseTypes(raw: string | null): number[] {
  return (raw ?? '')
    .split(',')
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** Dashboard of one service domain (or all of a commander's domains), in six blocks; the detailed analysis opens on demand. */
export function DomainDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const { me, typeName } = useSession();
  const action = useStatusAction();
  const [targetOpen, setTargetOpen] = useState(false);
  const [full, setFull] = useState(false);

  const types = useMemo(() => parseTypes(search.get('types')), [search]);
  const days = ['7', '30', '90'].includes(search.get('days') ?? '') ? Number(search.get('days')) : 30;

  const params = { types, days };
  const query = useQuery({ queryKey: keys.domainDashboard(params), queryFn: ({ signal }) => insightsApi.domainDashboard(params, signal), placeholderData: (previous) => previous });
  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), staleTime: 60_000 });

  if (query.isPending) return <Loading rows={10} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;
  const single = data.booking_type_ids.length === 1 ? data.booking_type_ids[0] : null;
  const typesParam = single ? `&types=${data.booking_type_ids.join(',')}` : '';
  const info = indexStages(data.stages);
  const ordered = STAGE_ORDER.map((id) => info[id]).filter((s): s is StageAnalysis => Boolean(s));
  const worst = worstStage(data.stages);
  const scale = Math.max(1, ...ordered.map((s) => s.p90_hours ?? 0)) * 1.15;
  const pct = (hours: number | null) => `${Math.min(100, ((hours ?? 0) / scale) * 100)}%`;
  const awaitingApproval = APPROVAL_STAGES.reduce((sum, id) => sum + (data.by_stage[id] ?? 0), 0);

  const canGoBack = me.is_super_admin || me.is_admin;
  const canSetTarget = single !== null && me.capabilities['targets.manage'] && (me.is_super_admin || me.permissions.includes(`admin_${single}`));
  const targetText = data.target ? `יעד טיפול: ${fmtLongHours(data.target.target_hours)} מפתיחה ועד סגירה` : 'לא הוגדר יעד טיפול לתחום';

  const setWindow = (value: string) => {
    const next = new URLSearchParams(search.toString());
    next.set('days', value);
    router.replace(`/dashboard?${next.toString()}`, { scroll: false });
  };
  const goStage = (stage: StageId) => router.push(`/requests?view=open&stage=${stage}${typesParam}`);
  const goIds = (ids: number[]) => ids.length && router.push(`/requests?view=all&ids=${ids.join(',')}`);

  const opened = data.trend.reduce((sum, point) => sum + point.opened, 0);
  const closed = data.trend.reduce((sum, point) => sum + point.closed, 0);

  const attention = [
    { count: data.totals.needs_decision, title: 'קריאות דורשות הכרעה', text: 'הקריאה שונתה במקביל במערכת החיצונית.', tone: 'var(--bad)', href: `/requests?view=decide${typesParam}` },
    { count: data.totals.overdue, title: 'קריאות חורגות מיעד הטיפול', text: 'הזמן מפתיחה ארוך מהיעד שהוגדר לתחום.', tone: 'var(--bad)', href: `/requests?view=overdue${typesParam}` },
    { count: data.totals.stale, title: 'קריאות לא התקדמו מעל שבוע', text: 'לא נרשם בהן שינוי סטטוס 7 ימים ומעלה.', tone: 'var(--warn)', href: `/requests?view=open${typesParam}` },
  ].filter((row) => row.count > 0);

  const domainRows = Object.entries(overview.data?.by_type_stage ?? {})
    .map(([type, stages]) => ({ type: Number(type), stages, total: Object.values(stages).reduce((sum, n) => sum + (n ?? 0), 0) }))
    .filter((row) => data.booking_type_ids.includes(row.type) && row.total > 0)
    .sort((a, b) => b.total - a.total);
  const widest = Math.max(1, ...domainRows.map((row) => row.total));
  const usedStages = STAGE_ORDER.filter((id) => domainRows.some((row) => row.stages[id]));

  return (
    <>
      <div className="page-head">
        <div>
          {canGoBack ? (
            <Link href="/" className="btn sm ghost back">
              <Icon name="right" />
              חזרה למסך הראשי
            </Link>
          ) : null}
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {single ? <DomainBadge bookingTypeId={single} /> : null}
            {single ? typeName(single) : 'התחומים שלך'}
          </h1>
          <p>
            {single ? '' : `${data.booking_type_ids.map((id) => typeName(id)).join(', ')}. `}
            {targetText}.
          </p>
        </div>
        <div className="actions">
          <div className="seg" role="group" aria-label="חלון זמן">
            {WINDOWS.map((w) => (
              <button key={w.value} type="button" aria-pressed={String(data.window_days) === w.value} onClick={() => setWindow(w.value)}>
                {w.label}
              </button>
            ))}
          </div>
          {canSetTarget ? (
            <Button icon="sliders" onClick={() => setTargetOpen(true)}>
              יעד טיפול
            </Button>
          ) : null}
        </div>
      </div>

      {/* 1. headline numbers */}
      <div className="card stats">
        <Stat icon="list" color="#457AEE" label="קריאות פתוחות" value={data.totals.open} foot={`מתוך ${data.totals.total} בתחומים שלך`} onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat icon="inbox" color="#0EA5E9" label="ממתינות להחלטת מאשרים" value={awaitingApproval} foot="בשלבי האישור" onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat
          icon="alert"
          color="#E53F63"
          bad={data.totals.overdue > 0}
          label="חורגות מיעד"
          value={data.totals.overdue}
          foot={data.target ? `מעל ${fmtLongHours(data.target.target_hours)} מפתיחה` : 'לא הוגדר יעד'}
          onClick={() => router.push(`/requests?view=overdue${typesParam}`)}
        />
        <Stat icon="pulse" color="#F6AC2F" label="ללא התקדמות" value={data.totals.stale} foot="יותר משבוע באותו שלב" />
      </div>

      {/* 2. where the bookings are */}
      <section className="card mt">
        <div className="card-head">
          <h2>מצב הטיפול לפי שלב</h2>
          <span className="hint">לחיצה על שלב מציגה את הקריאות שבו</span>
          <span className="tools">
            <Button size="sm" variant="ghost" aria-expanded={full} onClick={() => setFull(!full)}>
              {full ? 'הסתרת הניתוח' : 'לניתוח המלא'}
            </Button>
          </span>
        </div>
        <Pipeline byStage={data.by_stage} analysis={info} onStage={goStage} />
        {worst ? (
          <div className="insight">
            <Icon name="alert" />
            <span>
              העומס הגבוה ביותר: <b>{STAGE_SHORT[worst.stage]}</b>. {worst.breached_open ?? 0} מתוך {worst.open_count} קריאות שממתינות שם עברו את יעד הטיפול.
            </span>
            <Button size="sm" onClick={() => goIds(worst.overdue_booking_ids.length ? worst.overdue_booking_ids : worst.open_booking_ids)}>
              הצגת הקריאות
            </Button>
          </div>
        ) : (
          <div className="insight calm">
            <Icon name="check" />
            <span>אין כרגע שלב שבו מצטברות קריאות חורגות.</span>
          </div>
        )}
      </section>

      <SmoothSize>{full ? <FullAnalysis data={data} ordered={ordered} pct={pct} goIds={goIds} /> : null}</SmoothSize>

      <div className="grid g-7-5 mt">
        {/* 3. oldest */}
        <section className="card">
          <div className="card-head">
            <h2>הקריאות הוותיקות בתחומים שלך</h2>
            <span className="hint">הוותיקות קודם</span>
          </div>
          {data.oldest.length ? (
            <div className="tickets">
              {data.oldest.map((row) => (
                <Ticket key={row.serial_number} booking={row} onAction={action.start} />
              ))}
            </div>
          ) : (
            <EmptyState title="אין קריאות פתוחות" />
          )}
        </section>

        {/* 4. needs attention */}
        <section className="card">
          <div className="card-head">
            <h2>דורש תשומת לב</h2>
          </div>
          {attention.length ? (
            <ul className="attn">
              {attention.map((row) => (
                <li key={row.title}>
                  <Link href={row.href}>
                    <i style={{ background: row.tone }} />
                    <span>
                      <b>
                        {row.count} {row.title}
                      </b>
                      <span className="small muted">{row.text}</span>
                    </span>
                    <Icon name="left" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="אין כרגע דבר שדורש טיפול" />
          )}
        </section>
      </div>

      <div className="grid g-7-5 mt">
        {/* 5. open bookings by domain and stage */}
        <section className="card">
          <div className="card-head">
            <h2>קריאות פתוחות לפי תחום</h2>
            <span className="hint">ולפי השלב שבו הן נמצאות</span>
          </div>
          <SmoothSize style={{ padding: '8px 0' }}>
            {overview.isPending ? (
              <Loading rows={4} />
            ) : domainRows.length === 0 ? (
              <EmptyState title="אין קריאות פתוחות" />
            ) : (
              domainRows.map((row) => (
                <div className="hbar" key={row.type}>
                  <span className="lab">
                    <DomainIcon bookingTypeId={row.type} />
                    {typeName(row.type)}
                  </span>
                  <span className="track" style={{ width: `${Math.max(8, (row.total / widest) * 100)}%` }}>
                    {STAGE_ORDER.filter((id) => row.stages[id]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        style={{ flex: row.stages[id], background: STAGE_COLOR[id] }}
                        title={`${STAGE_SHORT[id]}: ${row.stages[id]}`}
                        aria-label={`${typeName(row.type)} - ${STAGE_SHORT[id]}: ${row.stages[id]}`}
                        onClick={() => router.push(`/requests?view=open&types=${row.type}&stage=${id}`)}
                      />
                    ))}
                  </span>
                  <b className="num">{row.total}</b>
                </div>
              ))
            )}
          </SmoothSize>
          {usedStages.length ? (
            <div className="legend">
              {usedStages.map((id) => (
                <span key={id}>
                  <i style={{ background: STAGE_COLOR[id] }} />
                  {STAGE_SHORT[id]}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* 6. opened vs closed */}
        <section className="card">
          <div className="card-head">
            <h2>נפתחו מול נסגרו</h2>
            <span className="hint">{data.window_days} ימים אחרונים</span>
          </div>
          <div className="card-body">
            <p style={{ margin: '0 0 10px' }}>
              נפתחו <b>{opened}</b> ונסגרו <b>{closed}</b> קריאות.{' '}
              {opened === closed ? 'מספר הקריאות הפתוחות לא השתנה.' : `מספר הקריאות הפתוחות ${opened > closed ? 'גדל' : 'קטן'} ב-${Math.abs(opened - closed)}.`}
            </p>
            <TrendChart points={data.trend} />
          </div>
        </section>
      </div>

      {action.dialog}
      {targetOpen && single !== null ? <TargetDialog bookingTypeId={single} current={data.target} onClose={() => setTargetOpen(false)} /> : null}
    </>
  );
}

/** Handling times, outcomes and the per-stage bottleneck table; opened from "לניתוח המלא". */
function FullAnalysis({ data, ordered, pct, goIds }: { data: DashboardData; ordered: StageAnalysis[]; pct: (hours: number | null) => string; goIds: (ids: number[]) => unknown }) {
  return (
    <>
      <section className="card mt">
        <div className="card-head">
          <h2>זמני טיפול ותוצאות</h2>
          <span className="hint">{data.rates.closed} נסגרו בחלון</span>
        </div>
        <div className="card-body">
          <dl className="kv" style={{ marginBottom: 14 }}>
            <dt>חציון</dt>
            <dd>
              <b>{fmtLongHours(data.handling.median_hours)}</b>
            </dd>
            <dt>ממוצע</dt>
            <dd>{fmtLongHours(data.handling.avg_hours)}</dd>
            <dt>90% מהקריאות</dt>
            <dd>תוך {fmtLongHours(data.handling.p90_hours)}</dd>
            <dt>יעד התחום</dt>
            <dd>{data.target ? fmtLongHours(data.target.target_hours) : 'לא הוגדר'}</dd>
          </dl>
          {data.rates.closed ? (
            (
              [
                ['הסתיימו', data.rates.completed_pct, 'var(--ok)'],
                ['נדחו', data.rates.rejected_pct, 'var(--bad)'],
                ['בוטלו ע"י המבקש', data.rates.canceled_by_user_pct, 'var(--warn)'],
                ['בוטלו ע"י מאשר', data.rates.canceled_by_approver_pct, 'var(--hold)'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 48px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                <span>{label}</span>
                <span className="mbar" style={{ minWidth: 0 }}>
                  <span className="fill" style={{ width: `${value}%`, background: color } as CSSProperties} />
                </span>
                <b className="num">{value}%</b>
              </div>
            ))
          ) : (
            <div className="muted">אין קריאות שנסגרו בחלון</div>
          )}
        </div>
      </section>

      <section className="card mt">
        <div className="card-head">
          <h2>צווארי בקבוק: זמן בכל שלב</h2>
          <span className="hint">הפס מציג את החציון; &quot;חורגות&quot; = קריאות שממתינות בשלב ועברו את יעד הטיפול</span>
        </div>
        <div className="tbl-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>שלב</th>
                <th>סוג המתנה</th>
                <th className="num">ממתינות</th>
                <th className="num">חורגות</th>
                <th>חציון בשלב</th>
                <th className="num">חציון</th>
                <th className="num">90% עד</th>
                <th className="num">הוותיקה</th>
                <th className="num">חלק מהזמן</th>
                <th>מצב</th>
              </tr>
            </thead>
            <tbody>
              {ordered.length ? (
                ordered.map((stage) => (
                  <tr key={stage.stage} className={stage.open_count ? 'clk' : ''} onClick={() => stage.open_count && goIds(stage.open_booking_ids)}>
                    <td>
                      <b>{STAGE_SHORT[stage.stage]}</b>
                    </td>
                    <td className="small muted">{WAIT_LABEL[stage.wait_kind] ?? ''}</td>
                    <td className="num">
                      <b>{stage.open_count}</b>
                    </td>
                    <td className="num">{stage.breached_open ? <b style={{ color: 'var(--bad)' }}>{stage.breached_open}</b> : (stage.breached_open ?? '—')}</td>
                    <td>
                      <div className="mbar">
                        <span className="fill" style={{ width: pct(stage.median_hours) }} />
                      </div>
                    </td>
                    <td className="num">{fmtHours(stage.median_hours)}</td>
                    <td className="num">{fmtHours(stage.p90_hours)}</td>
                    <td className="num">{fmtHours(stage.oldest_open_hours)}</td>
                    <td className="num">{stage.share_of_lead_time == null ? '—' : `${Math.round(stage.share_of_lead_time * 100)}%`}</td>
                    <td>
                      <Chip tone={SEVERITY[stage.severity].tone}>{SEVERITY[stage.severity].label}</Chip>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10}>
                    <EmptyState title="אין נתונים בחלון" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-foot">{data.definitions}</div>
      </section>

      <BottlenecksPanel types={data.booking_type_ids} days={data.window_days} />
    </>
  );
}

function Stat({ icon, color, label, value, foot, bad, onClick }: { icon: string; color: string; label: string; value: number | string; foot: string; bad?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="si">
        <Icon name={icon} />
      </span>
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      <span className="f">{foot}</span>
    </>
  );
  const style = { '--sc': color } as CSSProperties;
  return onClick ? (
    <button type="button" className={`stat${bad ? ' bad' : ''}`} style={style} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="stat static" style={style}>
      {body}
    </div>
  );
}
