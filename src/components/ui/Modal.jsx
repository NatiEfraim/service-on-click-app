'use client';

import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DIALOG_EXIT_MS } from '@/lib/motion';
import { Button } from './Button';
import { useOverlay } from './overlay';
import { SmoothSize } from './SmoothSize';
import { useExitGhost } from './useExitGhost';
import { useIsClient } from './useIsClient';



const FADE_OUT = [{ opacity: 1 }, { opacity: 0 }];
/** The dialog shrinks back a little as it fades (its transform also keeps it centred). */
const DIALOG_OUT = [{ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(0.97)' }];

function ModalInner({ title, onClose, children, footer, wide, busy, initialFocus }) {
  const ref = useRef(null);
  const scrimRef = useRef(null);
  const titleId = useId();
  useOverlay(ref, { onEscape: busy ? undefined : onClose, initialFocus });
  const [exitParts] = useState(() => [{ ref: scrimRef, frames: FADE_OUT }, { ref, frames: DIALOG_OUT }]);
  useExitGhost(exitParts, { duration: DIALOG_EXIT_MS });
  // a dialog opened over another one stacks above it: its dimming covers (and blurs) the dialog underneath
  const [depth] = useState(() => document.querySelectorAll('.modal').length);
  const layer = depth ? { zIndex: 70 + depth * 2 } : undefined;
  const dialogLayer = depth ? { zIndex: 71 + depth * 2 } : undefined;

  return (
    <>
      <div ref={scrimRef} className={`scrim top${depth ? ' stacked' : ''}`} style={layer} onClick={busy ? undefined : onClose} />
      <div ref={ref} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} style={dialogLayer}>
        <header>
          <h3 id={titleId}>{title}</h3>
          <Button size="sm" variant="ghost" icon="x" className="modal-x" aria-label="סגירה" disabled={busy} onClick={onClose} />
        </header>
        <SmoothSize>
          <div className="mb">{children}</div>
        </SmoothSize>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </>
  );
}

/** Centred dialog above the drawer. Render it only while open. */
export function Modal(props) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<ModalInner {...props} />, document.body);
}
