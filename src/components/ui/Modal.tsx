'use client';

import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from './overlay';
import { useIsClient } from './useIsClient';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row. */
  footer?: ReactNode;
  wide?: boolean;
  /** While true the dialog cannot be closed (a request is in flight). */
  busy?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
}

function ModalInner({ title, onClose, children, footer, wide, busy, initialFocus }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(ref, { onEscape: busy ? undefined : onClose, initialFocus });

  return (
    <>
      <div className="scrim top" onClick={busy ? undefined : onClose} />
      <div ref={ref} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <h3 id={titleId}>{title}</h3>
        </header>
        <div className="mb">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </>
  );
}

/** A centred dialog on top of everything (including the booking drawer). Render it only while it is open. */
export function Modal(props: ModalProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<ModalInner {...props} />, document.body);
}
