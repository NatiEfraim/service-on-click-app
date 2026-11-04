'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Changes some query parameters of the current page and keeps the rest.
 * `replace` (default) does not add a history entry; `push` does.
 */
export function useSetSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  return useCallback(
    (patch, mode = 'replace') => {
      const next = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, search],
  );
}
