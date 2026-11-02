/** Motion values shared by the components that animate from script (the CSS side uses `--ease-out` in tokens.css). */

/** Strong ease-out: anything entering, leaving or answering a press. */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** A height glide (`SmoothSize`). */
export const RESIZE_MS = 260;

/** A dialog fading out after it closed (`Modal`). */
export const DIALOG_EXIT_MS = 150;

/** A dropdown menu fading out (`usePresence`; matches `.menu[data-closing]` in layout.css). */
export const MENU_EXIT_MS = 150;

/** A decided list row: stamp, slide out, collapse (`Ticket`); the list reloads after `ROW_LEAVE_MS`. */
export const ROW_STAMP_MS = 450;
export const ROW_SLIDE_MS = 330;
export const ROW_COLLAPSE_MS = 260;
export const ROW_LEAVE_MS = ROW_STAMP_MS + ROW_SLIDE_MS + ROW_COLLAPSE_MS;

/** True when the viewer asked the system for less motion. */
export const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
