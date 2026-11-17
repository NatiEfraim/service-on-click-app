'use client';

import { useLayoutEffect } from 'react';

/**
 * While `active`, runs `measure` before the browser paints, and again whenever the window resizes or anything scrolls -
 * for something placed by another element's position on screen (a popup by its button, a copy over a row).
 * `followMs`: also measure every frame for that long after starting, to follow an element that is still moving (a row
 * while the side panel slides in). `observe`: a ref whose element's own size changes also re-measure. `deps`: when to
 * start over (as an effect's dependencies).
 */
export function useWindowMeasure(active, measure, deps, { followMs = 0, observe = null } = {}) {
  useLayoutEffect(() => {
    if (!active) return undefined;
    measure();
    let frame = 0;
    if (followMs > 0) {
      const started = performance.now();
      const follow = () => {
        measure();
        if (performance.now() - started < followMs) frame = requestAnimationFrame(follow);
      };
      frame = requestAnimationFrame(follow);
    }
    const observer = observe ? new ResizeObserver(measure) : null;
    if (observer && observe.current) observer.observe(observe.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller says when to start over
  }, [active, followMs, ...deps]);
}
