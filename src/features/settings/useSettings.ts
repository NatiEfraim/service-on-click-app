'use client';

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, toApiError } from '@/lib/api/client';
import { settingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

/** Fresh for a minute: the domains page requests many at once and card pages reuse them. */
export const SETTINGS_STALE_MS = 60_000;

export function settingsQueryOptions(unitId: number, bookingTypeId: number) {
  return {
    queryKey: keys.settings(unitId, bookingTypeId),
    queryFn: ({ signal }: { signal: AbortSignal }) => settingsApi.get(unitId, bookingTypeId, signal),
    staleTime: SETTINGS_STALE_MS,
  };
}

export function useSettingsQuery(unitId: number, bookingTypeId: number, enabled = true) {
  return useQuery({ ...settingsQueryOptions(unitId, bookingTypeId), enabled });
}

/** Refetch the settings plus the audit log and mobile-app traffic screens, which every change touches. */
export async function reloadSettings(client: QueryClient, unitId: number, bookingTypeId: number): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: keys.settings(unitId, bookingTypeId) }),
    client.invalidateQueries({ queryKey: keys.auditAll }),
    client.invalidateQueries({ queryKey: keys.sync }),
  ]);
}

export function useReloadSettings(unitId: number, bookingTypeId: number): () => Promise<void> {
  const client = useQueryClient();
  return useCallback(() => reloadSettings(client, unitId, bookingTypeId), [client, unitId, bookingTypeId]);
}

/** Write-error handling: returns errors the dialog shows (422, network); null once handled (409/403/404). */
export async function handleWriteError(error: unknown, toast: (message: string, kind?: 'ok' | 'bad' | '') => void, reload: () => Promise<void>): Promise<ApiError | null> {
  const apiError = toApiError(error);
  if (apiError.stale || apiError.denied) {
    toast(apiError.message, 'bad');
    await reload();
    return null;
  }
  return apiError;
}
