'use client';

import { useEffect, useLayoutEffect } from 'react';
import { EASE_IN, EASE_OUT, prefersReducedMotion, ROW_ARRIVE_MS, ROW_COLLAPSE_MS, ROW_SLIDE_MS, ROW_STAMP_MS } from '@/lib/motion';

/** The leave sequence: stamp, slide out, collapse (timings in lib/motion). */
export function useLeave(ref, outcome) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !outcome) return;
    const reduce = prefersReducedMotion();
    let cancelled = false;
    const running = [];
    // approved leaves to the right, rejected / cancelled to the left
    // a short push (not the row's full width, which reads long and fast on a wide screen)
    const away = outcome === 'ok' ? '48px' : '-48px';
    const timer = window.setTimeout(async () => {
      const slide = el.animate(
        reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${away})` }],
        { duration: ROW_SLIDE_MS, easing: EASE_IN, fill: 'forwards' },
      );
      running.push(slide);
      await slide.finished.catch(() => {});
      if (cancelled) return;
      // the rows below glide up into the freed space
      const style = getComputedStyle(el);
      el.style.overflow = 'hidden';
      running.push(
        el.animate(
          [
            { height: `${el.offsetHeight}px`, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, borderBottomWidth: style.borderBottomWidth },
            { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' },
          ],
          { duration: reduce ? 0 : ROW_COLLAPSE_MS, easing: EASE_OUT, fill: 'forwards' },
        ),
      );
    }, ROW_STAMP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const left = running.length > 0;
      for (const animation of running) animation.cancel();
      el.style.overflow = '';
      // still in the list after the reload (e.g. approved but still open): it comes back the way a new row arrives
      if (left && el.isConnected) playArrive(el);
    };
  }, [ref, outcome]);
}

/** The arrive sequence, the leave one in reverse: the row opens its room (the rows below glide down), then fades in. */
export function playArrive(el) {
  if (prefersReducedMotion()) {
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ROW_ARRIVE_MS, easing: EASE_OUT });
    return () => fade.cancel();
  }
  const style = getComputedStyle(el);
  const open = el.animate(
    [
      { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px', opacity: 0, overflow: 'hidden' },
      { height: `${el.offsetHeight}px`, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, borderBottomWidth: style.borderBottomWidth, opacity: 0, overflow: 'hidden' },
    ],
    { duration: ROW_COLLAPSE_MS, easing: EASE_OUT },
  );
  const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ROW_ARRIVE_MS, delay: ROW_COLLAPSE_MS, easing: EASE_OUT, fill: 'backwards' });
  return () => {
    open.cancel();
    fade.cancel();
  };
}

/** Plays the arrive sequence once, when the row mounts as an arrival. */
export function useArrive(ref, entering) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !entering) return;
    return playArrive(el);
    // only when the row mounts as an arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
