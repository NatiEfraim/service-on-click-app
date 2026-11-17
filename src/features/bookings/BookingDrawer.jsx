'use client';

import { useQuery } from '@tanstack/react-query';
import { SerialTitle } from '@/components/booking/SerialTitle';
import { useEffect, useRef, useState } from 'react';
import { DrawerStepper } from './DrawerStepper';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorNotice, Loading } from '@/components/ui/Feedback';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { Body } from './BookingBody';
import { isBookingKey } from './useBookingDrawer';

/** The fade-out of the booking on screen when stepping to another (matches .drawer-swap.out). */
const SWAP_OUT_MS = 90;

/**
 * One booking in full: route, offered decisions, values, comments, files and timeline. `bookingKey` is its uuid (or,
 * an older link, its serial number - the API takes both during the transition).
 */
export function BookingDrawer({ bookingKey, onClose, onGo }) {
  const [decidedKey, setDecidedKey] = useState(null);
  const closing = decidedKey === bookingKey;
  const query = useQuery({ queryKey: keys.bookingDetail(bookingKey), queryFn: ({ signal }) => bookingsApi.get(bookingKey, signal), staleTime: 5_000, retry: false, enabled: !closing });

  // Stepping to another booking crossfades: the one on screen always gets its whole fade-out (however fast the next
  // one loads, even from the cache), then the next one takes its place and fades in.
  const ready = query.isSuccess ? query.data : null;
  const [shown, setShown] = useState(ready);
  const [leaving, setLeaving] = useState(false);
  const leftAt = useRef(0);
  const switching = shown !== null && !isBookingKey(shown, bookingKey);
  useEffect(() => {
    if (!switching) {
      // same booking: take its refreshed data as it comes
      if (ready && ready !== shown && (shown === null || ready.serial_number === shown.serial_number)) setShown(ready);
      setLeaving(false);
      return undefined;
    }
    if (!leaving) {
      leftAt.current = performance.now();
      setLeaving(true);
    }
    if (!ready) return undefined;
    const timer = setTimeout(() => {
      setShown(ready);
      setLeaving(false);
    }, Math.max(0, SWAP_OUT_MS - (performance.now() - leftAt.current)));
    return () => clearTimeout(timer);
  }, [switching, ready, shown, leaving]);

  const onDecision = () => {
    setDecidedKey(bookingKey);
    onClose();
  };

  // A booking this panel was showing that is no longer the user's to see (a handler moved it on - from the panel or from
  // its row in the list - so it left their scope): the panel closes instead of showing "cannot show". A booking that was
  // never shown here (a link to one the user may not open) still shows the message.
  const lostAccess = query.isError && Boolean(query.error?.denied) && isBookingKey(shown, bookingKey);
  useEffect(() => {
    if (lostAccess) onDecision();
  }, [lostAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  if (closing) return null;
  // the number in the title: the booking asked for, once known (the key may be its uuid)
  const number = isBookingKey(ready, bookingKey) ? ready.serial_number : isBookingKey(shown, bookingKey) ? shown.serial_number : /^\d+$/.test(bookingKey) ? bookingKey : '';

  return (
    <Drawer
      label={`קריאה ${number}`}
      onClose={onClose}
      scrollKey={shown?.uuid ?? shown?.serial_number ?? bookingKey}
      tools={<DrawerStepper bookingKey={bookingKey} onGo={onGo} />}
      title={
        <>
          <SerialTitle serial={number} />
        </>
      }
    >
      {query.isError ? (
        <ErrorNotice error={query.error} title="לא ניתן להציג את הקריאה." onRetry={() => void query.refetch()} />
      ) : shown === null ? (
        <Loading rows={10} />
      ) : (
        // keyed by the booking shown: a new booking mounts and fades in; the old one fades out first
        <div key={shown.uuid ?? shown.serial_number} className={`drawer-swap${leaving ? ' out' : ''}`} aria-busy={leaving || undefined}>
          <Body booking={shown} />
        </div>
      )}
      {query.isFetching && !query.isPending ? (
        <span className="sr" role="status">
          מרענן…
        </span>
      ) : null}
    </Drawer>
  );
}
