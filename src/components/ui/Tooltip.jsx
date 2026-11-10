'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsClient } from './useIsClient';

/** Hover / focus this long before a hint shows; moving on to the next hinted control within GRACE_MS shows it at once. */
const SHOW_DELAY_MS = 300;
const GRACE_MS = 400;
/** Space kept between the hint and its target, and from the window's edges. */
const GAP = 8;
const EDGE = 8;

/** The nearest element that carries a hint (`data-tip`), unless it is disabled-looking but still wants its hint. */
function hintedFrom(target) {
  const el = target?.closest?.('[data-tip]');
  return el && el.getAttribute('data-tip') ? el : null;
}

/** Place above the pointer on hover or above the control on keyboard focus. */
function place(anchor, tip, point) {
  const a = anchor.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const targetTop = point?.y ?? a.top;
  const targetBottom = point?.y ?? a.bottom;
  const above = targetTop - GAP - t.height >= EDGE;
  const top = above ? targetTop - GAP - t.height : targetBottom + GAP;
  const centre = point?.x ?? (a.left + a.width / 2);
  const left = Math.min(Math.max(centre - t.width / 2, EDGE), window.innerWidth - EDGE - t.width);
  // the arrow keeps pointing at the target even when the hint is pushed in from an edge
  const arrow = Math.min(Math.max(centre - left, 10), t.width - 10);
  return { top, left, above, arrow };
}

/**
 * One hint for the whole console: any element with `data-tip="..."` shows it on hover (after a short pause) and on
 * keyboard focus, in the console's own style. Mounted once (UiProvider). Use it instead of `title=`.
 */
export function TooltipHost() {
  const isClient = useIsClient();
  const id = useId();
  const [hint, setHint] = useState(null); // { anchor, text, keyboard }
  const [spot, setSpot] = useState(null);
  const tipRef = useRef(null);
  const pointer = useRef(null);
  const timer = useRef(0);
  const lastHidden = useRef(0);

  useEffect(() => {
    const show = (anchor, keyboard) => {
      window.clearTimeout(timer.current);
      const recently = performance.now() - lastHidden.current < GRACE_MS;
      const open = () => setHint({ anchor, text: anchor.getAttribute('data-tip'), keyboard });
      if (recently || keyboard) open();
      else timer.current = window.setTimeout(open, SHOW_DELAY_MS);
    };
    const hide = () => {
      window.clearTimeout(timer.current);
      setHint((current) => {
        if (current) lastHidden.current = performance.now();
        return null;
      });
    };

    const onOver = (event) => {
      if (event.pointerType === 'touch') return;
      const anchor = hintedFrom(event.target);
      if (!anchor || anchor === hintedFrom(event.relatedTarget)) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      show(anchor, false);
    };
    const onMove = (event) => {
      if (event.pointerType !== 'touch') pointer.current = { x: event.clientX, y: event.clientY };
    };
    const onOut = (event) => {
      const anchor = hintedFrom(event.target);
      if (anchor && !anchor.contains(event.relatedTarget)) hide();
    };
    const onFocus = (event) => {
      const anchor = hintedFrom(event.target);
      // only keyboard focus: a click also focuses, and the hover already showed the hint
      if (anchor && anchor.matches(':focus-visible')) show(anchor, true);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') hide();
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // measured once it is in the page (its size depends on the text), then placed
  useEffect(() => {
    if (!hint || !tipRef.current) {
      setSpot(null);
      return undefined;
    }
    if (!hint.anchor.isConnected) {
      setHint(null);
      return undefined;
    }
    const reposition = () => {
      if (tipRef.current) setSpot(place(hint.anchor, tipRef.current, hint.keyboard ? null : pointer.current));
    };
    reposition();
    if (!hint.keyboard) document.addEventListener('pointermove', reposition);
    // screen readers hear the hint with the control while it shows
    const anchor = hint.anchor;
    const before = anchor.getAttribute('aria-describedby');
    if (!anchor.hasAttribute('aria-label') || anchor.getAttribute('aria-label') !== hint.text) {
      anchor.setAttribute('aria-describedby', [before, id].filter(Boolean).join(' '));
    }
    return () => {
      if (!hint.keyboard) document.removeEventListener('pointermove', reposition);
      if (before === null) anchor.removeAttribute('aria-describedby');
      else anchor.setAttribute('aria-describedby', before);
    };
  }, [hint, id]);

  if (!isClient || !hint) return null;
  return createPortal(
    <div
      ref={tipRef}
      id={id}
      role="tooltip"
      className={`tip${spot ? (spot.above ? ' above' : ' below') : ''}`}
      style={spot ? { top: spot.top, left: spot.left, '--arrow': `${spot.arrow}px` } : { top: 0, left: 0, visibility: 'hidden' }}
    >
      {hint.text}
    </div>,
    document.body,
  );
}
