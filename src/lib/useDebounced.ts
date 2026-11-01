'use client';

import { useEffect, useState } from 'react';

/** The value, but only after it has stopped changing for `delay` ms - for search boxes that query the API as the user types. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
