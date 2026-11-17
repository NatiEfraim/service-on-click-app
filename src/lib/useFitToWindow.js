'use client';

import { useLayoutEffect } from 'react';

/**
 * Caps a card so it ends at the bottom of the window (above the page's bottom padding): with `.fit-card` / `.fit-fill`,
 * only the list inside scrolls and the page itself never does. Capping the card (whose top never moves) rather than the
 * list lets the list follow any panel opening above it frame by frame.
 * Measured again when the window resizes and whenever the page's layout changes (something above the card loading late
 * - counters, a notice - moves the card's top; a cap measured before that would let the card run past the window and
 * push the footer away). Only the card's top counts, so the card's own growing never changes the cap (no loop).
 * `fill`: the card always takes that whole height, not only up to it - its size then never changes with its content
 * (a list switching to a short or empty one does not make the card jump).
 */
export function useFitToWindow(ref, minHeight = 240, enabled = true, { fill = false } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    const page = el.closest('.page');
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      // the page's bottom padding and the footer that closes every page
      const footer = document.querySelector('.app-footer')?.offsetHeight ?? 0;
      const below = (page ? parseFloat(getComputedStyle(page).paddingBottom) : 0) + footer;
      const next = `${Math.max(minHeight, window.innerHeight - top - below)}px`;
      if (el.style.maxHeight !== next) el.style.maxHeight = next;
      if (fill && el.style.height !== next) el.style.height = next;
    };
    fit();
    let frame = 0;
    const refit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    window.addEventListener('resize', refit);
    const observer = new ResizeObserver(refit);
    observer.observe(page ?? document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', refit);
      observer.disconnect();
      if (fill) el.style.height = '';
    };
  }, [ref, minHeight, enabled, fill]);
}
