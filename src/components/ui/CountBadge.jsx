'use client';

/**
 * A small red count on the top-right corner of an icon (its parent must be `position: relative`), e.g. how many open
 * requests wait in a category. Nothing when the count is 0; "99+" above 99. It pops in and the number settles on change
 * (keyed by the count). `label` is what a screen reader hears (the number alone means little).
 */
export function CountBadge({ count, label }) {
  if (!count) return null;
  return (
    <span key={count} className="count-badge" aria-label={label ?? String(count)} role="img">
      {count > 99 ? '99+' : count}
    </span>
  );
}
