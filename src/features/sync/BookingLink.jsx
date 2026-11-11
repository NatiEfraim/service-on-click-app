'use client';

import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';

/** A link-looking booking number that opens the booking's side panel. */
export function BookingLink({ serial }) {
  const drawer = useBookingDrawer();
  if (!serial) return '—';
  return (
    <button type="button" className="linkbtn sync-booking-link" aria-current={drawer.serial === Number(serial) || undefined} onClick={(event) => { event.stopPropagation(); drawer.open(serial); }}>
      {serial}
    </button>
  );
}
