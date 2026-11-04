'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False on the server and during hydration; lets a portal wait for `document`. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
