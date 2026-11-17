'use client';

import { useEffect } from 'react';

/**
 * Loads the next page of an infinite list (a React Query `useInfiniteQuery` result, or any object with the same
 * `hasNextPage` / `isFetchingNextPage` / `fetchNextPage`) when the `sentinel` element - placed after the last row - comes
 * within `ahead` pixels of the bottom of `scroller` (the list's scroll box).
 * `enabled`: false while the list is not shown (e.g. another tab). `remountKey`: something that changes when the sentinel
 * itself mounts again (the rows appearing after a loading state), so the observer attaches to the new element.
 */
export function useInfiniteScroll({ sentinel, scroller, query, ahead = 400, enabled = true, remountKey }) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!enabled || !el || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${ahead}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the refs are stable; remountKey re-attaches on purpose
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, ahead, remountKey]);
}
