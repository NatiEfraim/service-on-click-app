'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * A list to pick one item from, with one highlight that slides to the chosen item (the first placement does not animate).
 * `items`: [{ id, label, meta? }]; `meta` shows small on the far side (a count). `className` sizes and places the list.
 */
export function SideNav({ items, currentId, onSelect, label, className = '' }) {
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const button = navRef.current?.querySelector('[aria-current="true"]');
    if (!button) return;
    const top = button.offsetTop;
    const height = button.offsetHeight;
    // unchanged position keeps the same state, so a new `items` array each render cannot loop
    setIndicator((prev) => (prev && prev.top === top && prev.height === height ? prev : { top, height, instant: !prev }));
  }, [currentId, items]);

  return (
    <nav ref={navRef} className={`side-nav${className ? ` ${className}` : ''}`} aria-label={label}>
      {indicator ? (
        <span aria-hidden className={`side-nav-ind${indicator.instant ? ' instant' : ''}`} style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }} />
      ) : null}
      {items.map((item) => (
        <button key={item.id} type="button" aria-current={item.id === currentId ? 'true' : undefined} onClick={() => onSelect(item.id)}>
          <span className="path">{item.label}</span>
          {item.meta != null ? <span className="n">{item.meta}</span> : null}
        </button>
      ))}
    </nav>
  );
}
