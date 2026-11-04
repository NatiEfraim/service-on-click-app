'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, toApiError } from '@/lib/api/client';
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

/** Write-error handling: returns errors the dialog shows (422, network); null once handled (409/403/404). */
export async function handleWriteError(error, toast, reload) {
  const apiError = toApiError(error);
  if (apiError.stale || apiError.denied) {
    toast(apiError.message, 'bad');
    await reload();
    return null;
  }
  return apiError;
}
