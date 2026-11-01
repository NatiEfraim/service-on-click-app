'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';

/** Overlays stack; only the top-most handles Escape and traps Tab. */
const stack: string[] = [];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface OverlayOptions {
  /** Called on Escape when this overlay is top-most. */
  onEscape?: () => void;
  /** Element to focus on open (default: first focusable). */
  initialFocus?: RefObject<HTMLElement | null>;
}

export function useOverlay(containerRef: RefObject<HTMLElement | null>, { onEscape, initialFocus }: OverlayOptions = {}): void {
  const id = useId();
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(id);

    // Wait a frame so the content is mounted before focusing.
    const frame = requestAnimationFrame(() => {
      const target = initialFocus?.current ?? container.querySelector<HTMLElement>('textarea, input:not([type=checkbox]):not([type=radio]), select') ?? container.querySelector<HTMLElement>(FOCUSABLE) ?? container;
      if (target === container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;

      if (event.key === 'Escape') {
        if (escapeRef.current) {
          event.stopPropagation();
          event.preventDefault();
          escapeRef.current();
        }
        return;
      }

      if (event.key === 'Tab') {
        const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!items.length) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && (active === first || !container.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !container.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      const index = stack.lastIndexOf(id);
      if (index >= 0) stack.splice(index, 1);
      // Restore focus to the opener.
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounts once per open
  }, [id]);
}
