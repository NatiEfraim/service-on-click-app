'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Text that must show in full inside a box of a fixed size (a button that keeps its height): it starts at `max` px and,
 * when it does not fit in `lines` lines, steps its font down by half a pixel until it does (never below `min`). Measured
 * before paint, so it never shows at the wrong size. Lines split evenly. Styles: components.css (.fit-text).
 */
export function FitText({ children, lines = 2, max = 12.5, min = 9.5 }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      let size = max;
      el.style.fontSize = `${size}px`;
      // the height `lines` lines of the current size take (line-height is unitless, so it follows the size)
      const tooTall = () => el.scrollHeight > parseFloat(getComputedStyle(el).lineHeight) * lines + 1;
      while (tooTall() && size > min) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    // measured with a fallback font before the web font arrived: measure again once it has
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
    };
  }, [children, lines, max, min]);

  return (
    <span ref={ref} className="fit-text">
      {children}
    </span>
  );
}
