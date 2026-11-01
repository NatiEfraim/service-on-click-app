'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * The booking drawer is driven by `?booking=<serial>` so a booking can be linked to, the back button closes it, and any screen
 * can open one without knowing about the drawer. Other query parameters (filters) are left alone.
 */
export function useBookingDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const raw = search.get('booking');
  const serial = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  const open = useCallback(
    (next: number) => {
      const params = new URLSearchParams(search.toString());
      params.set('booking', String(next));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, search],
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(search.toString());
    params.delete('booking');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, search]);

  return { serial, open, close };
}
