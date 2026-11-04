/** Motion values shared by the components that animate from script (the CSS side uses `--ease-out` in tokens.css). */

/** Strong ease-out: anything entering, leaving or answering a press. */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Loaded content fading in where its loading skeleton was. */
export const CONTENT_FADE_MS = 260;

/** A height glide (`SmoothSize`). */
export const RESIZE_MS = 260;

/** A dialog fading out after it closed (`Modal`). */
export const DIALOG_EXIT_MS = 150;

/** The side panel (booking): iOS-like drawer curve; it slides in from its edge (CSS, 300ms) and back out over this. */
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const DRAWER_EXIT_MS = 240;

/** A hover-opened menu (ניהול) waits this long after the mouse leaves before closing. */
export const MENU_HOVER_CLOSE_MS = 180;

/** A dropdown menu fading out (`usePresence`; matches `.menu[data-closing]` in layout.css). */
export const MENU_EXIT_MS = 150;

/*
 * A decided list row (`Ticket`), in order - change a number to make that step faster (smaller) or slower (bigger):
 *   1. ROW_STAMP_MS    the row turns green ✓ / red ✗ and stays visible for this long
 *   2. ROW_SLIDE_MS    it slides out to the right / left
 *   3. ROW_COLLAPSE_MS its room closes and the rows below glide up
 * The list reloads after all three (ROW_LEAVE_MS, computed - do not set it by hand).
 */
export const ROW_STAMP_MS = 300;
export const ROW_SLIDE_MS = 220;
export const ROW_COLLAPSE_MS = 180;
export const ROW_LEAVE_MS = ROW_STAMP_MS + ROW_SLIDE_MS + ROW_COLLAPSE_MS;

/**
 * A row that arrives in a list (the next booking moving up into the dashboard's "oldest"):
 * its room opens over ROW_COLLAPSE_MS (above), then it fades in over ROW_ARRIVE_MS.
 */
export const ROW_ARRIVE_MS = 180;

/** True when the viewer asked the system for less motion. */
export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
