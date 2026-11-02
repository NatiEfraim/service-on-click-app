'use client';

import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { DIALOG_EXIT_MS, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { useOverlay } from './overlay';
import { SmoothSize } from './SmoothSize';
import { useIsClient } from './useIsClient';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Blocks closing while a request is in flight. */
  busy?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
}

/**
 * Parents unmount a dialog the moment it closes, so there is nothing left to animate.
 * On unmount a lifeless copy of the scrim and the dialog is left in place and faded out, whatever closed it.
 */
function useExitFade(scrimRef: RefObject<HTMLDivElement | null>, dialogRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const scrim = scrimRef.current;
    const dialog = dialogRef.current;
    return () => {
      if (!scrim || !dialog || typeof window === 'undefined') return;
      const reduce = prefersReducedMotion();
      const ghosts = ([
        [scrim, [{ opacity: 1 }, { opacity: 0 }]],
        [dialog, reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(0.97)' }]],
      ] as const).map(([source, frames]) => ({ source, frames, ghost: source.cloneNode(true) as HTMLElement }));
      // Strict Mode (dev) runs this cleanup on a dialog that stays open; only a dialog that really left the page fades out
      queueMicrotask(() => {
        for (const { source, frames, ghost } of ghosts) {
          if (source.isConnected) continue;
          ghost.setAttribute('aria-hidden', 'true');
          ghost.removeAttribute('role');
          ghost.inert = true;
          ghost.style.pointerEvents = 'none';
          ghost.style.animation = 'none';
          document.body.appendChild(ghost);
          ghost.animate(frames as Keyframe[], { duration: DIALOG_EXIT_MS, easing: EASE_OUT, fill: 'forwards' }).finished.finally(() => ghost.remove());
        }
      });
    };
  }, [scrimRef, dialogRef]);
}

function ModalInner({ title, onClose, children, footer, wide, busy, initialFocus }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(ref, { onEscape: busy ? undefined : onClose, initialFocus });
  useExitFade(scrimRef, ref);

  return (
    <>
      <div ref={scrimRef} className="scrim top" onClick={busy ? undefined : onClose} />
      <div ref={ref} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <h3 id={titleId}>{title}</h3>
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
export function Modal(props: ModalProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<ModalInner {...props} />, document.body);
}
