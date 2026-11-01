'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Segmented control: a row of toggle buttons, exactly one pressed. */
export function Seg<T extends string>({ options, value, onChange, label }: { options: SegOption<T>[]; value: T; onChange: (value: T) => void; label: string }) {
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
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  return (
    <div className="utabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
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
export function Pager({ page, lastPage, total, noun = 'קריאות', onPage, prevLabel = 'הקודם', nextLabel = 'הבא', hasNext }: {
  page: number;
  lastPage?: number;
  total?: number;
  noun?: string;
  onPage: (page: number) => void;
  prevLabel?: string;
  nextLabel?: string;
  hasNext?: boolean;
}) {
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
