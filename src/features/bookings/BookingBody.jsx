'use client';

import { Fragment, useState } from 'react';
import { RequesterRows } from '@/components/booking/RequesterRows';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Rail } from '@/components/booking/RouteViz';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, SourceTag, StatusChip } from '@/components/ui/Chips';
import { Notice } from '@/components/ui/Feedback';
import { auditSentence } from '@/lib/audit-sentence';
import { describeValues, uploadAttachments } from '@/lib/booking-values';
import { fmtDateTime, fmtHours } from '@/lib/format';
import { targetHoursOr } from '@/lib/targets';
import { actionTone, actionVariant, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { orderedActions } from '@/lib/booking-actions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { hasOwnRoute, sectionLabel } from '@/lib/routeTypes';
import { isTopicType, topicHandlerName } from '@/lib/topicTypes';
import { AttachmentsPanel } from './Attachments';
import { HandlerBlock } from './HandlerBlock';
import { HandlerFieldsPanel } from './HandlerFieldsPanel';
import { ResolveConflictDialog } from './ResolveConflictDialog';
import { useStatusAction } from './useStatusAction';
import { CommentsPanel } from '@/components/booking/CommentsPanel';

function FadingTag({ value, children }) {
  const [current, setCurrent] = useState({ value, children });
  const [previous, setPrevious] = useState(null);

  if (current.value !== value) {
    setPrevious(current.value == null ? null : current);
    setCurrent({ value, children });
  }

  if (value == null && !previous) return null;

  return (
    <span className="booking-tag" data-replacing={Boolean(previous && value != null) || undefined}>
      {previous && (
        <span key={`out-${previous.value}`} className="booking-tag-out" aria-hidden="true"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setPrevious(null);
          }}>
          {previous.children}
        </span>
      )}
      {value != null && <span key={value} className="booking-tag-in">{children}</span>}
    </span>
  );
}

/** The person (or process) behind a timeline row: the scheduler's rows carry no actor. */
function actorOf(entry) {
  return entry.actor_name || entry.actor_id || (entry.source === 'system' ? 'המערכת' : '');
}

export function Body({ booking }) {
  const session = useSession();
  const { catalog, can, canAct, unitName, typeName, departmentName } = session;
  const status = useStatusAction();
  const [resolving, setResolving] = useState(null);

  // a type with a route of its own (lib/routeTypes): a progress bar, a handler, a section the handlers fill
  const routeType = hasOwnRoute(booking.booking_type_id) || (Array.isArray(booking.progress) && booking.progress.length > 0);
  const handlerFields = Array.isArray(booking.handler_fields) ? booking.handler_fields : [];
  // the handler section is drawn on its own (HandlerFieldsPanel): the details keep the requester's values
  const requesterValues = handlerFields.length ? (booking.booking_values ?? []).filter((node) => node.section !== 'handler') : booking.booking_values;
  const lines = describeValues(requesterValues);
  const valueAttachments = uploadAttachments(booking.booking_values);
  const attachments = valueAttachments.length ? valueAttachments : booking.attachments;
  const conflict = booking.sync.open_conflict;
  const owner = booking.owner_name || booking.booking_owner?.full_name || null;
  const history = booking.history;
  // ביטחון מידע / תקשוב have no handling target (and no mobile side): only how long the booking is open
  const webOnly = isTopicType(booking.booking_type_id);
  const actions = orderedActions(booking).toSorted((a, b) => {
    if (routeType) return 0;
    const rank = (item) => (actionTone(item) === 'danger' ? 2 : actionTone(item) === 'hold' ? 1 : 0);
    return rank(a) - rank(b);
  });

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <DomainBadge bookingTypeId={booking.booking_type_id} />
        <FadingTag value={`${booking.status_id}:${booking.status_label}`}>
          <StatusChip statusId={booking.status_id} label={booking.status_label} bookingTypeId={booking.booking_type_id} />
        </FadingTag>
        <Chip>{booking.booking_type_label}</Chip>
        <Chip>{unitName(booking.unit_id)}</Chip>
        <FadingTag value={conflict || booking.has_conflict ? 'conflict' : null}><NeedsDecision /></FadingTag>
        <FadingTag value={booking.sync_state === 'pending' ? 'pending' : null}>
          <Chip tone="info">ממתינה לשליחה לאפליקציה</Chip>
        </FadingTag>
      </div>

      {conflict ? (
        <Notice
          tone="bad"
          action={
            can('sync.operate') ? (
              <span style={{ display: 'flex', gap: 6, marginInlineStart: 'auto', flexWrap: 'wrap' }}>
                {booking.sync.ext_status_id !== 6 ? (
                  <Button size="sm" onClick={() => setResolving('keep_internal')}>
                    לשמור את ההחלטה כאן
                  </Button>
                ) : null}
                <Button size="sm" variant="primary" onClick={() => setResolving('accept_external')}>
                  לקבל את המצב באפליקציה
                </Button>
              </span>
            ) : undefined
          }
        >
          <b>נדרשת הכרעה.</b> הקריאה שונתה במקביל באפליקציה: כאן &quot;{booking.status_label}&quot;, שם &quot;{booking.sync.ext_status_label ?? '—'}&quot;. עד להכרעה לא ניתן לבצע פעולות נוספות.
        </Notice>
      ) : null}

      <section className="panel">
        <header>
          <h2>{routeType ? 'מסלול הבקשה' : 'מסלול האישור'}</h2>
          <span className="hint">
            {booking.stage_label}
            {webOnly
              ? ` · פתוחה ${fmtHours(booking.total_age_hours)}`
              : ` · פתוחה ${fmtHours(booking.total_age_hours)} מתוך יעד ${fmtHours(targetHoursOr(booking.target_hours))}${booking.target_hours == null ? ' (ברירת מחדל)' : ''}`}
            {/* the moment the scheduler waits for (the interview): the request moves on by itself once it passes */}
            {booking.stage_due_at && booking.stage !== 'closed' ? ` · מועד התחקיר: ${fmtDateTime(booking.stage_due_at)}` : ''}
          </span>
        </header>
        <div className="body">
          <Rail booking={booking} catalog={catalog} history={history} />
          {isHoldStatus(booking.status_id) ? (
            <Notice tone="warn">{booking.status_label}. {booking.stage?.startsWith('supplier') ? 'זו המתנה קודמת שלא משויך אליה שלב הטיפול המקורי.' : 'הקריאה נשארת באותו שלב: ' + booking.stage_label + '.'}</Notice>
          ) : null}
          {routeType ? <HandlerBlock booking={booking} /> : null}
          {actions.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
              {actions.map((action) => (
                // a move the request is not ready for yet (no handler) is shown disabled, its reason as the hint
                <Button
                  key={action.status_id}
                  variant={actionVariant(action)}
                  disabled={action.enabled === false}
                  data-tip={action.enabled === false ? action.disabled_reason ?? undefined : undefined}
                  onClick={() => status.start(booking, action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: '14px 0 0' }}>
              {booking.stage === 'closed'
                ? 'הקריאה סגורה. אין פעולות זמינות.'
                : routeType
                  ? `${canAct ? 'אין לך פעולה זמינה בשלב הזה.' : 'בתפקידך את/ה צופה בקריאה.'} הקריאה בשלב "${booking.stage_label}"; רק בעל התפקיד שתורו במסלול יכול להעביר אותה כעת.`
                  : `${canAct ? 'אין לך פעולה זמינה בשלב הזה.' : 'בתפקידך את/ה צופה בקריאה ואינך מאשר/ת אותה.'} הקריאה ממתינה ל${(booking.stage !== 'realization' && topicHandlerName(booking.booking_type_id)) || STAGE_SHORT[booking.stage] || 'גורם אחר'}, ורק בעל התפקיד שהתור שלו במסלול יכול לאשר או לדחות אותה כעת.`}
            </p>
          )}
        </div>
      </section>

      <div className="cols2">
        <section className="panel">
          <header>
            <h2>פרטי הקריאה</h2>
            {webOnly ? null : <span className="hint" style={{ marginInlineStart: 'auto' }}>עדכון תאריך ושעה מתבצע באפליקציית המובייל בלבד.</span>}
          </header>
          <div className="body">
            <dl className="kv">
              <RequesterRows name={owner} personalId={booking.owner_personal_id} phone={booking.booking_owner?.phone} />
              <dt>נפתחה</dt>
              <dd>{fmtDateTime(booking.opened_at)}</dd>
              <dt>שינוי סטטוס אחרון</dt>
              <dd>
                {fmtDateTime(booking.status_changed_at)} <SourceTag source={booking.status_source} />
              </dd>
              {booking.vice_approver ? (
                <>
                  <dt>גורם מטפל</dt>
                  <dd>
                    {booking.vice_approver.full_name ?? booking.vice_approver.personal_id}
                    {booking.vice_approver.phone ? <> · <span className="ltr">{booking.vice_approver.phone}</span></> : null}
                  </dd>
                </>
              ) : null}
              {lines.map((line, index) => (
                <Fragment key={index}>
                  <dt className={line.depth ? 'sub' : undefined}>{line.label}</dt>
                  <dd className={line.depth ? 'sub' : undefined}>{line.text}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        </section>

        {/* comments with the status history under them: they fill the column beside the (taller) details */}
        <div className="drawer-stack">
        <CommentsPanel
          comments={booking.comments.map((comment) => ({
            id: comment.id,
            author: comment.user?.full_name || comment.user?.personal_id || 'מבקש',
            when: comment.created_at,
            text: comment.comment,
          }))}
        />

        <section className="panel">
          <header>
            <h2>היסטוריית סטטוסים</h2>
            <span className="hint">{webOnly ? 'כולל מעברים אוטומטיים' : 'כולל פעולות שבוצעו באפליקציה'}</span>
          </header>
          <div className="body">
            <ol className="timeline">
              {history.map((entry, index) => {
                const next = history[index + 1];
                const dwell = next ? (Date.parse(next.occurred_at) - Date.parse(entry.occurred_at)) / 36e5 : null;
                const actor = actorOf(entry);
                return (
                  <li key={index}>
                    <div className="t1">
                      <b>{entry.status_label}</b>
                      <SourceTag source={entry.source} />
                      <span className="when">{fmtDateTime(entry.occurred_at)}</span>
                    </div>
                    <div className="small muted">
                      {entry.action_label ?? ''}
                      {actor ? ` · ${actor}` : ''}
                      {dwell !== null && dwell > 0 ? ` · שהתה בסטטוס ${fmtHours(dwell)}` : ''}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
        </div>
      </div>

      {/* the section the handlers fill (route types): inputs for whoever may write it now, read-only for everyone else */}
      {handlerFields.length ? (
        <HandlerFieldsPanel
          key={booking.version}
          booking={booking}
          title={sectionLabel('handler', catalog)}
          hint={handlerFields.some((field) => field.can_edit) ? 'ניתן לעדכן בשלב זה' : booking.stage === 'closed' ? undefined : 'לצפייה בלבד בשלב זה'}
        />
      ) : null}

      {attachments.length > 0 ? <AttachmentsPanel attachments={attachments} /> : null}

      {booking.audit ? (
        <section className="panel">
          <header>
            <h2>היסטוריית שינויים בקריאה</h2>
          </header>
          <div className="tbl-wrap">
            <table className="t">
              <tbody>
                {booking.audit.length ? (
                  booking.audit.map((row, index) => (
                    <tr key={`${row.correlation_id ?? row.occurred_at}-${index}`}>
                      <td className="small">{fmtDateTime(row.occurred_at)}</td>
                      <td>{auditSentence(row, { typeName, unitName, departmentName }, { serial: booking.serial_number, bookingTypeId: booking.booking_type_id })}</td>
                      <td>{row.result === 'success' ? null : <Chip tone={row.result === 'denied' ? 'warn' : 'bad'}>{row.result === 'denied' ? 'נדחה' : 'נכשל'}</Chip>}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted">אין רשומות</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {status.dialog}
      {resolving ? <ResolveConflictDialog booking={booking} resolution={resolving} onClose={() => setResolving(null)} /> : null}
    </>
  );
}
