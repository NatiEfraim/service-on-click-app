'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * The list the booking drawer was opened from, so it can step to the previous / next booking.
 * A list screen publishes the keys (uuids) of the bookings it shows, in its order; the drawer reads them.
 * Only one list is on screen at a time; when it unmounts it takes its list away.
 *
 * shape: { keys: string[], total: number | null, hasMore: boolean, loadMore: () => void }
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

/** A list screen calls this with its bookings' keys (bookingKey: the uuid); `loadMore` fetches a paged list's next page. */
export function usePublishDrawerList(bookingKeys, { total = null, hasMore = false, loadMore } = {}) {
  const owner = useRef({});
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const signature = bookingKeys.filter(Boolean).join(',');

  useEffect(() => {
    current = {
      owner: owner.current,
      keys: signature ? signature.split(',') : [],
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

/** Where the booking `key` sits in the list: its index and its neighbours (null when it is not in the list). */
export function placeInList(list, key) {
  if (!list) return null;
  const index = list.keys.indexOf(key);
  if (index < 0) return null;
  return {
    index,
    count: list.total ?? list.keys.length,
    previous: index > 0 ? list.keys[index - 1] : null,
    next: index < list.keys.length - 1 ? list.keys[index + 1] : null,
    // the last loaded row of a paged list: the next one is on the page not loaded yet
    nextNeedsLoad: index === list.keys.length - 1 && list.hasMore,
  };
}
