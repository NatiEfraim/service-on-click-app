'use client';

import { Button } from './Button';

/**
 * The one way every screen clears its filters: the word "ניקוי", nothing else (no ✕ beside it, no icon-only button).
 * It appears and leaves with a little fade (as the date picker's and the requests' old clear buttons did); pass
 * `closing` while it is on its way out (usePresence) so it fades instead of vanishing.
 */
export function ClearFilters({ onClick, closing = false, disabled = false }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="clear-filters"
      data-closing={closing || undefined}
      disabled={disabled || closing}
      aria-label="ניקוי הסינון"
      onClick={onClick}
    >
      ניקוי
    </Button>
  );
}
