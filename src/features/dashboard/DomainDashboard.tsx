'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { TargetDialog } from '@/features/targets/TargetDialog';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { Severity, StageAnalysis, StageId } from '@/lib/api/types';
import { fmtHours, fmtLongHours } from '@/lib/format';
import { STAGE_ORDER, STAGE_SHORT, WAIT_LABEL } from '@/lib/labels';
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

function parseTypes(raw: string | null): number[] {
  return (raw ?? '')
    .split(',')
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** Dashboard of one service domain (or all of a commander's domains): targets, waiting, stage times, flow. */
export function DomainDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const { me, typeName } = useSession();
  const action = useStatusAction();
  const [targetOpen, setTargetOpen] = useState(false);

  const types = useMemo(() => parseTypes(search.get('types')), [search]);
  const days = ['7', '30', '90'].includes(search.get('days') ?? '') ? Number(search.get('days')) : 30;

  const params = { types, days };
  const query = useQuery({ queryKey: keys.domainDashboard(params), queryFn: ({ signal }) => insightsApi.domainDashboard(params, signal), placeholderData: (previous) => previous });

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

      <div className="card stats">
        <Stat icon="list" color="#457AEE" label="קריאות פתוחות" value={data.totals.open} foot="כרגע בטיפול" onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat icon="check" color="#15803D" label="נסגרו" value={data.totals.closed_in_window} foot={`ב-${data.window_days} הימים האחרונים`} onClick={() => router.push(`/requests?view=all&stage=closed${typesParam}`)} />
        <Stat icon="layers" color="#1E40AF" label='סה"כ קריאות' value={data.totals.total} foot={`${data.totals.closed} נסגרו מאז ומעולם`} onClick={() => router.push(`/requests?view=all${typesParam}`)} />
        <Stat
          icon="alert"
          color="#E53F63"
          bad={data.totals.overdue > 0}
          label="חורגות מיעד"
          value={data.totals.overdue}
          foot={data.target ? `מעל ${fmtLongHours(data.target.target_hours)} מפתיחה` : 'לא הוגדר יעד'}
          onClick={() => router.push(`/requests?view=overdue${typesParam}`)}
        />
        <Stat
          icon="pulse"
          color="#F6AC2F"
          label="זמן טיפול חציוני"
          value={fmtLongHours(data.handling.median_hours)}
          foot={data.handling.sample ? `90% נסגרות תוך ${fmtLongHours(data.handling.p90_hours)}` : 'אין קריאות סגורות בחלון'}
        />
      </div>

      <section className="card mt">
        <div className="card-head">
          <h2>איפה הקריאות נמצאות</h2>
          <span className="hint">לחיצה על שלב מציגה את הקריאות שבו</span>
        </div>
        <Pipeline byStage={data.by_stage} analysis={info} onStage={goStage} />
        {worst ? (
          <div className="insight">
            <Icon name="alert" />
            <span>
              הקריאות החורגות מצטברות ב<b>{STAGE_SHORT[worst.stage]}</b>: {worst.breached_open ?? 0} מתוך {worst.open_count} קריאות שממתינות שם עברו את יעד הטיפול.
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

      <div className="grid g-7-5 mt">
        <section className="card">
          <div className="card-head">
            <h2>הקריאות הוותיקות</h2>
            <span className="hint">לפי הזמן מפתיחה</span>
            <span className="tools">
              <Button size="sm" variant="ghost" onClick={() => router.push(`/requests?view=open${typesParam}`)}>
                לכל הקריאות הפתוחות
              </Button>
            </span>
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

        <section className="card">
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
      </div>

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
                  <tr
                    key={stage.stage}
                    className={stage.open_count ? 'clk' : ''}
                    onClick={() => stage.open_count && goIds(stage.open_booking_ids)}
                  >
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

      <section className="card mt">
        <div className="card-head">
          <h2>נפתחו מול נסגרו</h2>
          <span className="hint">{data.window_days} ימים</span>
        </div>
        <div className="card-body">
          <TrendChart points={data.trend} />
        </div>
      </section>

      {action.dialog}
      {targetOpen && single !== null ? <TargetDialog bookingTypeId={single} current={data.target} onClose={() => setTargetOpen(false)} /> : null}
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
