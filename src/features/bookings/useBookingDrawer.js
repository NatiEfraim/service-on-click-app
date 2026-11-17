'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useSetSearchParams } from '@/lib/useSetSearchParams';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The key a booking is opened by: its `uuid` (the management API's key since 2026-11-17). An older link with the serial
 * number still opens (the API takes both during the transition). The serial stays for display and search only.
 */
export const bookingKey = (booking) => (booking?.uuid ? String(booking.uuid) : booking?.serial_number != null ? String(booking.serial_number) : null);

/** Whether `key` (from the address) is this booking: its uuid, or - an older link - its serial number. */
export const isBookingKey = (booking, key) => Boolean(booking && key && (String(booking.uuid ?? '') === key || String(booking.serial_number ?? '') === key));

/** Drawer state lives in the URL (?booking=<uuid>) so it can be linked and closed with Back. */
export function useBookingDrawer() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();

  const raw = search.get('booking');
  // a uuid, or (an older link) a serial number; anything else is not a booking to open
  const key = raw && (UUID.test(raw) || /^\d+$/.test(raw)) ? raw : null;

  const open = useCallback((next) => setParams({ booking: String(next) }, 'push'), [setParams]);
  const close = useCallback(() => setParams({ booking: null }), [setParams]);
  // stepping to another booking in the open drawer: no new history entry, so Back still closes the drawer
  const go = useCallback((next) => setParams({ booking: String(next) }), [setParams]);

  return { key, open, close, go, matches: (booking) => isBookingKey(booking, key) };
}
