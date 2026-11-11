'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCatalog, fetchCounters, fetchMyRequests } from './requesterData';

/** Every requester query key starts here, so a new request can refresh them all at once. */
export const REQUESTER_KEY = ['requester'];

/** What the user may open: topics → groups → types, and the categories of "הקריאות שלי". Changes rarely. */
export function useCatalog() {
  return useQuery({ queryKey: [...REQUESTER_KEY, 'catalog'], queryFn: ({ signal }) => fetchCatalog(signal), staleTime: 5 * 60_000 });
}

/** The four home counters, from the server. */
export function useCounters() {
  return useQuery({ queryKey: [...REQUESTER_KEY, 'counters'], queryFn: ({ signal }) => fetchCounters(signal) });
}

/** The user's requests, all of them or one category's (`category` from the catalog's categories). */
export function useMyRequests(category, options = {}) {
  return useQuery({
    queryKey: [...REQUESTER_KEY, 'requests', category?.id ?? 'all'],
    queryFn: ({ signal }) => fetchMyRequests(category?.typeIds ?? null, signal),
    ...options,
  });
}
