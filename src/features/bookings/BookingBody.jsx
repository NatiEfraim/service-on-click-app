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
import { actionTone, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { bookingActions } from '@/lib/booking-actions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { AttachmentsPanel } from './Attachments';
import { ResolveConflictDialog } from './ResolveConflictDialog';
import { useStatusAction } from './useStatusAction';
import { topicHandlerName } from '@/lib/topicTypes';

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

export function Body({ booking }) {
  const session = useSession();
  const { catalog, can, canAct, unitName, typeName, departmentName } = session;
  const status = useStatusAction();
  const [resolving, setResolving] = useState(null);

  const lines = describeValues(booking.booking_values);
  const valueAttachments = uploadAttachments(booking.booking_values);
  const attachments = valueAttachments.length ? valueAttachments : booking.attachments;
  const conflict = booking.sync.open_conflict;
  const owner = booking.owner_name || booking.booking_owner?.full_name || null;
  const history = booking.history;

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
          <h2>מסלול האישור</h2>
          <span className="hint">
            {booking.stage_label}
            {/* ביטחון מידע / תקשוב have no handling target: only how long the booking is open */}
            {topicHandlerName(booking.booking_type_id)
              ? ` · פתוחה ${fmtHours(booking.total_age_hours)}`
              : ` · פתוחה ${fmtHours(booking.total_age_hours)} מתוך יעד ${fmtHours(targetHoursOr(booking.target_hours))}${booking.target_hours == null ? ' (ברירת מחדל)' : ''}`}
          </span>
        </header>
        <div className="body">
          <Rail booking={booking} catalog={catalog} history={history} />
          {isHoldStatus(booking.status_id) ? (
            <Notice tone="warn">{booking.status_label}. {booking.stage?.startsWith('supplier') ? 'זו המתנה קודמת שלא משויך אליה שלב הטיפול המקורי.' : 'הקריאה נשארת באותו שלב: ' + booking.stage_label + '.'}</Notice>
          ) : null}
          {booking.actions.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
              {bookingActions(booking.actions).toSorted((a, b) => { const rank = (item) => actionTone(item) === 'danger' ? 2 : actionTone(item) === 'hold' ? 1 : 0; return rank(a) - rank(b); }).map((action) => {
                const tone = actionTone(action);
                return (
                  <Button key={action.status_id} variant={tone === 'danger' ? 'danger' : tone === 'hold' ? 'hold' : 'primary'} onClick={() => status.start(booking, action)}>
                    {action.label}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="small muted" style={{ margin: '14px 0 0' }}>
              {booking.stage === 'closed'
                ? 'הקריאה סגורה. אין פעולות זמינות.'
                : `${canAct ? 'אין לך פעולה זמינה בשלב הזה.' : 'בתפקידך את/ה צופה בקריאה ואינך מאשר/ת אותה.'} הקריאה ממתינה ל${(booking.stage !== 'realization' && topicHandlerName(booking.booking_type_id)) || STAGE_SHORT[booking.stage] || 'גורם אחר'}, ורק בעל התפקיד שהתור שלו במסלול יכול לאשר או לדחות אותה כעת.`}
            </p>
          )}
        </div>
      </section>

      <div className="cols2">
        <section className="panel">
          <header>
            <h2>פרטי הקריאה</h2>
            <span className="hint" style={{ marginInlineStart: 'auto' }}>עדכון תאריך ושעה מתבצע באפליקציית המובייל בלבד.</span>
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
        <section className="panel">
          <header>
            <h2>הערות</h2>
            <span className="hint">{booking.comments.length}</span>
          </header>
          <div className="body">
            {booking.comments.length ? (
              booking.comments.map((comment) => (
                <div key={comment.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="small">
                    <b>{comment.user?.full_name || comment.user?.personal_id || 'מבקש'}</b> <span className="muted">{comment.created_at}</span>
                  </div>
                  {comment.comment}
                </div>
              ))
            ) : (
              <div className="muted small">אין הערות</div>
            )}
          </div>
        </section>

        <section className="panel">
          <header>
            <h2>היסטוריית סטטוסים</h2>
            <span className="hint">כולל פעולות שבוצעו באפליקציה</span>
          </header>
          <div className="body">
            <ol className="timeline">
              {history.map((entry, index) => {
                const next = history[index + 1];
                const dwell = next ? (Date.parse(next.occurred_at) - Date.parse(entry.occurred_at)) / 36e5 : null;
                const actor = entry.actor_name || entry.actor_id;
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
