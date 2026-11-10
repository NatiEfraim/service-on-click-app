'use client';

import { useLayoutEffect, useRef } from 'react';
import { EASE_IN, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { usePresence } from './usePresence';

/** How long an opened row's details take to fold open and to fold away. */
const ENTER_MS = 260;
const EXIT_MS = 200;

/**
 * A table row's details under it: they glide open and fade in, and stay on screen while they fade and fold away.
 * Put it right after the row it belongs to; `children` is the content (its first element is the part that fades).
 */
export function ExpandRow({ open, colSpan, children }) {
  // kept mounted for the text fade (60ms head start) plus the fold
  const presence = usePresence(open, EXIT_MS + 60);
  const fold = useRef(null);

  // the height glides between 0 and the content's (measured in pixels: a table row cannot animate to `auto`)
  useLayoutEffect(() => {
    const el = fold.current;
    if (!el || prefersReducedMotion()) return;
    const body = el.firstElementChild;
    // measured from where it is now (a close during the open starts from the current height, not the full one)
    const from = `${el.getBoundingClientRect().height}px`;
    const full = `${el.scrollHeight}px`;
    let height;
    let fade;
    if (presence.closing) {
      // the text fades first, quickly, then the room closes - so it never shows squashed
      fade = body?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE_IN, fill: 'forwards' });
      height = el.animate([{ height: from, overflow: 'hidden' }, { height: '0px', overflow: 'hidden' }], { duration: EXIT_MS, delay: 60, easing: EASE_IN, fill: 'forwards' });
    } else {
      // the room opens, and the text fades in a moment later into it
      height = el.animate([{ height: '0px', overflow: 'hidden' }, { height: full, overflow: 'hidden' }], { duration: ENTER_MS, easing: EASE_OUT });
      fade = body?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 60, easing: EASE_OUT, fill: 'backwards' });
    }
    return () => {
      height.cancel();
      fade?.cancel();
    };
  }, [presence.mounted, presence.closing]);

  if (!presence.mounted) return null;
  return (
    <tr className="expand-row">
      <td colSpan={colSpan}>
        <div ref={fold} className="expand-fold">
          {children}
        </div>
      </td>
    </tr>
  );
}
