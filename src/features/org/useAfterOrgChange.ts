'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { keys } from '@/lib/api/keys';
import { useSession } from '@/providers/SessionProvider';

/** Refetch the organisation screen and the shared catalog used by other screens' dropdowns. */
export function useAfterOrgChange(): () => Promise<unknown> {
  const client = useQueryClient();
  const { refreshCatalog } = useSession();
  return useCallback(() => Promise.all([client.invalidateQueries({ queryKey: keys.org }), refreshCatalog()]), [client, refreshCatalog]);
}
