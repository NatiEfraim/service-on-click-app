'use client';

import { useRef } from 'react';
import { usePresence } from './usePresence';

/** How long a fold takes to close (components.css, .fold). */
export const FOLD_EXIT_MS = 260;

/**
 * Content that unfolds into place while it fades in (its height glides from nothing) and folds away while it fades out -
 * still showing what it showed last - so what is around it moves smoothly instead of jumping. Nothing is in the page while
 * `show` is false. A container whose gap sits above it sets `--err-gap` to that gap, and the gap glides too. For messages
 * that come and go under a field or a form (errors, a lookup's result). Styles: components.css (.fold).
 */
export function Fold({ show, className = '', children }) {
  const last = useRef(children);
  if (show) last.current = children;
  const presence = usePresence(Boolean(show), FOLD_EXIT_MS);
  if (!presence.mounted) return null;
  return (
    <div className={`fold${className ? ` ${className}` : ''}`} data-closing={presence.closing || undefined}>
      {show ? children : last.current}
    </div>
  );
}
