'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useEffect } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { Chip, StatusChip } from '@/components/ui/Chips';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { holdDescription, isHoldStatus } from '@/lib/booking-workflow';
import { fmtDateTime } from '@/lib/format';
import { fetchRequestDetails, iconSrc, PROGRESS_STEPS, requestProgress, STATUS_LABEL } from './requesterData';

const STATUS_TONE = { action: 'warn', handling: 'info', done: 'ok' };

/** A form value as text: plain values as they are, a list joined, an object by its name. */
function valueText(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) return value.map(valueText).filter((text) => text !== '—').join(', ') || '—';
  if (typeof value === 'object') return valueText(value.display_name ?? value.name ?? value.value ?? null);
  return String(value);
}

/** A date from the server as the rest of the app shows it; a value it cannot read stays as it came. */
const when = (value) => {
  if (!value) return '—';
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

/** The request's steps as a row of dots: done ones filled, the current one marked (on hold, stopped or finished in its colour). */
function ProgressRail({ statusId, demoStatus, label }) {
  const { step, mode } = requestProgress(statusId, demoStatus);
  return (
    <div className="rail" role="img" aria-label={`הקריאה בשלב ${PROGRESS_STEPS[step]}: ${label}`}>
      {PROGRESS_STEPS.map((name, index) => (
        <div key={name} className={`station ${index < step ? 'done' : index === step ? mode : ''}`.trim()}>
          <span className="dot" />
          <span className="name">{name}</span>
          {index === step ? <span className="sub">{mode === 'finished' ? 'הושלמה' : label}</span> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * One of the user's requests in full, sliding in from the side, laid out like the management view of a request:
 * domain and status on top, the status message, the details (requester, dates, every value filled in), comments and
 * attachments. View only. The approval route and status history are not shown: the requester endpoint does not send them.
 */
export function RequestDrawer({ row, rows = [], onGo, onClose }) {
  const query = useQuery({
    queryKey: ['requester-demo', 'request', row.id],
    queryFn: ({ signal }) => fetchRequestDetails(row, signal),
    retry: false,
  });
  const details = query.data;

  return (
    <Drawer
      label={`קריאה ${row.serial}`}
      onClose={onClose}
      scrollKey={row.id}
      tools={onGo ? <RequestStepper row={row} rows={rows} onGo={onGo} /> : undefined}
      title={
        <>
          קריאה <span className="serial" style={{ fontSize: 16 }}>{row.serial}</span>
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
            {row.bookingTypeId ? <DomainBadge bookingTypeId={row.bookingTypeId} /> : <span className="rq-drawer-pic"><img src={iconSrc(row.typeId)} alt="" /></span>}
            {row.status ? (
              <Chip tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Chip>
            ) : (
              <StatusChip statusId={details.statusId} label={details.statusName} />
            )}
            <Chip>{row.typeName}</Chip>
          </div>

          <section className="panel">
            <header>
              <h2>איפה הקריאה עומדת</h2>
              <span className="hint">{row.status ? STATUS_LABEL[row.status] : details.statusName}</span>
            </header>
            <div className="body">
              <ProgressRail statusId={details.statusId} demoStatus={row.status} label={row.status ? STATUS_LABEL[row.status] : details.statusName} />
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
                        <span className="serial">{details.requester.personalId}</span>
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
