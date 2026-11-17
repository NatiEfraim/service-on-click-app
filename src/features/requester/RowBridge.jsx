'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWindowMeasure } from '@/components/ui/useWindowMeasure';

/** How far the strip reaches over the row's own edge: covers the row's corners while they square off (no notch). */
const OVERLAP = 10;

/**
 * Joins the open request's row to the side panel: when the list does not reach the panel (the home, where "הקריאות שלי"
 * is one column of several), a strip in the row's colour fills the room between the row's edge and the panel's, above the
 * dimming, so the row and the panel read as one piece. Follows the row through the panel's opening and on scroll / resize.
 */
export function RowBridge() {
  const [box, setBox] = useState(null);
  // followed frame by frame while the panel slides in (450ms), then on resize / scroll
  useWindowMeasure(true, () => {
    const row = document.querySelector('.rq-row.selected');
    const drawer = document.querySelector('.drawer');
    if (!row || !drawer) return setBox(null);
    const bounds = row.getBoundingClientRect();
    // the panel's inner edge (it sits on the right of the rtl page)
    const edge = drawer.getBoundingClientRect().left;
    const next = edge - bounds.right > 0.5 ? { top: bounds.top, height: bounds.height, left: bounds.right - OVERLAP, width: edge - bounds.right + OVERLAP } : null;
    setBox((previous) => (previous && next && Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next));
  }, [], { followMs: 450 });
  if (!box) return null;
  return createPortal(<div className="rq-row-bridge" style={box} aria-hidden="true" />, document.body);
}
