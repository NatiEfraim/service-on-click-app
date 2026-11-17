'use client';

import { useEffect, useState } from 'react';
import { StepperNav, useStepKeys } from '@/components/booking/StepperNav';
import { placeInList, useDrawerList } from './drawerList';

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

  useStepKeys(Boolean(place), goPrevious, goNext);

  if (!place) return null;

  return (
    <StepperNav
      index={place.index}
      count={place.count}
      onPrevious={goPrevious}
      onNext={goNext}
      canPrevious={Boolean(place.previous)}
      canNext={Boolean(place.next || place.nextNeedsLoad)}
      loadingNext={waitingForNext}
    />
  );
}
