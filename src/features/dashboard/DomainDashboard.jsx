'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chips';
import { Seg } from '@/components/ui/Controls';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { Stat } from '@/components/ui/Stat';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { TargetDialog } from '@/features/targets/TargetDialog';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { fmtHours, fmtLongHours } from '@/lib/format';
import { STAGE_ORDER, STAGE_SHORT, statusTone, WAIT_LABEL } from '@/lib/labels';
import { homeKind } from '@/lib/nav';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';
import { BottlenecksPanel } from './BottlenecksPanel';
import { indexStages, Pipeline, TrendChart, worstStage } from './charts';
import { APPROVAL_STAGES, DEFAULT_WINDOW_DAYS, SEVERITY, STAT_COLOR, WINDOWS } from './constants';
import { StageBars } from './StageBars';

function parseTypes(raw) {
  return (raw ?? '')
    .split(',')
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** Dashboard of one service domain (or all of a commander's domains), in six blocks; the detailed analysis opens on demand. */
export function DomainDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const { me, typeName } = useSession();
  const action = useStatusAction();
  const [targetOpen, setTargetOpen] = useState(false);
  const [full, setFull] = useState(false);

  const types = useMemo(() => parseTypes(search.get('types')), [search]);
  const days = WINDOWS.some((w) => w.value === search.get('days')) ? Number(search.get('days')) : DEFAULT_WINDOW_DAYS;

  const params = { types, days };
  const query = useQuery({ queryKey: keys.domainDashboard(params), queryFn: ({ signal }) => insightsApi.domainDashboard(params, signal), placeholderData: (previous) => previous });
  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), staleTime: 60_000 });

  if (query.isPending) return <Loading rows={10} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;
  const single = data.booking_type_ids.length === 1 ? data.booking_type_ids[0] : null;
  const typesParam = single ? `&types=${data.booking_type_ids.join(',')}` : '';
  const info = indexStages(data.stages);
  const ordered = STAGE_ORDER.map((id) => info[id]).filter((s) => Boolean(s));
  const worst = worstStage(data.stages);
  const scale = Math.max(1, ...ordered.map((s) => s.p90_hours ?? 0)) * 1.15;
  const pct = (hours) => `${Math.min(100, ((hours ?? 0) / scale) * 100)}%`;
  const awaitingApproval = APPROVAL_STAGES.reduce((sum, id) => sum + (data.by_stage[id] ?? 0), 0);

  const canGoBack = homeKind(me) === 'tiles';
  const canSetTarget = single !== null && me.capabilities['targets.manage'] && (me.is_super_admin || me.permissions.includes(`admin_${single}`));
  const targetText = data.target ? `יעד טיפול: ${fmtLongHours(data.target.target_hours)} מפתיחה ועד סגירה` : 'לא הוגדר יעד טיפול לתחום';

  const goStage = (stage) => router.push(`/requests?view=open&stage=${stage}${typesParam}`);
  const goIds = (ids) => ids.length && router.push(`/requests?view=all&ids=${ids.join(',')}`);

  const opened = data.trend.reduce((sum, point) => sum + point.opened, 0);
  const closed = data.trend.reduce((sum, point) => sum + point.closed, 0);

  const attention = [
    { count: data.totals.needs_decision, title: 'קריאות דורשות הכרעה', text: 'הקריאה שונתה במקביל במערכת החיצונית.', tone: 'var(--bad)', href: `/requests?view=decide${typesParam}` },
    { count: data.totals.overdue, title: 'קריאות חורגות מיעד הטיפול', text: 'הזמן מפתיחה ארוך מהיעד שהוגדר לתחום.', tone: 'var(--bad)', href: `/requests?view=overdue${typesParam}` },
    { count: data.totals.stale, title: 'קריאות לא התקדמו מעל שבוע', text: 'לא נרשם בהן שינוי סטטוס 7 ימים ומעלה.', tone: 'var(--warn)', href: `/requests?view=open${typesParam}` },
  ].filter((row) => row.count > 0);

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
          <Seg label="חלון זמן" options={WINDOWS} value={String(data.window_days)} onChange={(value) => setParams({ days: value })} />
          {canSetTarget ? (
            <Button icon="sliders" onClick={() => setTargetOpen(true)}>
              יעד טיפול
            </Button>
          ) : null}
        </div>
      </div>

      {/* 1. headline numbers */}
      <div className="card stats">
        <Stat icon="list" color={STAT_COLOR.open} label="קריאות פתוחות" value={data.totals.open} foot={`מתוך ${data.totals.total} בתחומים שלך`} onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat icon="inbox" color={STAT_COLOR.awaiting} label="ממתינות להחלטת מאשרים" value={awaitingApproval} foot="בשלבי האישור" onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat
          icon="alert"
          color={STAT_COLOR.overdue}
          bad={data.totals.overdue > 0}
          label="חורגות מיעד"
          value={data.totals.overdue}
          foot={data.target ? `מעל ${fmtLongHours(data.target.target_hours)} מפתיחה` : 'לא הוגדר יעד'}
          onClick={() => router.push(`/requests?view=overdue${typesParam}`)}
        />
        <Stat icon="pulse" color={STAT_COLOR.stale} label="ללא התקדמות" value={data.totals.stale} foot="יותר משבוע באותו שלב" />
      </div>

      {/* 2. where the bookings are */}
      <Card
        spaced
        title="מצב הטיפול לפי שלב"
        hint="לחיצה על שלב מציגה את הקריאות שבו"
        tools={
          <Button size="sm" variant="ghost" aria-expanded={full} onClick={() => setFull(!full)}>
            {full ? 'הסתרת הניתוח' : 'לניתוח המלא'}
          </Button>
        }
      >
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
      </Card>

      {/* open bookings by status */}
      <Card spaced title="קריאות פתוחות לפי סטטוס" hint="לחיצה על סטטוס מציגה את הקריאות בו">
        <StatusBars counts={data.open_by_status ?? {}} onStatus={(id) => router.push(`/requests?view=open&statuses=${id}${typesParam}`)} />
      </Card>

      <SmoothSize>{full ? <FullAnalysis data={data} ordered={ordered} pct={pct} goIds={goIds} /> : null}</SmoothSize>

      <div className="grid g-7-5 mt">
        {/* 3. oldest */}
        <Card title="הקריאות הוותיקות בתחומים שלך" hint="הוותיקות קודם">
          {data.oldest.length ? (
            <div className="tickets">
              {data.oldest.map((row) => (
                <Ticket key={row.serial_number} booking={row} onAction={action.start} />
              ))}
            </div>
          ) : (
            <EmptyState title="אין קריאות פתוחות" />
          )}
        </Card>

        {/* 4. needs attention */}
        <Card title="דורש תשומת לב">
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
        </Card>
      </div>

      <div className="grid g-7-5 mt">
        {/* 5. open bookings by domain and stage */}
        <Card title="קריאות פתוחות לפי תחום" hint="ולפי השלב שבו הן נמצאות">
          <SmoothSize>{overview.isPending ? <CardBody><Loading rows={4} /></CardBody> : <StageBars byTypeStage={overview.data?.by_type_stage ?? {}} onlyTypes={data.booking_type_ids} />}</SmoothSize>
        </Card>

        {/* 6. opened vs closed */}
        <Card title="נפתחו מול נסגרו" hint={`${data.window_days} ימים אחרונים`}>
          <CardBody>
            <p style={{ margin: '0 0 10px' }}>
              נפתחו <b>{opened}</b> ונסגרו <b>{closed}</b> קריאות.{' '}
              {opened === closed ? 'מספר הקריאות הפתוחות לא השתנה.' : `מספר הקריאות הפתוחות ${opened > closed ? 'גדל' : 'קטן'} ב-${Math.abs(opened - closed)}.`}
            </p>
            <TrendChart points={data.trend} />
          </CardBody>
        </Card>
      </div>

      {action.dialog}
      {targetOpen && single !== null ? <TargetDialog bookingTypeId={single} current={data.target} onClose={() => setTargetOpen(false)} /> : null}
    </>
  );
}

const TONE_COLOR = { ok: 'var(--ok)', bad: 'var(--bad)', hold: 'var(--hold)', acc: 'var(--accent)', warn: 'var(--warn)', info: 'var(--info)', '': 'var(--mute)' };

/** A bar per status with open bookings, most first, coloured like the status chip; a bar opens those bookings. */
function StatusBars({ counts, onStatus }) {
  const { catalog } = useSession();
  const rows = Object.entries(counts)
    .map(([id, count]) => ({ id: Number(id), count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const widest = Math.max(1, ...rows.map((row) => row.count));

  if (rows.length === 0) return <EmptyState title="אין קריאות פתוחות" />;

  return (
    <div style={{ padding: '8px 0' }}>
      {rows.map((row) => {
        const name = catalog.statuses.find((status) => status.id === row.id)?.display_name ?? `סטטוס ${row.id}`;
        return (
          <div className="hbar" key={row.id}>
            <button type="button" className="lab" onClick={() => onStatus(row.id)}>
              {name}
            </button>
            <span className="track" style={{ width: `${Math.max(4, (row.count / widest) * 100)}%` }}>
              <button type="button" style={{ flex: 1, background: TONE_COLOR[statusTone(row.id)] }} aria-label={`${name}: ${row.count}`} onClick={() => onStatus(row.id)} />
            </span>
            <b className="num">{row.count}</b>
          </div>
        );
      })}
    </div>
  );
}

/** Handling times, outcomes and the per-stage bottleneck table; opened from "לניתוח המלא". */
function FullAnalysis({ data, ordered, pct, goIds }) {
  return (
    <>
      <Card spaced title="זמני טיפול ותוצאות" hint={`${data.rates.closed} נסגרו בחלון`}>
        <CardBody>
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
              ]
            ).map(([label, value, color]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 48px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                <span>{label}</span>
                <span className="mbar" style={{ minWidth: 0 }}>
                  <span className="fill" style={{ width: `${value}%`, background: color }} />
                </span>
                <b className="num">{value}%</b>
              </div>
            ))
          ) : (
            <div className="muted">אין קריאות שנסגרו בחלון</div>
          )}
        </CardBody>
      </Card>

      <Card spaced title="צווארי בקבוק: זמן בכל שלב" hint={'הפס מציג את החציון; "חורגות" = קריאות שממתינות בשלב ועברו את יעד הטיפול'}>
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
      </Card>

      <BottlenecksPanel types={data.booking_type_ids} days={data.window_days} />
    </>
  );
}
