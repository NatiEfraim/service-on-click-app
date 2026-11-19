'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedText } from './AnimatedText';
import { Icon } from './Icon';
import { usePresence } from './usePresence';
import { toIso, fromIso, show, presets, monthGrid } from './date-range-utils';
import { useOutsideClose } from './useOutsideClose';
import { useWindowMeasure } from './useWindowMeasure';
import { EASE_IN_OUT, prefersReducedMotion } from '@/lib/motion';

const MONTH = new Intl.DateTimeFormat('he', { month: 'long', year: 'numeric' });
/** Matches .drp-pop's width in components.css (used to keep the calendar inside the window). */
const CALENDAR_WIDTH = 296;
/** Sunday first, as in Israel. */
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
/** How long a month turn takes, in ms. */
const MONTH_TURN_MS = 320;
/** How long the calendar takes to fade out once closed (a day picked, outside click) - .drp-pop[data-closing] in components.css. */
const CALENDAR_EXIT_MS = 240;

/**
 * Turning the month, as a carousel: the previous month's days (a lifeless copy of them, kept from the last render) and
 * the new month's move together by a whole calendar's width, side by side - the old one out on one side, the new one in
 * from the other - so the two never sit on top of each other; each fades at the edge it crosses. Right to left: the next
 * month comes in from the left. Nothing moves when the calendar opens, nor with reduced motion. `daysRef`: the box of
 * the days (inside a box that clips, styled .drp-days-wrap).
 */
function useMonthSlide(daysRef, month) {
  const shown = useRef(null);
  const copy = useRef(null);
  // the turn playing now (its leaving copy and the two animations), stopped when a newer turn starts
  const playing = useRef(null);
  const key = month.getFullYear() * 12 + month.getMonth();

  const stop = () => {
    if (!playing.current) return;
    playing.current.exit.cancel();
    playing.current.enter.cancel();
    playing.current.old.remove();
    playing.current = null;
  };

  // after every render: a turn starts only when the month shown really changed (a hover re-render leaves it playing)
  useLayoutEffect(() => {
    const days = daysRef.current;
    const before = shown.current;
    const old = copy.current;
    // a copy of the days as they look now, for the next turn
    copy.current = days ? days.cloneNode(true) : null;
    shown.current = days ? key : null;
    if (!days || before === null || before === key || !old || prefersReducedMotion()) return;
    stop();
    // a whole width (plus a little air): the two months travel side by side and never overlap
    const shift = (key > before ? 1 : -1) * (days.offsetWidth + 16);
    old.classList.add('drp-days-old');
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    days.parentElement.appendChild(old);
    const timing = { duration: MONTH_TURN_MS, easing: EASE_IN_OUT };
    const exit = old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${shift}px)` }], { ...timing, fill: 'forwards' });
    const enter = days.animate([{ opacity: 0, transform: `translateX(${-shift}px)` }, { opacity: 1, transform: 'none' }], timing);
    playing.current = { old, exit, enter };
    exit.onfinish = () => old.remove();
  });

  // the calendar closing mid-turn takes the leaving copy with it
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/** One day: the same calendar, a click picks the day and closes. `value` / `onChange` are a 'YYYY-MM-DD' string ('' = none). */
export function DatePicker({ value, onChange, label = 'תאריך', placeholder = 'בחירת תאריך', clearable = true, min, max, isDateDisabled }) {
  return <DateRangePicker single value={{ from: value, to: value }} onChange={(range) => onChange(range.from)} label={label} placeholder={placeholder} clearable={clearable} min={min} max={max} isDateDisabled={isDateDisabled} />;
}

/** Select independent dates in the same calendar, keeping it open between clicks. */
export function MultiDatePicker({ value, onChange, ...props }) {
  return <DateRangePicker {...props} value={{ from: value[0], to: '' }} selectedDays={value} onChange={onChange} />;
}

/**
 * A from-to date picker: a button showing the range opens a Hebrew month calendar (pick the start, then the end) with
 * quick ranges. `value` / `onChange` use { from, to } as 'YYYY-MM-DD' strings ('' = open-ended).
 * `single` (use DatePicker) picks one day instead; `min` / `max` ('YYYY-MM-DD') disable the days outside them.
 */
export function DateRangePicker({ value, onChange, label = 'תאריך', placeholder = 'כל התאריכים', single = false, clearable = true, min, max, isDateDisabled, selectedDays }) {
  const { from, to } = value;
  const multiple = Boolean(selectedDays);
  const [open, setOpen] = useState(false);
  const presence = usePresence(open, CALENDAR_EXIT_MS);
  // while picking: the first click sets the start, the second the end
  const [draftStart, setDraftStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [month, setMonth] = useState(() => (from ? fromIso(from) : new Date()));
  const ref = useRef(null);
  const popRef = useRef(null);
  // the calendar renders in <body> (so no clipping container can hide it) and is placed under its button
  const [place, setPlace] = useState(null);
  const daysRef = useRef(null);
  useMonthSlide(daysRef, month);

  // outside = neither the button area nor the calendar (which lives elsewhere in the page)
  useOutsideClose(open, () => setOpen(false), [ref, popRef]);

  useWindowMeasure(presence.mounted, () => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // the calendar's right edge on the button's right edge (rtl start), kept inside the window
    const right = Math.max(8, window.innerWidth - box.right);
    setPlace({ top: box.bottom + 8, right: Math.min(right, window.innerWidth - CALENDAR_WIDTH - 8) });
  }, []);

  const toggle = () => {
    if (!open) {
      setDraftStart(null);
      setMonth(from ? fromIso(from) : new Date());
    }
    setOpen(!open);
  };

  const pickDay = (iso) => {
    if (isDateDisabled?.(iso)) return;
    if (multiple) {
      onChange(selectedDays.includes(iso) ? selectedDays.filter((day) => day !== iso) : [...selectedDays, iso]);
      return;
    }
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

  const hasValue = multiple ? selectedDays.length > 0 : Boolean(from || to);
  const text = multiple ? (selectedDays.length ? `נבחרו ${selectedDays.length} תאריכים` : placeholder) : from && to ? (from === to ? show(from) : `${show(from)} – ${show(to)}`) : from ? `מ-${show(from)}` : to ? `עד ${show(to)}` : placeholder;
  const outside = (iso) => (min && iso < min) || (max && iso > max);

  return (
    <div className="drp" ref={ref}>
      <button type="button" className={`drp-btn${from || to ? ' set' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="calendar" />
        {label ? <span className="drp-label">{label}:</span> : null}
        <AnimatedText>{text}</AnimatedText>
      </button>

      {presence.mounted && place ? createPortal(
        <div
          ref={popRef}
          className="menu drp-pop"
          role="dialog"
          aria-label={label ? `בחירת ${label}` : 'בחירת תאריך'}
          data-closing={presence.closing || undefined}
          style={{ position: 'fixed', top: place.top, right: place.right, left: 'auto' }}
        >
          {single || multiple ? null : (
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
            <b><AnimatedText>{MONTH.format(month)}</AnimatedText></b>
            <button type="button" className="drp-nav" aria-label="החודש הבא" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <Icon name="left" />
            </button>
          </div>
          <div className="drp-grid">
            {WEEKDAYS.map((day) => (
              <span key={day} className="drp-wd">
                {day}
              </span>
            ))}
          </div>
          {/* the days slide and fade when the month turns (useMonthSlide); the weekday names above stay put */}
          <div className="drp-days-wrap">
            <div ref={daysRef} className="drp-grid drp-days" onMouseLeave={() => setHover(null)}>
              {monthGrid(month).map((date) => {
                const iso = toIso(date);
                const inRange = !multiple && rangeFrom && rangeTo && iso >= rangeFrom && iso <= rangeTo;
                const edge = multiple ? selectedDays.includes(iso) : iso === rangeFrom || iso === rangeTo;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={['drp-day', date.getMonth() !== month.getMonth() ? 'out' : '', inRange ? 'in' : '', edge ? 'edge' : '', iso === todayIso ? 'today' : ''].filter(Boolean).join(' ')}
                    aria-label={show(iso)}
                    aria-pressed={multiple ? edge : edge || undefined}
                    disabled={outside(iso) || isDateDisabled?.(iso) || undefined}
                    onMouseEnter={() => setHover(iso)}
                    onClick={() => pickDay(iso)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
          {multiple ? <p className="drp-hint">לחצו על ימים כדי לסמן או לבטל סימון</p> : single ? null : <p className="drp-hint">{draftStart ? `מ-${show(draftStart)}: בחרו את תאריך הסיום` : 'בחרו תאריך התחלה ואז תאריך סיום'}</p>}
          {/* clearing lives inside the calendar (no ✕ beside the button): it empties the dates and closes the calendar */}
          {clearable ? (
            <div className="drp-foot">
              <button
                type="button"
                className="drp-reset"
                disabled={!hasValue && !draftStart}
                onClick={() => {
                  onChange(multiple ? [] : { from: '', to: '' });
                  setDraftStart(null);
                  setOpen(false);
                }}
              >
                ניקוי
              </button>
            </div>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
