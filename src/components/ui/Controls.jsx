'use client';

import { useLayoutEffect, useRef } from 'react';
import { Button } from './Button';

/** The tab underline stops this far short of each side of the tab. */
const TAB_LINE_INSET = 6;



/** Segmented control: a row of toggle buttons, exactly one pressed. */
export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined ? <span className="c">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** WAI-ARIA tabs; arrow keys are mirrored in RTL (left = next). */
export function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef(new Map());

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    let next = -1;
    if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = (index + 1) % tabs.length;
    else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current.get(tabs[next].id)?.focus();
  };

  // the underline is one element that glides to the selected tab
  const listRef = useRef(null);
  const lineRef = useRef(null);
  const tabIds = tabs.map((tab) => tab.id).join('|');
  useLayoutEffect(() => {
    const list = listRef.current;
    const line = lineRef.current;
    const selected = refs.current.get(value);
    if (!list || !line) return;
    const place = () => {
      if (!selected) {
        line.style.opacity = '0';
        return;
      }
      line.style.opacity = '1';
      line.style.width = `${selected.offsetWidth - 2 * TAB_LINE_INSET}px`;
      line.style.transform = `translate(${selected.offsetLeft + TAB_LINE_INSET}px, ${selected.offsetTop + selected.offsetHeight - line.offsetHeight + 1}px)`;
    };
    place();
    // the first placement is instant; moves after that glide
    requestAnimationFrame(() => line.classList.add('ready'));
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [value, tabIds]);

  return (
    <div ref={listRef} className="utabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      <span ref={lineRef} className="utabs-line" aria-hidden="true" />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) refs.current.set(tab.id, el);
            else refs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          tabIndex={tab.id === value ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Previous / next with a page counter; `total` is optional. */
export function Pager({ page, lastPage, total, noun = 'קריאות', onPage, prevLabel = 'הקודם', nextLabel = 'הבא', hasNext }) {
  const canNext = hasNext ?? (lastPage !== undefined && page < lastPage);
  return (
    <div className="pager">
      {total !== undefined ? (
        <span>
          {total} {noun}
        </span>
      ) : null}
      <span className="grow" />
      <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {prevLabel}
      </Button>
      <span>{lastPage ? `עמוד ${page} מתוך ${lastPage}` : `עמוד ${page}`}</span>
      <Button size="sm" disabled={!canNext} onClick={() => onPage(page + 1)}>
        {nextLabel}
      </Button>
    </div>
  );
}
