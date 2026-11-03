'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Rail } from '@/components/booking/RouteViz';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, SourceTag, StatusChip } from '@/components/ui/Chips';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { auditSentence } from '@/lib/audit-sentence';
import { describeValues } from '@/lib/booking-values';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { fmtDateTime, fmtHours } from '@/lib/format';
import { actionTone, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { bookingActions } from '@/lib/booking-actions';
import { AttachmentsPanel } from './Attachments';
import { ResolveConflictDialog } from './ResolveConflictDialog';
import { useStatusAction } from './useStatusAction';

function Body({ booking, onDecision }) {
  const session = useSession();
  const { catalog, can, canAct, unitName, typeName, departmentName } = session;
  const status = useStatusAction({ onDone: onDecision });
  const [resolving, setResolving] = useState(null);

  const lines = describeValues(booking.booking_values);
  const conflict = booking.sync.open_conflict;
  const owner = booking.owner_name || booking.booking_owner?.full_name || null;
  const history = booking.history;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <DomainBadge bookingTypeId={booking.booking_type_id} />
        <StatusChip statusId={booking.status_id} label={booking.status_label} />
        <Chip>{booking.booking_type_label}</Chip>
        <Chip>{unitName(booking.unit_id)}</Chip>
        {conflict || booking.has_conflict ? <NeedsDecision /> : null}
        {booking.sync_state === 'pending' ? <Chip tone="info">ממתינה לשליחה לאפליקציה</Chip> : null}
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
            {booking.target_hours ? ` · פתוחה ${fmtHours(booking.total_age_hours)} מתוך יעד ${fmtHours(booking.target_hours)}` : ''}
          </span>
        </header>
        <div className="body">
          <Rail booking={booking} catalog={catalog} history={history} />
          {booking.actions.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
              {bookingActions(booking.actions).map((action) => {
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
                : `${canAct ? 'אין לך פעולה זמינה בשלב הזה.' : 'בתפקידך את/ה צופה בקריאה ואינך מאשר/ת אותה.'} הקריאה ממתינה ל${STAGE_SHORT[booking.stage] ?? 'גורם אחר'}, ורק בעל התפקיד שהתור שלו במסלול יכול לאשר או לדחות אותה כעת.`}
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
              <dt>מבקש</dt>
              <dd>
                {owner ? `${owner} ` : ''}
                <span className="serial">{booking.owner_personal_id ?? '—'}</span>
              </dd>
              {booking.booking_owner?.phone ? (
                <>
                  <dt>טלפון</dt>
                  <dd className="ltr">{booking.booking_owner.phone}</dd>
                </>
              ) : null}
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
                    {booking.vice_approver.phone ? <span className="serial"> · {booking.vice_approver.phone}</span> : null}
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
      </div>

      {booking.attachments.length > 0 ? <AttachmentsPanel attachments={booking.attachments} /> : null}

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

/** One booking in full: route, offered decisions, values, comments, files and timeline. */
export function BookingDrawer({ serial, onClose }) {
  const [decidedSerial, setDecidedSerial] = useState(null);
  const closing = decidedSerial === serial;
  const query = useQuery({ queryKey: keys.bookingDetail(serial), queryFn: ({ signal }) => bookingsApi.get(serial, signal), staleTime: 5_000, retry: false, enabled: !closing });

  const onDecision = () => {
    setDecidedSerial(serial);
    onClose();
  };

  if (closing) return null;

  return (
    <Drawer
      label={`קריאה ${serial}`}
      onClose={onClose}
      title={
        <>
          קריאה <span className="serial" style={{ fontSize: 16 }}>{serial}</span>
        </>
      }
    >
      {query.isPending ? <Loading rows={10} /> : query.isError ? <ErrorNotice error={query.error} title="לא ניתן להציג את הקריאה." onRetry={() => void query.refetch()} /> : <Body booking={query.data} onDecision={onDecision} />}
      {query.isFetching && !query.isPending ? (
        <span className="sr" role="status">
          מרענן…
        </span>
      ) : null}
    </Drawer>
  );
}
