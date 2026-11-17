'use client';

/**
 * Content that folds open and closed smoothly: its height glides between 0 and its own (grid rows 0fr ↔ 1fr) and,
 * unless `fade` is false, it fades with it. It stays mounted so it can close smoothly too, and is inert (no focus, no
 * screen reader) while closed. Its open state shows as the class "open" and the attribute data-open, so a caller's own
 * class (`className`) can fine-tune it - timing, padding, flex - in its feature's CSS. `innerClassName` is for the content
 * box (the one that clips). Styles: components.css (.reveal).
 */
export function Reveal({ open, className = '', innerClassName = '', fade = true, id, children }) {
  return (
    <div
      id={id}
      className={`reveal${open ? ' open' : ''}${fade ? ' fade' : ''}${className ? ` ${className}` : ''}`}
      data-open={open ? '' : undefined}
      inert={!open}
    >
      <div className={`reveal-inner${innerClassName ? ` ${innerClassName}` : ''}`}>{children}</div>
    </div>
  );
}
