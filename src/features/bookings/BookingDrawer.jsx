'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DrawerStepper } from './DrawerStepper';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorNotice, Loading } from '@/components/ui/Feedback';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { Body } from './BookingBody';

/** The fade-out of the booking on screen when stepping to another (matches .drawer-swap.out). */
const SWAP_OUT_MS = 90;

/** One booking in full: route, offered decisions, values, comments, files and timeline. */
export function BookingDrawer({ serial, onClose, onGo }) {
  const [decidedSerial, setDecidedSerial] = useState(null);
  const closing = decidedSerial === serial;
  const query = useQuery({ queryKey: keys.bookingDetail(serial), queryFn: ({ signal }) => bookingsApi.get(serial, signal), staleTime: 5_000, retry: false, enabled: !closing });

  // Stepping to another booking crossfades: the one on screen always gets its whole fade-out (however fast the next
  // one loads, even from the cache), then the next one takes its place and fades in.
  const ready = query.isSuccess ? query.data : null;
  const [shown, setShown] = useState(ready);
  const [leaving, setLeaving] = useState(false);
  const leftAt = useRef(0);
  const switching = shown !== null && shown.serial_number !== serial;
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
    setDecidedSerial(serial);
    onClose();
  };

  if (closing) return null;

  return (
    <Drawer
      label={`קריאה ${serial}`}
      onClose={onClose}
      scrollKey={shown?.serial_number ?? serial}
      tools={<DrawerStepper serial={serial} onGo={onGo} />}
      title={
        <>
          קריאה <span className="serial" style={{ fontSize: 16 }}>{serial}</span>
        </>
      }
    >
      {query.isError ? (
        <ErrorNotice error={query.error} title="לא ניתן להציג את הקריאה." onRetry={() => void query.refetch()} />
      ) : shown === null ? (
        <Loading rows={10} />
      ) : (
        // keyed by the booking shown: a new booking mounts and fades in; the old one fades out first
        <div key={shown.serial_number} className={`drawer-swap${leaving ? ' out' : ''}`} aria-busy={leaving || undefined}>
          <Body booking={shown} onDecision={onDecision} />
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
