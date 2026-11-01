'use client';

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, toApiError } from '@/lib/api/client';
import { settingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

/** The settings of a booking type in a unit stay fresh for a minute: the domains page asks for nine of them at once and the page behind a card reuses its answer. */
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

/**
 * Reload what a change to the settings touches: the settings themselves, and the screens that list the audit log and the
 * traffic with the mobile app (every change is recorded in one and queued in the other).
 */
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

/**
 * What every write on these screens does with a refusal. Returns the error when the dialog should show it itself (422: the server's own
 * Hebrew text, a lost connection, a failure) and null when it was handled here: somebody changed the record first (409) or it is no longer
 * ours to change (403 / 404) - say so once and reload, so the user sees the current state and can try again.
 */
export async function handleWriteError(error: unknown, toast: (message: string, kind?: 'ok' | 'bad' | '') => void, reload: () => Promise<void>): Promise<ApiError | null> {
  const apiError = toApiError(error);
  if (apiError.stale || apiError.denied) {
    toast(apiError.message, 'bad');
    await reload();
    return null;
  }
  return apiError;
}
