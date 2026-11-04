'use client';

import { useEffect, useState } from 'react';
import { MENU_EXIT_MS, prefersReducedMotion } from '@/lib/motion';

/**
 * Keeps something on screen while it fades out: `mounted` stays true for `exitMs` after `open` turns false,
 * and `closing` is true during that time, so the element can play its exit (`data-closing` in CSS).
 */
export function usePresence(open, exitMs = MENU_EXIT_MS) {
  const [mounted, setMounted] = useState(open);

  // mount at once when opening (adjusted during render)
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, closing: mounted && !open };
}
