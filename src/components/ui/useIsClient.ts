'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False while the server renders and during hydration, true afterwards. Lets a portal wait for `document`. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
