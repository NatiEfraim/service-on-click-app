'use client';

import { useLayoutEffect } from 'react';
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/**
 * Parents unmount an overlay (dialog, side panel) the moment it closes, so there is nothing left to animate.
 * On unmount, a lifeless copy of each part is left in place and plays its exit, whatever closed it.
 *
 * parts: [{ ref, frames, reducedFrames? }] - `frames` are the exit keyframes; `reducedFrames` (default: a fade) for reduced motion.
 * Pass `parts` as a stable array (module constant or useMemo): the refs are read when the overlay mounts.
 */
export function useExitGhost(parts, { duration, easing = EASE_OUT }) {
  useLayoutEffect(() => {
    const nodes = parts.map((part) => ({ ...part, node: part.ref.current }));
    return () => {
      if (typeof window === 'undefined') return;
      const reduce = prefersReducedMotion();
      const ghosts = nodes.filter((part) => part.node).map((part) => ({
        source: part.node,
        frames: reduce ? (part.reducedFrames ?? [{ opacity: 1 }, { opacity: 0 }]) : part.frames,
        ghost: part.node.cloneNode(true),
        // a copy starts scrolled to the top: remember where each scroller was (read now, while still on the page)
        scrolled: [...part.node.querySelectorAll('*')].map((el, index) => [index, el.scrollTop]).filter(([, top]) => top > 0),
      }));
      // Strict Mode (dev) runs this cleanup on an overlay that stays open; only one that really left the page plays its exit
      queueMicrotask(() => {
        for (const { source, frames, ghost, scrolled } of ghosts) {
          if (source.isConnected) continue;
          ghost.setAttribute('aria-hidden', 'true');
          ghost.removeAttribute('role');
          ghost.inert = true;
          ghost.style.pointerEvents = 'none';
          ghost.style.animation = 'none';
          document.body.appendChild(ghost);
          const all = ghost.querySelectorAll('*');
          for (const [index, top] of scrolled) all[index].scrollTop = top;
          ghost.animate(frames, { duration, easing, fill: 'forwards' }).finished.finally(() => ghost.remove());
        }
      });
    };
    // the parts are read once, when the overlay mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
