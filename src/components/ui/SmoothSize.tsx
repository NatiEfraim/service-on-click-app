'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { EASE_OUT, RESIZE_MS } from '@/lib/motion';

/**
 * Wrap anything whose height changes (loading → data, an error appearing, a tab switch, a section opening):
 * whenever the content resizes, the box glides from its old height to the new one instead of jumping.
 * The first render is not animated; with reduced motion the size changes at once.
 */
export function SmoothSize({ children, as: Tag = 'div', ...rest }: { children: ReactNode; className?: string; style?: CSSProperties; as?: ElementType } & HTMLAttributes<HTMLElement>) {
  const outer = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let last = content.offsetHeight;
    let running: Animation | null = null;

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
