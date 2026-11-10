'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { placeInList, useDrawerList } from './drawerList';

/** Typing in a field, or a dialog open above the drawer: the arrow keys are not ours. */
function keysBelongElsewhere(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return true;
  const target = event.target;
  if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="combobox"]')) return true;
  return Boolean(document.querySelector('.modal'));
}

/**
 * "‹ 3 מתוך 47 ›" in the drawer's header: steps to the previous / next booking of the list it was opened from
 * (↑ / ↓ too). At the last loaded row of a paged list, "next" first loads the next page. Hidden when the drawer
 * was not opened from a list.
 */
export function DrawerStepper({ serial, onGo }) {
  const list = useDrawerList();
  const place = placeInList(list, serial);
  const [waitingForNext, setWaitingForNext] = useState(false);

  // the next page arrived: carry on to the booking that was asked for
  useEffect(() => {
    if (waitingForNext && place?.next) {
      setWaitingForNext(false);
      onGo(place.next);
    }
  }, [waitingForNext, place?.next, onGo]);

  const goPrevious = () => {
    if (place?.previous) onGo(place.previous);
  };
  const goNext = () => {
    if (place?.next) onGo(place.next);
    else if (place?.nextNeedsLoad && !waitingForNext) {
      setWaitingForNext(true);
      list.loadMore();
    }
  };

  useEffect(() => {
    if (!place) return undefined;
    const onKey = (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (keysBelongElsewhere(event)) return;
      event.preventDefault();
      if (event.key === 'ArrowUp') goPrevious();
      else goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!place) return null;

  return (
    <nav className="drawer-stepper" aria-label="מעבר בין קריאות">
      <Button size="sm" variant="ghost" icon="right" aria-label="הקריאה הקודמת (חץ למעלה)" title="הקריאה הקודמת (↑)" disabled={!place.previous} onClick={goPrevious} />
      <span className="pos" aria-live="polite">
        {place.index + 1} מתוך {place.count}
      </span>
      <Button
        size="sm"
        variant="ghost"
        icon="left"
        aria-label="הקריאה הבאה (חץ למטה)"
        title="הקריאה הבאה (↓)"
        loading={waitingForNext}
        disabled={!place.next && !place.nextNeedsLoad}
        onClick={goNext}
      />
    </nav>
  );
}
