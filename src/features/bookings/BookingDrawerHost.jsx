'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { bookingsApi } from '@/lib/api/endpoints';
import { BookingDrawer } from './BookingDrawer';
import { useBookingDrawer } from './useBookingDrawer';

/**
 * An older link opened by the booking's number (`?booking=419626`): the booking API is called by uuid only, so the number
 * is first looked up through the list's search by number (`ids=`, the search key the API keeps), and the address is
 * replaced with the booking's uuid - the drawer then loads it by uuid. Not found: "הקריאה לא נמצאה".
 */
function SerialLinkResolver({ serial, onClose, onGo }) {
  const lookup = useQuery({
    queryKey: ['bookings', 'uuid-of', serial],
    queryFn: ({ signal }) => bookingsApi.list({ ids: serial, per_page: 1 }, signal),
    retry: false,
  });
  const uuid = lookup.data?.data?.find((row) => String(row.serial_number) === serial)?.uuid ?? null;
  useEffect(() => {
    if (uuid) onGo(uuid);
  }, [uuid, onGo]);

  const missing = lookup.isError || (lookup.isSuccess && !uuid);
  return (
    <Drawer label={`קריאה ${serial}`} onClose={onClose} title="קריאה">
      {missing ? <EmptyState title="הקריאה לא נמצאה">ייתכן שהיא אינה שייכת לתחומים שלך.</EmptyState> : <Loading rows={6} />}
    </Drawer>
  );
}

/** Mounted once in the app frame; shows the drawer when the URL has `?booking=<uuid>` (an older number link is resolved first). */
export function BookingDrawerHost() {
  const { key, close, go } = useBookingDrawer();
  if (key === null) return null;
  if (/^\d+$/.test(key)) return <SerialLinkResolver key={key} serial={key} onClose={close} onGo={go} />;
  return <BookingDrawer bookingKey={key} onClose={close} onGo={go} />;
}
