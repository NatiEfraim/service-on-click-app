'use client';

import { useLayoutEffect, useRef } from 'react';
import { EASE_OUT, prefersReducedMotion, RESIZE_MS } from '@/lib/motion';

/**
 * Wrap anything whose height changes (loading → data, an error appearing, a tab switch, a section opening):
 * whenever the content resizes, the box glides from its old height to the new one instead of jumping.
 * The first render is not animated; with reduced motion the size changes at once.
 * Checked right after every render too (before the browser paints), not only by the ResizeObserver, whose callback can
 * come a frame late: a new, taller content would then be painted once at full height before the glide starts.
 * `easing` / `duration`: the glide's curve and length (by default a strong ease-out over RESIZE_MS). A box whose growth a
 * cap cuts short (a card fitted to the window) shows only the start of the glide, so it reads better with an ease-in-out,
 * which starts gently instead of leaping.
 * `paused`: no glide (and no clipping) while true - the size just follows its content. For content that is meant to
 * stand out past its box for a while (an opened row growing apart from its neighbours), which a glide would cut.
 */
/** CSS transitions that already change a box's height smoothly (Reveal's rows, a height / max-height ease). */
const HEIGHT_TRANSITIONS = new Set(['grid-template-rows', 'height', 'max-height']);

/** Whether something inside `content` is gliding its own height right now. */
function growsSmoothly(content) {
  return content.getAnimations({ subtree: true }).some((animation) => HEIGHT_TRANSITIONS.has(animation.transitionProperty));
}

export function SmoothSize({ children, as: Tag = 'div', easing = EASE_OUT, duration = RESIZE_MS, paused = false, ...rest }) {
  const outer = useRef(null);
  const inner = useRef(null);
  // the size check, kept so a render can run it at once (set up by the effect below)
  const check = useRef(null);
  // the latest curve and length, read when a glide starts
  const glide = useRef({ easing, duration, paused });
  glide.current = { easing, duration, paused };

  // after every render, before paint: a content that changed with this render starts its glide in the same frame
  useLayoutEffect(() => {
    check.current?.();
  });

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let last = content.offsetHeight;
    let running = null;

    const onResize = () => {
      const next = content.offsetHeight;
      if (next === last) return;
      // start from wherever a running glide has got to, so quick successive changes stay continuous
      const from = running ? box.getBoundingClientRect().height : last;
      last = next;
      running?.cancel();
      running = null;
      // the content is already gliding its own height (a Reveal unfolding, a box easing its max-height): follow it frame
      // by frame instead of gliding on top - a second glide would restart every frame, chase it and stop with a jump
      if (growsSmoothly(content)) return;
      if (reduce.matches || glide.current.paused || Math.abs(from - next) < 1) return;
      // clipped only while gliding, so focus rings and popovers are never cut otherwise
      running = box.animate([{ height: `${from}px`, overflow: 'clip' }, { height: `${next}px`, overflow: 'clip' }], { duration: glide.current.duration, easing: glide.current.easing });
      running.onfinish = () => (running = null);
    };
    check.current = onResize;
    const observer = new ResizeObserver(onResize);
    observer.observe(content);
    return () => {
      check.current = null;
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
