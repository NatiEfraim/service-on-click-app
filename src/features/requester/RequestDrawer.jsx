'use client';

import { useQuery } from '@tanstack/react-query';
import { RequesterRows } from '@/components/booking/RequesterRows';
import { SerialTitle } from '@/components/booking/SerialTitle';
import { Fragment, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { ApprovalTrack } from '@/components/booking/RouteViz';
import { Chip, StatusChip } from '@/components/ui/Chips';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { AttachmentsPanel } from '@/features/bookings/Attachments';
import { usePresence } from '@/components/ui/usePresence';
import { holdDescription, isHoldStatus } from '@/lib/booking-workflow';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { daysSince, fetchRequestDetails, isRejectedRequest, parseDay, requestRoute, waitedLabel } from './requesterData';
import { Celebration } from './Celebration';
import { REQUESTER_KEY, useCatalog } from './useRequester';
import { CommentsPanel } from '@/components/booking/CommentsPanel';
import { StepperNav, useStepKeys } from '@/components/booking/StepperNav';

/** A form value as text: plain values as they are, a list joined, an object by its name. */
function valueText(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) return value.map(valueText).filter((text) => text !== '—').join(', ') || '—';
  if (typeof value === 'object') return valueText(value.display_name ?? value.name ?? value.value ?? null);
  return String(value);
}

/** A date from the server as the rest of the app shows it; a value it cannot read stays as it came. */
/**
 * A date from the server as the rest of the app shows it. The requester endpoints send a day as "d/m/Y" (day first),
 * which the shared parser would read month first (04/11 as April 11): those are read here; anything else (a comment's
 * full timestamp) goes through fmtDateTime; a value neither can read stays as it came.
 */
const when = (value) => {
  if (!value) return '—';
  if (/^d{1,2}[/.]d{1,2}[/.]d{2,4}$/.test(String(value).trim())) {
    const day = parseDay(value);
    return day ? fmtDate(day) : String(value);
  }
  const text = fmtDateTime(value);
  return text === '—' ? String(value) : text;
};

/** "‹ 3 מתוך 47 ›" in the drawer's head, as in the management drawer: the previous / next request of the list it was opened from (↑ / ↓ too). */
function RequestStepper({ row, rows, onGo }) {
  const index = rows.findIndex((candidate) => candidate.id === row.id);
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : null;

  useStepKeys(true, () => previous && onGo(previous), () => next && onGo(next));

  if (index < 0 || rows.length < 2) return null;

  return (
    <StepperNav
      index={index}
      count={rows.length}
      onPrevious={() => onGo(previous)}
      onNext={() => onGo(next)}
      canPrevious={Boolean(previous)}
      canNext={Boolean(next)}
    />
  );
}

/**
 * The request's route, the same stations the management screens show for its domain (requestRoute): passed ones filled,
 * the current one marked (on hold, stopped or finished in its colour), with the status and how long it has been there.
 */
/** How long the station's celebration takes to fade out once it ends (requester.css: .rq-celebrate.leaving). */
const CELEBRATION_EXIT_MS = 450;

function ProgressRail({ statusId, bookingTypeId, label, since, celebrate = false, onCelebrated }) {
  const { stations, here, mode } = requestRoute(statusId, bookingTypeId);
  // how long it has been at this step (from its last update), while it is still moving: not once completed or stopped
  const waited = mode === 'here' || mode === 'hold' ? waitedLabel(daysSince(since)) : '';
  // the celebration fades out however it ends (its own timer, or the same request's celebration in the list finishing
  // first): it stays mounted for its exit instead of vanishing
  const presence = usePresence(Boolean(celebrate), CELEBRATION_EXIT_MS);
  const [lastCelebration, setLastCelebration] = useState(celebrate);
  if (celebrate && celebrate !== lastCelebration) setLastCelebration(celebrate);
  return (
    <ApprovalTrack stations={stations} here={here} mode={mode} label={`${stations[here]?.label ?? ''}, ${label}`}>
      <span className="sub">{mode === 'finished' ? 'הושלמה' : label}</span>
      {waited ? <span className="rq-waited">{waited}</span> : null}
      {presence.mounted && lastCelebration ? <Celebration key={lastCelebration} className={`on-station${presence.closing ? ' leaving' : ''}`} rejected={isRejectedRequest(statusId)} onDone={() => onCelebrated?.()} /> : null}
    </ApprovalTrack>
  );
}

/**
 * One of the user's requests in full, sliding in from the side, laid out like the management view of a request:
 * domain and status on top, the status message, the details (requester, dates, every value filled in), comments and
 * attachments. View only. The approval route and status history are not shown: the requester endpoint does not send them.
 */
export function RequestDrawer({ row, rows = [], onGo, onClose, celebrate = false, onCelebrated }) {
  const query = useQuery({
    queryKey: [...REQUESTER_KEY, 'request', row.id],
    queryFn: ({ signal }) => fetchRequestDetails(row, signal),
    // Discard signed URLs when the drawer closes and request fresh URLs on mount.
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
  const details = query.data;
  const catalog = useCatalog();
  const typeImg = (catalog.data?.topics ?? []).flatMap((topic) => topic.groups.flatMap((group) => group.types)).find((type) => type.id === row.bookingTypeId)?.img ?? null;

  return (
    <Drawer
      label={`קריאה ${row.serial}`}
      onClose={onClose}
      scrollKey={row.id}
      tools={onGo ? <RequestStepper row={row} rows={rows} onGo={onGo} /> : undefined}
      title={
        <>
          <SerialTitle serial={row.serial} />
        </>
      }
    >
      {query.isError ? (
        query.error?.status === 404 || query.error?.status === 403 ? (
          <EmptyState title="הקריאה לא נמצאה">ייתכן שהיא נמחקה או שאינה שייכת לך.</EmptyState>
        ) : (
          <ErrorNotice error={query.error} title="לא ניתן להציג את הקריאה." onRetry={() => void query.refetch()} />
        )
      ) : query.isPending ? (
        <Loading rows={10} />
      ) : (
        <div className="rq-drawer">
          <div className="rq-drawer-top">
            {/* a ביטחון מידע / תקשוב type has its own picture (catalog); every other domain its domain badge */}
            {typeImg ? <span className="rq-drawer-pic"><img src={typeImg} alt="" /></span> : <DomainBadge bookingTypeId={row.bookingTypeId} />}
            <StatusChip statusId={details.statusId} label={details.statusName} />
            <Chip>{row.typeName}</Chip>
          </div>

          <section className="panel">
            <header>
              <h2>איפה הקריאה עומדת</h2>
              <span className="hint">{details.statusName}</span>
            </header>
            <div className="body">
              <ProgressRail statusId={details.statusId} bookingTypeId={row.bookingTypeId} label={details.statusName} since={details.updatedAt || details.createdAt} celebrate={celebrate} onCelebrated={onCelebrated} />
            </div>
          </section>

          {details.statusMessage || isHoldStatus(details.statusId) ? (
            <Notice tone={isHoldStatus(details.statusId) ? 'warn' : ''}>
              {details.statusMessage || holdDescription(details.statusId)}
            </Notice>
          ) : null}

          <div className="cols2">
            <section className="panel">
              <header><h2>פרטי הקריאה</h2></header>
              <div className="body">
                <dl className="kv">
                  {details.requester ? <RequesterRows name={details.requester.name} personalId={details.requester.personalId} phone={details.requester.phone} /> : null}
                  <dt>נפתחה</dt>
                  <dd>{when(details.createdAt)}</dd>
                  {details.updatedAt && details.updatedAt !== details.createdAt ? (
                    <>
                      <dt>עדכון אחרון</dt>
                      <dd>{when(details.updatedAt)}</dd>
                    </>
                  ) : null}
                  {details.viceApprover ? (
                    <>
                      <dt>ממלא מקום מאשר</dt>
                      <dd>{details.viceApprover}</dd>
                    </>
                  ) : null}
                  {details.values.map((item, index) => (
                    <Fragment key={`${item.label}-${index}`}>
                      <dt className={item.depth ? 'sub' : undefined} style={item.depth > 1 ? { paddingInlineStart: item.depth * 14 } : undefined}>
                        {item.label}
                      </dt>
                      <dd className={item.depth ? 'sub' : undefined}>{item.group ? '' : valueText(item.value)}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            </section>

            <CommentsPanel comments={details.comments.map((comment) => ({ id: comment.id, author: comment.author || 'מערכת', when: when(comment.createdAt), text: comment.text }))} />
          </div>

          {/* the same panel as the management side: pictures shown, images and PDFs open in the viewer (Attachments) */}
          {details.files.length ? <AttachmentsPanel attachments={details.files} /> : null}
        </div>
      )}
    </Drawer>
  );
}
