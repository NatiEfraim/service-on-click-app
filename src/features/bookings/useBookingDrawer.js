'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useSetSearchParams } from '@/lib/useSetSearchParams';

/** Drawer state lives in the URL (?booking=<serial>) so it can be linked and closed with Back. */
export function useBookingDrawer() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();

  const raw = search.get('booking');
  const serial = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  const open = useCallback((next) => setParams({ booking: String(next) }, 'push'), [setParams]);
  const close = useCallback(() => setParams({ booking: null }), [setParams]);
  // stepping to another booking in the open drawer: no new history entry, so Back still closes the drawer
  const go = useCallback((next) => setParams({ booking: String(next) }), [setParams]);

  return { serial, open, close, go };
}
