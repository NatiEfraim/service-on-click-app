'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * The list the booking drawer was opened from, so it can step to the previous / next booking.
 * A list screen publishes the serials it shows, in its order; the drawer reads them.
 * Only one list is on screen at a time; when it unmounts it takes its list away.
 *
 * shape: { serials: number[], total: number | null, hasMore: boolean, loadMore: () => void }
 */
let current = null;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The list the drawer steps through, or null (opened from search, a link, a page without a list). */
export function useDrawerList() {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

/** A list screen calls this with the serials it shows; `loadMore` fetches the next page of a paged list. */
export function usePublishDrawerList(serials, { total = null, hasMore = false, loadMore } = {}) {
  const owner = useRef({});
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const signature = serials.join(',');

  useEffect(() => {
    current = {
      owner: owner.current,
      serials: signature ? signature.split(',').map(Number) : [],
      total,
      hasMore,
      loadMore: () => loadMoreRef.current?.(),
    };
    emit();
  }, [signature, total, hasMore]);

  useEffect(() => {
    const mine = owner.current;
    return () => {
      if (current?.owner === mine) {
        current = null;
        emit();
      }
    };
  }, []);
}

/** Where `serial` sits in the list: its index and its neighbours (null when it is not in the list). */
export function placeInList(list, serial) {
  if (!list) return null;
  const index = list.serials.indexOf(serial);
  if (index < 0) return null;
  return {
    index,
    count: list.total ?? list.serials.length,
    previous: index > 0 ? list.serials[index - 1] : null,
    next: index < list.serials.length - 1 ? list.serials[index + 1] : null,
    // the last loaded row of a paged list: the next one is on the page not loaded yet
    nextNeedsLoad: index === list.serials.length - 1 && list.hasMore,
  };
}
