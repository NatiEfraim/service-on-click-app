'use client';

import { useEffect, useRef } from 'react';
import { MENU_HOVER_CLOSE_MS } from '@/lib/motion';

/** Closes a dropdown on outside click or Escape. */
export function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

/**
 * A mouse opens a dropdown by resting on it; leaving closes it after a short grace, so a slightly wobbly path to an item
 * (or out and straight back) does not shut it. Click and keyboard still toggle it. Spread the result on the dropdown's wrapper.
 */
export function useHoverOpen(setOpen) {
  const leaveTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);
  const hoverable = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return {
    onMouseEnter: () => {
      window.clearTimeout(leaveTimer.current);
      if (hoverable()) setOpen(true);
    },
    onMouseLeave: () => {
      if (!hoverable()) return;
      leaveTimer.current = window.setTimeout(() => setOpen(false), MENU_HOVER_CLOSE_MS);
    },
  };
}
