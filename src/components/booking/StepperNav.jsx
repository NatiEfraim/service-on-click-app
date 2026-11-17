'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

/** Typing in a field, or a dialog open above the drawer: the arrow keys are not ours. */
function keysBelongElsewhere(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return true;
  const target = event.target;
  if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="combobox"]')) return true;
  return Boolean(document.querySelector('.modal'));
}

/** ↑ / ↓ step to the previous / next item while `active` (unless the keys belong to a field or a dialog above). */
export function useStepKeys(active, onPrevious, onNext) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (keysBelongElsewhere(event)) return;
      event.preventDefault();
      if (event.key === 'ArrowUp') onPrevious();
      else onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

/**
 * "‹ 3 מתוך 47 ›" in a booking drawer's header (management and requester alike): the place in the list and the two
 * steps. `loadingNext`: the next step is waiting for the next page.
 */
export function StepperNav({ index, count, onPrevious, onNext, canPrevious, canNext, loadingNext = false }) {
  return (
    <nav className="drawer-stepper" aria-label="מעבר בין קריאות">
      <Button size="sm" variant="ghost" icon="right" aria-label="הקריאה הקודמת (חץ למעלה)" data-tip="הקריאה הקודמת (↑)" disabled={!canPrevious} onClick={onPrevious} />
      <span className="pos" aria-live="polite">
        {index + 1} מתוך {count}
      </span>
      <Button
        size="sm"
        variant="ghost"
        icon="left"
        aria-label="הקריאה הבאה (חץ למטה)"
        data-tip="הקריאה הבאה (↓)"
        loading={loadingNext}
        disabled={!canNext}
        onClick={onNext}
      />
    </nav>
  );
}
