'use client';

import { SmoothSelect } from './SmoothSelect';

/**
 * The app's select box: every select uses it, so they all share the styled `select.input` look (selects.css).
 * `autoWidth` sizes it to the chosen label and glides when that changes (toolbars, filters); `fadeOnChange` adds a fade.
 *
 * A list instead of children: `options` (items) drawn with `optionValue` / `optionLabel` (by default an item's `value` ??
 * `id` and its `label` ?? `display_name` ?? `name`; a plain string is both), and `all`: the label of a first, empty choice
 * ("כל התחומים" in a filter).
 */
const valueOf = (item) => (typeof item === 'object' ? item.value ?? item.id : item);
const labelOf = (item) => (typeof item === 'object' ? item.label ?? item.display_name ?? item.name : item);

export function Select({ className = '', autoWidth = false, fadeOnChange = false, options, optionValue = valueOf, optionLabel = labelOf, all, children, ...props }) {
  if (options) {
    children = (
      <>
        {all !== undefined ? <option value="">{all}</option> : null}
        {options.map((item) => {
          const value = optionValue(item);
          return (
            <option key={value} value={value}>
              {optionLabel(item)}
            </option>
          );
        })}
      </>
    );
  }
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
