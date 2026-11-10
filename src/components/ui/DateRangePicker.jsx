'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedText } from './AnimatedText';
import { Icon } from './Icon';
import { usePresence } from './usePresence';
import { toIso, fromIso, show, presets, monthGrid } from './date-range-utils';

const MONTH = new Intl.DateTimeFormat('he', { month: 'long', year: 'numeric' });
/** Matches .drp-pop's width in components.css (used to keep the calendar inside the window). */
const CALENDAR_WIDTH = 296;
/** Sunday first, as in Israel. */
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** One day: the same calendar, a click picks the day and closes. `value` / `onChange` are a 'YYYY-MM-DD' string ('' = none). */
export function DatePicker({ value, onChange, label = 'תאריך', placeholder = 'בחירת תאריך', clearable = true, min, max, isDateDisabled }) {
  return <DateRangePicker single value={{ from: value, to: value }} onChange={(range) => onChange(range.from)} label={label} placeholder={placeholder} clearable={clearable} min={min} max={max} isDateDisabled={isDateDisabled} />;
}

/**
 * A from-to date picker: a button showing the range opens a Hebrew month calendar (pick the start, then the end) with
 * quick ranges. `value` / `onChange` use { from, to } as 'YYYY-MM-DD' strings ('' = open-ended).
 * `single` (use DatePicker) picks one day instead; `min` / `max` ('YYYY-MM-DD') disable the days outside them.
 */
export function DateRangePicker({ value, onChange, label = 'תאריך', placeholder = 'כל התאריכים', single = false, clearable = true, min, max, isDateDisabled }) {
  const { from, to } = value;
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  // while picking: the first click sets the start, the second the end
  const [draftStart, setDraftStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [month, setMonth] = useState(() => (from ? fromIso(from) : new Date()));
  const ref = useRef(null);
  const popRef = useRef(null);
  // the calendar renders in <body> (so no clipping container can hide it) and is placed under its button
  const [place, setPlace] = useState(null);

  useEffect(() => {
    if (!open) return;
    // outside = neither the button area nor the calendar (which lives elsewhere in the page)
    const onPointer = (event) => {
      if (ref.current?.contains(event.target) || popRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!presence.mounted) return;
    const measure = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      // the calendar's right edge on the button's right edge (rtl start), kept inside the window
      const right = Math.max(8, window.innerWidth - box.right);
      setPlace({ top: box.bottom + 8, right: Math.min(right, window.innerWidth - CALENDAR_WIDTH - 8) });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [presence.mounted]);

  const toggle = () => {
    if (!open) {
      setDraftStart(null);
      setMonth(from ? fromIso(from) : new Date());
    }
    setOpen(!open);
  };

  const pickDay = (iso) => {
    if (isDateDisabled?.(iso)) return;
    if (single) {
      onChange({ from: iso, to: iso });
      setOpen(false);
      return;
    }
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

  const clearPresence = usePresence(Boolean(clearable && (from || to)), 220);
  const text = from && to ? (from === to ? show(from) : `${show(from)} – ${show(to)}`) : from ? `מ-${show(from)}` : to ? `עד ${show(to)}` : placeholder;
  const outside = (iso) => (min && iso < min) || (max && iso > max);

  return (
    <div className="drp" ref={ref}>
      <button type="button" className={`drp-btn${from || to ? ' set' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="calendar" />
        {label ? <span className="drp-label">{label}:</span> : null}
        <AnimatedText>{text}</AnimatedText>
      </button>
      {clearPresence.mounted ? (
        <button type="button" className="drp-clear" data-closing={clearPresence.closing || undefined} disabled={clearPresence.closing} aria-label="ניקוי התאריכים" data-tip="ניקוי" onClick={() => onChange({ from: '', to: '' })}>
          <Icon name="x" />
        </button>
      ) : null}

      {presence.mounted && place ? createPortal(
        <div
          ref={popRef}
          className="menu drp-pop"
          role="dialog"
          aria-label={label ? `בחירת ${label}` : 'בחירת תאריך'}
          data-closing={presence.closing || undefined}
          style={{ position: 'fixed', top: place.top, right: place.right, left: 'auto' }}
        >
          {single ? null : (
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
          )}
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
                  disabled={outside(iso) || isDateDisabled?.(iso) || undefined}
                  onMouseEnter={() => setHover(iso)}
                  onClick={() => pickDay(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          {single ? null : <p className="drp-hint">{draftStart ? `מ-${show(draftStart)}: בחרו את תאריך הסיום` : 'בחרו תאריך התחלה ואז תאריך סיום'}</p>}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
