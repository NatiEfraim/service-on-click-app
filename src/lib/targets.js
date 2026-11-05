/**
 * The handling target a domain gets on screen when none was set for it: 48 hours from opening to closing, with the early
 * warning at 80%. Screen only - the server keeps no target for such a domain, so its own counts (e.g. "חורגות מיעד")
 * count only domains with a target that was set.
 */
export const DEFAULT_TARGET_HOURS = 48;
export const DEFAULT_WARN_RATIO = 0.8;

/** The target hours to show and measure against: the domain's own, else the default. */
export const targetHoursOr = (hours) => (hours == null ? DEFAULT_TARGET_HOURS : hours);
