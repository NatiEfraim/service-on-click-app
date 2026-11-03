'use client';

import { useLayoutEffect } from 'react';

/**
 * Caps a card so it ends at the bottom of the window (above the page's bottom padding): with `.fit-card` / `.fit-fill`,
 * only the list inside scrolls and the page itself never does. Capping the card (whose top never moves) rather than the
 * list lets the list follow any panel opening above it frame by frame.
 */
export function useFitToWindow(ref, minHeight = 240, enabled = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const page = el.closest('.page');
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const below = page ? parseFloat(getComputedStyle(page).paddingBottom) : 0;
      el.style.maxHeight = `${Math.max(minHeight, window.innerHeight - top - below)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ref, minHeight, enabled]);
}
