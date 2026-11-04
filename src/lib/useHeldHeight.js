'use client';

import { useCallback } from 'react';

/**
 * Keeps a box at the tallest it has been, so its card does not shrink while a row leaves and the next one arrives:
 * the rows below simply move up one place and the newcomer fills the room at the bottom.
 * Returns a ref callback for the box (it attaches whenever the box appears, e.g. after loading).
 */
export function useHeldHeight() {
  return useCallback((el) => {
    if (!el) return;
    let tallest = 0;
    const hold = () => {
      // scrollHeight is the content's own height, so only real growth raises the hold
      const natural = el.scrollHeight;
      if (natural > tallest) {
        tallest = natural;
        el.style.minHeight = `${tallest}px`;
      }
    };
    hold();
    const observer = new ResizeObserver(hold);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
}
