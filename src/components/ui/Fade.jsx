'use client';

import { useRef } from 'react';
import { usePresence } from './usePresence';

/** How long a `Fade` takes to fade out (components.css, .fade-presence). */
const FADE_EXIT_MS = 200;

/**
 * Shows its content while `show` is true: it fades in when it appears, and fades out - still showing what it showed
 * last - when `show` turns false, then leaves the page. Nothing can be clicked while it fades out. For a line or a
 * button that comes and goes with the data (a handler's assignment time, a button a new state no longer offers).
 * `as` is the element (a `span` inside a line of text or a row of buttons). Styles: components.css (.fade-presence).
 */
export function Fade({ show, as: Tag = 'div', className = '', children, ...rest }) {
  const last = useRef(children);
  if (show) last.current = children;
  const presence = usePresence(Boolean(show), FADE_EXIT_MS);
  if (!presence.mounted) return null;
  return (
    <Tag className={`fade-presence${className ? ` ${className}` : ''}`} data-closing={presence.closing || undefined} inert={presence.closing || undefined} {...rest}>
      {show ? children : last.current}
    </Tag>
  );
}
