'use client';

import { useState } from 'react';

/**
 * The keys that were not in the list before its last change: rows that just arrived (after a reload or a filter).
 * Empty on the first render, so a list that loads does not count every row as arriving.
 */
export function useArrivals(keys) {
  const signature = keys.join('|');
  const [seen, setSeen] = useState({ signature: null, keys: null, arrived: new Set() });

  // adjusted during render when the list changes: React re-renders at once with the new set
  if (seen.signature !== signature) {
    const arrived = seen.keys ? new Set(keys.filter((key) => !seen.keys.has(key))) : new Set();
    setSeen({ signature, keys: new Set(keys), arrived });
    return arrived;
  }
  return seen.arrived;
}
