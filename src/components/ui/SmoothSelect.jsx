'use client';

import { useLayoutEffect, useRef } from 'react';

/** Measure the selected label so intrinsic width changes can animate in pixels. */
export function SmoothSelect({ className = '', children, fadeOnChange = false, ...props }) {
  const ref = useRef(null);
  const previousValue = useRef(props.value);
  useLayoutEffect(() => {
    const changed = previousValue.current !== props.value;
    previousValue.current = props.value;
    if (!changed || !fadeOnChange || !ref.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = ref.current.animate([{ opacity: 1 }, { opacity: 0.3, offset: 0.4 }, { opacity: 1 }], { duration: 280, easing: 'ease-in-out' });
    return () => animation.cancel();
  }, [props.value, fadeOnChange]);

  useLayoutEffect(() => {
    const select = ref.current;
    if (!select || getComputedStyle(select).appearance !== 'base-select') return;
    const style = getComputedStyle(select);
    const measure = document.createElement('span');
    measure.textContent = select.selectedOptions[0]?.textContent ?? '';
    Object.assign(measure.style, {
      position: 'fixed', visibility: 'hidden', whiteSpace: 'pre',
      fontFamily: style.fontFamily, fontSize: style.fontSize,
      fontWeight: style.fontWeight, fontStyle: style.fontStyle,
      letterSpacing: style.letterSpacing,
    });
    document.body.appendChild(measure);
    const textWidth = measure.getBoundingClientRect().width;
    measure.remove();
    const icon = getComputedStyle(select, '::picker-icon');
    const width = Math.ceil(textWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
      + (parseFloat(style.columnGap) || 0) + (parseFloat(icon.width) || 24) + 2);
    if (width > 0 && select.style.width !== `${width}px`) select.style.width = `${width}px`;
  });

  return <select ref={ref} className={`${className} smooth-select`.trim()} {...props}>{children}</select>;
}
