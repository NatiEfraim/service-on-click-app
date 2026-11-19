'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { RollingDigits } from './RollingDigits';
import { usePresence } from './usePresence';
import { timeParts, timeValue } from './time-picker-utils';

const pad = (value) => String(value).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimeColumn({ label, values, value, onChange }) {
  function navigate(event) {
    const steps = { ArrowDown: 3, ArrowUp: -3, ArrowRight: 1, ArrowLeft: -1 };
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else if (event.key in steps) next = Math.max(0, Math.min(values.length - 1, value + steps[event.key]));
    else return;
    event.preventDefault();
    onChange(next);
    event.currentTarget.querySelector('[data-number="' + next + '"]')?.focus();
  }
  return <div className="tp-column">
    <span className="tp-column-label">{label}</span>
    <div className="tp-grid" dir="ltr" role="radiogroup" aria-label={label} onKeyDown={navigate}>
      {values.map((number) => <button type="button" key={number} role="radio" aria-checked={number === value} aria-label={label + ' ' + pad(number)} tabIndex={number === value ? 0 : -1} data-number={number} onClick={() => onChange(number)}>{pad(number)}</button>)}
    </div>
  </div>;
}

/** A 24-hour picker using the same portal, colors and enter/exit behavior as the date picker. */
export function TimePicker({ value, onChange, label = 'שעה', disabled = false, invalid = false, title }) {
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  const [draft, setDraft] = useState(() => timeParts(value));
  const [place, setPlace] = useState(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const focused = useRef(false);
  const id = useId();
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useLayoutEffect(() => {
    if (!presence.mounted) return;
    const position = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(304, window.innerWidth - 16);
      const height = popup.current?.offsetHeight || 370;
      const below = box.bottom + 8;
      setPlace({ left: Math.max(8, Math.min(box.right - width, window.innerWidth - width - 8)), top: below + height <= window.innerHeight - 8 ? below : Math.max(8, box.top - height - 8), width });
    };
    position();
    const frame = requestAnimationFrame(position);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [presence.mounted]);

  useEffect(() => {
    if (!open || !place || focused.current) return;
    focused.current = true;
    popup.current?.querySelector('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
    popup.current?.querySelectorAll('[aria-checked="true"]').forEach((el) => {
      const grid = el.parentElement;
      grid.scrollTop = Math.max(0, el.offsetTop - grid.offsetTop - grid.clientHeight / 2 + el.offsetHeight / 2);
    });
  }, [open, place]);

  function keyboard(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    if (event.key !== 'Tab') return;
    const items = [...popup.current.querySelectorAll('button:not([disabled])')].filter((el) => el.tabIndex >= 0);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <>
    <button ref={trigger} type="button" className="input tp-trigger" disabled={disabled} data-invalid={invalid || undefined} data-tip={title} aria-label={label + ': ' + (value ? timeValue(timeParts(value).hour, timeParts(value).minute) : 'בחירת שעה')} aria-haspopup="dialog" aria-expanded={open} aria-controls={presence.mounted ? id : undefined} onClick={() => {
      if (!open) { setDraft(timeParts(value)); focused.current = false; }
      setOpen(!open);
    }}>
      <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span dir="ltr">{value ? timeValue(timeParts(value).hour, timeParts(value).minute) : 'בחירת שעה'}</span>
    </button>
    {presence.mounted && place ? createPortal(
      <div ref={popup} id={id} role="dialog" aria-label={'בחירת ' + label} className="menu tp-popup" data-closing={presence.closing || undefined} inert={presence.closing || undefined} onKeyDown={keyboard} style={{ position: 'fixed', ...place, right: 'auto' }}>
        <header className="tp-head"><span>{label}</span><strong dir="ltr" aria-live="polite"><RollingDigits value={timeValue(draft.hour, draft.minute)} /></strong><small>תצוגת 24 שעות</small></header>
        <div className="tp-columns" dir="ltr">
          <TimeColumn label="שעות" values={HOURS} value={draft.hour} onChange={(hour) => setDraft((current) => ({ ...current, hour }))} />
          <TimeColumn label="דקות" values={MINUTES} value={draft.minute} onChange={(minute) => setDraft((current) => ({ ...current, minute }))} />
        </div>
        <footer className="tp-footer"><Button variant="primary" onClick={() => { onChange(timeValue(draft.hour, draft.minute)); close(true); }}>בחירת שעה</Button><Button onClick={() => close(true)}>ביטול</Button></footer>
      </div>, document.body,
    ) : null}
  </>;
}
