'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { usePresence } from './usePresence';

/** Dates travel as 'YYYY-MM-DD' (what the API's from / to take). */
const pad = (n) => String(n).padStart(2, '0');
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const show = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const MONTH = new Intl.DateTimeFormat('he', { month: 'long', year: 'numeric' });
/** Sunday first, as in Israel. */
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function presets() {
  const today = new Date();
  return [
    { label: 'היום', from: toIso(today), to: toIso(today) },
    { label: '7 ימים', from: toIso(addDays(today, -6)), to: toIso(today) },
    { label: '30 ימים', from: toIso(addDays(today, -29)), to: toIso(today) },
    { label: 'החודש', from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIso(today) },
  ];
}

/** The 6 x 7 days shown for a month, starting on the Sunday on or before its 1st. */
function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * A from-to date picker: a button showing the range opens a Hebrew month calendar (pick the start, then the end) with
 * quick ranges. `value` / `onChange` use { from, to } as 'YYYY-MM-DD' strings ('' = open-ended).
 */
export function DateRangePicker({ value, onChange, label = 'תאריך' }) {
  const { from, to } = value;
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  // while picking: the first click sets the start, the second the end
  const [draftStart, setDraftStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [month, setMonth] = useState(() => (from ? fromIso(from) : new Date()));
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setDraftStart(null);
      setMonth(from ? fromIso(from) : new Date());
    }
    setOpen(!open);
  };

  const pickDay = (iso) => {
    if (!draftStart) {
      setDraftStart(iso);
      return;
    }
    // picked backwards: swap, so from is always the earlier day
    const [start, end] = iso < draftStart ? [iso, draftStart] : [draftStart, iso];
    onChange({ from: start, to: end });
    setDraftStart(null);
    setOpen(false);
  };

  // the range drawn on the calendar: the saved one, or the one being picked (start + hovered day)
  const rangeFrom = draftStart ? (hover && hover < draftStart ? hover : draftStart) : from;
  const rangeTo = draftStart ? (hover && hover > draftStart ? hover : draftStart) : to;
  const todayIso = toIso(new Date());

  const text = from && to ? (from === to ? show(from) : `${show(from)} – ${show(to)}`) : from ? `מ-${show(from)}` : to ? `עד ${show(to)}` : 'כל התאריכים';

  return (
    <div className="drp" ref={ref}>
      <button type="button" className={`drp-btn${from || to ? ' set' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="calendar" />
        <span className="drp-label">{label}:</span>
        <span>{text}</span>
      </button>
      {from || to ? (
        <button type="button" className="drp-clear" aria-label="ניקוי התאריכים" title="ניקוי" onClick={() => onChange({ from: '', to: '' })}>
          <Icon name="x" />
        </button>
      ) : null}

      {presence.mounted ? (
        <div className="menu drp-pop" role="dialog" aria-label={`בחירת ${label}`} data-closing={presence.closing || undefined}>
          <div className="drp-presets">
            {presets().map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={from === preset.from && to === preset.to}
                onClick={() => {
                  onChange({ from: preset.from, to: preset.to });
                  setOpen(false);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="drp-head">
            <button type="button" className="drp-nav" aria-label="החודש הקודם" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <Icon name="right" />
            </button>
            <b>{MONTH.format(month)}</b>
            <button type="button" className="drp-nav" aria-label="החודש הבא" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <Icon name="left" />
            </button>
          </div>
          <div className="drp-grid" onMouseLeave={() => setHover(null)}>
            {WEEKDAYS.map((day) => (
              <span key={day} className="drp-wd">
                {day}
              </span>
            ))}
            {monthGrid(month).map((date) => {
              const iso = toIso(date);
              const inRange = rangeFrom && rangeTo && iso >= rangeFrom && iso <= rangeTo;
              const edge = iso === rangeFrom || iso === rangeTo;
              return (
                <button
                  key={iso}
                  type="button"
                  className={['drp-day', date.getMonth() !== month.getMonth() ? 'out' : '', inRange ? 'in' : '', edge ? 'edge' : '', iso === todayIso ? 'today' : ''].filter(Boolean).join(' ')}
                  aria-label={show(iso)}
                  aria-pressed={edge || undefined}
                  onMouseEnter={() => setHover(iso)}
                  onClick={() => pickDay(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <p className="drp-hint">{draftStart ? `מ-${show(draftStart)}: בחרו את תאריך הסיום` : 'בחרו תאריך התחלה ואז תאריך סיום'}</p>
        </div>
      ) : null}
    </div>
  );
}
