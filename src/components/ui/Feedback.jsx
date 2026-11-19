'use client';

import { ApiError } from '@/lib/api/client';
import { Button } from './Button';
import { Icon } from './Icon';
import { Fold } from './Fold';



export function Notice({ tone = '', children, action, className = '', style }) {
  return (
    <div className={`notice ${tone} ${className}`.trim()} role={tone === 'bad' ? 'alert' : undefined} style={style}>
      <Icon name={tone === 'bad' || tone === 'warn' ? 'alert' : 'info'} />
      <div>{children}</div>
      {action}
    </div>
  );
}

/** A failed request with a retry; the text is the server's Hebrew message. */
export function ErrorNotice({ error, onRetry, title = 'לא ניתן לטעון את המסך.' }) {
  const message = error instanceof ApiError ? error.message : 'אירעה שגיאה. נסו שוב.';
  // No retry when the server refused (403/404/405).
  const retryable = onRetry && !(error instanceof ApiError && error.denied);
  return (
    <Notice
      tone="bad"
      action={
        retryable ? (
          <Button size="sm" onClick={onRetry}>
            נסו שוב
          </Button>
        ) : undefined
      }
    >
      <b>{title}</b> {message}
    </Notice>
  );
}

/** A form's error message: it unfolds and fades in, and folds and fades out with its last message (Fold); nothing while there is none. */
export function FormError({ children }) {
  return (
    <Fold show={Boolean(children)} className="form-err">
      <div className="err" role="alert">
        {children}
      </div>
    </Fold>
  );
}

/**
 * The error line under one field: always in the page (an empty live region), so a message that appears is announced.
 * Point the input's aria-describedby at its `id`.
 */
export function FieldError({ id, children }) {
  return (
    <div id={id} className="err" aria-live="polite">
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Loading({ rows = 6 }) {
  return (
    <div role="status" aria-label="טוען">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel" style={{ width: `${92 - i * 9}%`, margin: '14px 0' }} />
      ))}
    </div>
  );
}

/** Shown instead of a screen the user's capabilities do not include. */
export function Denied({ children = 'אין לך גישה למסך זה.' }) {
  return (
    <div className="card">
      <EmptyState title="אין גישה למסך זה">{children}</EmptyState>
    </div>
  );
}
