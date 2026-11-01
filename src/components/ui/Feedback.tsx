import type { CSSProperties, ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { Button } from './Button';
import { Icon } from './Icon';

type NoticeTone = '' | 'warn' | 'bad';

/** An inline message: information (default), a warning, or an error. */
export function Notice({ tone = '', children, action, className = '', style }: { tone?: NoticeTone; children: ReactNode; action?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`notice ${tone} ${className}`.trim()} role={tone === 'bad' ? 'alert' : undefined} style={style}>
      <Icon name={tone === 'bad' || tone === 'warn' ? 'alert' : 'info'} />
      <div>{children}</div>
      {action}
    </div>
  );
}

/** What a failed request looks like on a screen, with a retry. The text is the server's own Hebrew message. */
export function ErrorNotice({ error, onRetry, title = 'לא ניתן לטעון את המסך.' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError ? error.message : 'אירעה שגיאה. נסו שוב.';
  // asking again does not help when the server refused (403/404/405: not yours, or no longer there)
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

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

/** Grey placeholder lines while a screen loads. */
export function Loading({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="טוען">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel" style={{ width: `${92 - i * 9}%`, margin: '14px 0' }} />
      ))}
    </div>
  );
}

/** "No access to this screen" - shown instead of a screen the signed-in user's capabilities do not include. */
export function Denied({ children = 'אין לך גישה למסך זה.' }: { children?: ReactNode }) {
  return (
    <div className="card">
      <EmptyState title="אין גישה למסך זה">{children}</EmptyState>
    </div>
  );
}
