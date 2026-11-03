'use client';

import { useLayoutEffect, useRef } from 'react';

/** Measure the selected label so intrinsic width changes can animate in pixels. */
export function SmoothSelect({ className = '', children, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const select = ref.current;
    if (!select || getComputedStyle(select).appearance !== 'base-select') return;
    const measure = select.cloneNode(true);
    measure.removeAttribute('id');
    measure.removeAttribute('name');
    measure.setAttribute('aria-hidden', 'true');
    measure.inert = true;
    measure.value = select.value;
    Object.assign(measure.style, {
      position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
      width: 'max-content', inlineSize: 'max-content', maxWidth: 'none',
      maxInlineSize: 'none', minWidth: '0', minInlineSize: '0',
      transition: 'none', font: getComputedStyle(select).font,
    });
    document.body.appendChild(measure);
    const width = Math.ceil(measure.getBoundingClientRect().width);
    measure.remove();
    if (width > 0 && select.style.width !== `${width}px`) select.style.width = `${width}px`;
  });

  return <select ref={ref} className={`${className} smooth-select`.trim()} {...props}>{children}</select>;
}
