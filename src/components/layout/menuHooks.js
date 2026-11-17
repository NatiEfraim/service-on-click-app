'use client';

import { useEffect, useRef } from 'react';
import { MENU_HOVER_CLOSE_MS } from '@/lib/motion';
import { useOutsideClose } from '@/components/ui/useOutsideClose';

/** Closes a dropdown on outside click or Escape (useOutsideClose with the dropdown's own wrapper as "inside"). */
export function useDismiss(open, close) {
  const ref = useRef(null);
  useOutsideClose(open, close, [ref]);
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
