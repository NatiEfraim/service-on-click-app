'use client';

import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';

/** A link-looking booking number that opens the booking's side panel - by its uuid when known (else its number). */
export function BookingLink({ serial, uuid }) {
  const drawer = useBookingDrawer();
  if (!serial) return '—';
  return (
    <button type="button" className="linkbtn sync-booking-link" aria-current={drawer.matches({ uuid, serial_number: serial }) || undefined} onClick={(event) => { event.stopPropagation(); drawer.open(uuid ?? serial); }}>
      {serial}
    </button>
  );
}
