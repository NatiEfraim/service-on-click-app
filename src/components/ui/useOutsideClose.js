'use client';

import { useEffect, useRef } from 'react';

/**
 * While `open`, calls `close` on a mouse press outside every element in `refs` (e.g. a button area and its popup, which
 * may live elsewhere in the page through a portal), or on Escape. The latest `close` is used, so passing a new function
 * each render does not re-subscribe.
 */
export function useOutsideClose(open, close, refs) {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (refs.some((ref) => ref.current?.contains(event.target))) return;
      latest.current();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') latest.current();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the refs are stable objects
  }, [open]);
}
