'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { settingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

/** Fresh for a minute: the domains page requests many at once and card pages reuse them. */
export const SETTINGS_STALE_MS = 60_000;

export function settingsQueryOptions(unitId, bookingTypeId) {
  return {
    queryKey: keys.settings(unitId, bookingTypeId),
    queryFn: ({ signal }) => settingsApi.get(unitId, bookingTypeId, signal),
    staleTime: SETTINGS_STALE_MS,
  };
}

export function useSettingsQuery(unitId, bookingTypeId, enabled = true) {
  return useQuery({ ...settingsQueryOptions(unitId, bookingTypeId), enabled });
}

/** Refetch the settings plus the audit log and mobile-app traffic screens, which every change touches. */
export async function reloadSettings(client, unitId, bookingTypeId) {
  await Promise.all([
    client.invalidateQueries({ queryKey: keys.settings(unitId, bookingTypeId) }),
    client.invalidateQueries({ queryKey: keys.auditAll }),
    client.invalidateQueries({ queryKey: keys.sync }),
  ]);
}

export function useReloadSettings(unitId, bookingTypeId) {
  const client = useQueryClient();
  return useCallback(() => reloadSettings(client, unitId, bookingTypeId), [client, unitId, bookingTypeId]);
}

/** The console's one write-error handling (lib/useSaveMutation), kept importable from here for the settings screens. */
export { handleWriteError } from '@/lib/useSaveMutation';
