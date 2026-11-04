'use client';

import { useLayoutEffect, useRef } from 'react';
import { CONTENT_FADE_MS, EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/**
 * Fades its content in when it mounts (e.g. a screen once its data arrives), with a slight rise.
 * Started from script, so it plays whatever the surrounding CSS does; with reduced motion it only fades.
 */
export function FadeIn({ children, as: Tag = 'div', duration = CONTENT_FADE_MS, ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frames = prefersReducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }];
    const fade = el.animate(frames, { duration, easing: EASE_OUT });
    return () => fade.cancel();
  }, [duration]);

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}
