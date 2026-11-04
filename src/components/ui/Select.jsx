'use client';

import { SmoothSelect } from './SmoothSelect';

/**
 * The app's select box: every select uses it, so they all share the styled `select.input` look (selects.css).
 * `autoWidth` sizes it to the chosen label and glides when that changes (toolbars, filters); `fadeOnChange` adds a fade.
 */
export function Select({ className = '', autoWidth = false, fadeOnChange = false, children, ...props }) {
  const classes = ['input', ...className.split(' ').filter((name) => name && name !== 'input')].join(' ');
  if (autoWidth || fadeOnChange) {
    return (
      <SmoothSelect className={classes} fadeOnChange={fadeOnChange} {...props}>
        {children}
      </SmoothSelect>
    );
  }
  return (
    <select className={classes} {...props}>
      {children}
    </select>
  );
}
