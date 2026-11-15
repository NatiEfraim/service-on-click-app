'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { ApprovalTrack } from '@/components/booking/RouteViz';
import { Button } from '@/components/ui/Button';
import { Chip, StatusChip } from '@/components/ui/Chips';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { usePresence } from '@/components/ui/usePresence';
import { holdDescription, isHoldStatus } from '@/lib/booking-workflow';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { daysSince, fetchRequestDetails, isRejectedRequest, parseDay, requestRoute, waitedLabel } from './requesterData';
import { Celebration } from './Celebration';
import { REQUESTER_KEY, useCatalog } from './useRequester';

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

/** Typing in a field, or a dialog open above the drawer: the arrow keys are not ours (as in the management drawer). */
function keysBelongElsewhere(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return true;
  if (event.target?.closest?.('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="combobox"]')) return true;
  return Boolean(document.querySelector('.modal'));
}

/** "‹ 3 מתוך 47 ›" in the drawer's head, as in the management drawer: the previous / next request of the list it was opened from (↑ / ↓ too). */
function RequestStepper({ row, rows, onGo }) {
  const index = rows.findIndex((candidate) => candidate.id === row.id);
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : null;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (keysBelongElsewhere(event)) return;
      event.preventDefault();
      const target = event.key === 'ArrowUp' ? previous : next;
      if (target) onGo(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next, onGo]);

  if (index < 0 || rows.length < 2) return null;

  return (
    <nav className="drawer-stepper" aria-label="מעבר בין קריאות">
      <Button size="sm" variant="ghost" icon="right" aria-label="הקריאה הקודמת (חץ למעלה)" data-tip="הקריאה הקודמת (↑)" disabled={!previous} onClick={() => onGo(previous)} />
      <span className="pos" aria-live="polite">
        {index + 1} מתוך {rows.length}
      </span>
      <Button size="sm" variant="ghost" icon="left" aria-label="הקריאה הבאה (חץ למטה)" data-tip="הקריאה הבאה (↓)" disabled={!next} onClick={() => onGo(next)} />
    </nav>
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
          קריאה <span className="ltr" style={{ fontSize: 16, fontWeight: 400 }}>{row.serial}</span>
        </>
      }
    >
      {query.isError ? (
        <ErrorNotice error={query.error} title="לא ניתן להציג את הקריאה." onRetry={() => void query.refetch()} />
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
                  {details.requester ? (
                    <>
                      <dt>מבקש</dt>
                      <dd>
                        {details.requester.name}{' '}
                        <span className="ltr">{details.requester.personalId}</span>
                      </dd>
                      {details.requester.phone ? (
                        <>
                          <dt>טלפון</dt>
                          <dd className="ltr">{details.requester.phone}</dd>
                        </>
                      ) : null}
                    </>
                  ) : null}
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

            <section className="panel">
              <header>
                <h2>הערות</h2>
                <span className="small muted">{details.comments.length}</span>
              </header>
              <div className="body">
                {details.comments.length ? (
                  <ul className="rq-comments">
                    {details.comments.map((comment) => (
                      <li key={comment.id}>
                        <div className="small muted">
                          <b className="rq-comment-by">{comment.author || 'מערכת'}</b> {when(comment.createdAt)}
                        </div>
                        <div>{comment.text}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted">אין הערות.</span>
                )}
              </div>
            </section>
          </div>

          {details.files.length ? (
            <section className="panel">
              <header><h2>קבצים מצורפים</h2></header>
              <div className="body">
                <ul className="rq-files">
                  {details.files.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <Icon name="clip" />
                      {file.url ? (
                        <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                      ) : (
                        <span>{file.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
