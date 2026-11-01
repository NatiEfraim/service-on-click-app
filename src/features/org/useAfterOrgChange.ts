'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { keys } from '@/lib/api/keys';
import { useSession } from '@/providers/SessionProvider';

/** After any change to units or departments: the organisation screen is read again, and so is the catalog the dropdowns of other screens use. */
export function useAfterOrgChange(): () => Promise<unknown> {
  const client = useQueryClient();
  const { refreshCatalog } = useSession();
  return useCallback(() => Promise.all([client.invalidateQueries({ queryKey: keys.org }), refreshCatalog()]), [client, refreshCatalog]);
}
