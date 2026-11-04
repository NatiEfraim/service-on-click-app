'use client';

import { useLayoutEffect, useRef } from 'react';
import { EASE_OUT, prefersReducedMotion, RESIZE_MS } from '@/lib/motion';

/**
 * Wrap anything whose height changes (loading → data, an error appearing, a tab switch, a section opening):
 * whenever the content resizes, the box glides from its old height to the new one instead of jumping.
 * The first render is not animated; with reduced motion the size changes at once.
 */
export function SmoothSize({ children, as: Tag = 'div', ...rest }) {
  const outer = useRef(null);
  const inner = useRef(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let last = content.offsetHeight;
    let running = null;

    const observer = new ResizeObserver(() => {
      const next = content.offsetHeight;
      if (next === last) return;
      // start from wherever a running glide has got to, so quick successive changes stay continuous
      const from = running ? box.getBoundingClientRect().height : last;
      last = next;
      running?.cancel();
      running = null;
      if (reduce.matches || Math.abs(from - next) < 1) return;
      // clipped only while gliding, so focus rings and popovers are never cut otherwise
      running = box.animate([{ height: `${from}px`, overflow: 'clip' }, { height: `${next}px`, overflow: 'clip' }], { duration: RESIZE_MS, easing: EASE_OUT });
      running.onfinish = () => (running = null);
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      running?.cancel();
    };
  }, []);

  return (
    <Tag ref={outer} {...rest}>
      <div ref={inner} style={{ display: 'flow-root' }}>
        {children}
      </div>
    </Tag>
  );
}

/**
 * The same glide for an element that cannot take a wrapper (a flex column whose list scrolls inside it):
 * when `key` changes (e.g. the skeleton gives way to the rows), the element glides from the height it had to its new one.
 */
export function useSmoothHeight(ref, key) {
  const last = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.getBoundingClientRect().height;
    const from = last.current;
    last.current = next;
    if (from === null || Math.abs(from - next) < 1 || prefersReducedMotion()) return;
    const glide = el.animate([{ height: `${from}px`, overflow: 'clip' }, { height: `${next}px`, overflow: 'clip' }], { duration: RESIZE_MS, easing: EASE_OUT });
    return () => glide.cancel();
  }, [ref, key]);
}
