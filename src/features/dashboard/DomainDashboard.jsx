'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Seg } from '@/components/ui/Controls';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { Stat } from '@/components/ui/Stat';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { TargetDialog } from '@/features/targets/TargetDialog';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { fmtLongHours } from '@/lib/format';
import { DEFAULT_TARGET_HOURS } from '@/lib/targets';
import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { homeKind } from '@/lib/nav';
import { useArrivals } from '@/lib/useArrivals';
import { useHeldHeight } from '@/lib/useHeldHeight';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';import { indexStages, Pipeline, TrendChart, worstStage } from './charts';
import { ALL_WINDOW_DAYS, APPROVAL_STAGES, DEFAULT_WINDOW_DAYS, pipelineStagesFor, STAT_COLOR, WINDOWS } from './constants';
import { BarberStatusSummary } from './BarberStatusSummary';
import { StageBars } from './StageBars';
import { FullAnalysis } from './FullAnalysis';
import { StatusBars } from './StatusBars';

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
  const { me, typeName, catalog } = useSession();
  const action = useStatusAction({ animateOut: true });
  const [targetOpen, setTargetOpen] = useState(false);
  const [full, setFull] = useState(false);

  const types = useMemo(() => parseTypes(search.get('types')), [search]);
  const days = WINDOWS.some((w) => w.value === search.get('days')) ? Number(search.get('days')) : DEFAULT_WINDOW_DAYS;

  const params = { types, days };
  const query = useQuery({ queryKey: keys.domainDashboard(params), queryFn: ({ signal }) => insightsApi.domainDashboard(params, signal), placeholderData: (previous) => previous });
  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), staleTime: 60_000 });
  // a booking that moves up into "the oldest" after a decision opens its room and fades in
  const arrivals = useArrivals((query.data?.oldest ?? []).map((row) => row.serial_number));
  // the card keeps its size: when a row leaves, the ones below move up and the next fills the bottom
  const holdOldest = useHeldHeight();

  if (query.isPending) return <Loading rows={10} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;
  const single = data.booking_type_ids.length === 1 ? data.booking_type_ids[0] : null;
  const typesParam = single ? `&types=${data.booking_type_ids.join(',')}` : '';
  const info = indexStages(data.stages);
  const ordered = STAGE_ORDER.map((id) => info[id]).filter((s) => Boolean(s));
  const worst = worstStage(data.stages);  const scale = Math.max(1, ...ordered.map((s) => s.p90_hours ?? 0)) * 1.15;
  const pct = (hours) => `${Math.min(100, ((hours ?? 0) / scale) * 100)}%`;
  const awaitingApproval = APPROVAL_STAGES.reduce((sum, id) => sum + (data.by_stage[id] ?? 0), 0);

  const canGoBack = homeKind(me) === 'tiles';
  const canSetTarget = single !== null && me.capabilities['targets.manage'] && (me.is_super_admin || me.permissions.includes(`admin_${single}`));
  const targetText = data.target ? `יעד טיפול: ${fmtLongHours(data.target.target_hours)} מפתיחה ועד סגירה` : `יעד טיפול: ${fmtLongHours(DEFAULT_TARGET_HOURS)} מפתיחה ועד סגירה (ברירת מחדל)`;

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
            <Link href="/overview" className="btn sm ghost back">
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

      {single === 5 ? <BarberStatusSummary /> : null}

      {/* 1. headline numbers */}
      <div className="card stats stagger">
        <Stat index={0} icon="list" color={STAT_COLOR.open} label="קריאות פתוחות" value={data.totals.open} foot={`מתוך ${data.totals.total} בתחומים שלך`} onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat index={1} icon="inbox" color={STAT_COLOR.awaiting} label="ממתינות להחלטת מאשרים" value={awaitingApproval} foot="בשלבי האישור" onClick={() => router.push(`/requests?view=open${typesParam}`)} />
        <Stat
          index={2}
          icon="alert"
          color={STAT_COLOR.overdue}
          bad={data.totals.overdue > 0}
          label="חורגות מיעד"
          value={data.totals.overdue}
          foot={data.target ? `מעל ${fmtLongHours(data.target.target_hours)} מפתיחה` : 'נספרות רק לפי יעד שהוגדר'}
          onClick={() => router.push(`/requests?view=overdue${typesParam}`)}
        />
        <Stat index={3} icon="pulse" color={STAT_COLOR.stale} label="ללא התקדמות" value={data.totals.stale} foot="יותר משבוע באותו שלב" />
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
        <Pipeline byStage={data.by_stage} analysis={info} onStage={goStage} stages={pipelineStagesFor(data.booking_type_ids, catalog)} />
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

      {/* open bookings by status: only when the API sends `open_by_status` (not on dev-nati yet) */}
      {data.open_by_status ? (
        <Card spaced title="קריאות פתוחות לפי סטטוס" hint="לחיצה על סטטוס מציגה את הקריאות בו">
          <StatusBars counts={data.open_by_status} onStatus={(id) => router.push(`/requests?view=open&statuses=${id}${typesParam}`)} />
        </Card>
      ) : null}

      <SmoothSize>{full ? <FullAnalysis data={data} ordered={ordered} pct={pct} goIds={goIds} /> : null}</SmoothSize>

      <div className="grid g-7-5 mt">
        {/* 3. oldest */}
        <Card title="הקריאות הוותיקות בתחומים שלך" hint="הוותיקות קודם">
          {data.oldest.length ? (
            <div className="tickets" ref={holdOldest}>
              {data.oldest.map((row) => (
                <Ticket key={row.serial_number} booking={row} onAction={action.start} outcome={action.outcomes[row.serial_number]} entering={arrivals.has(row.serial_number)} />
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

      {/* one domain: the stage cards above already give its count per stage, so the by-domain bars would repeat them with
          a single bar - the chart takes the whole row instead; several domains: the bars compare them, beside the chart */}
      <div className={single ? 'mt' : 'grid g-7-5 mt'}>
        {/* 5. open bookings by domain and stage (several domains only) */}
        {single ? null : (
        <Card title="קריאות פתוחות לפי תחום" hint="ולפי השלב שבו הן נמצאות">
          <SmoothSize>{overview.isPending ? <CardBody><Loading rows={4} /></CardBody> : <StageBars byTypeStage={overview.data?.by_type_stage ?? {}} onlyTypes={data.booking_type_ids} />}</SmoothSize>
        </Card>
        )}

        {/* 6. opened vs closed */}
        <Card title="נפתחו מול נסגרו" hint={data.window_days >= ALL_WINDOW_DAYS ? 'כל התקופה' : `${data.window_days} ימים אחרונים`}>
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

