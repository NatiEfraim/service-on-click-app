'use client';

import { BookingDrawer } from './BookingDrawer';
import { useBookingDrawer } from './useBookingDrawer';

/** Mounted once in the app frame; shows the drawer when the URL has `?booking=<serial>`. */
export function BookingDrawerHost() {
  const { serial, close } = useBookingDrawer();
  if (serial === null) return null;
  return <BookingDrawer key={serial} serial={serial} onClose={close} />;
}
