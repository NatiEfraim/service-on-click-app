'use client';

import { useQuery } from '@tanstack/react-query';
import { peopleApi } from '@/lib/api/endpoints';

/** The person a row acted on (a user change), looked up once per person and kept; null when it acted on something else. */
export function useTargetPerson(row) {
  const person = row.entity_type === 'user' && row.entity_id && !row.booking_serial ? String(row.entity_id) : null;
  const user = useQuery({
    queryKey: ['audit', 'person', person],
    queryFn: async ({ signal }) => {
      const found = await peopleApi.users(person, 1, signal);
      const list = Array.isArray(found) ? found : (found?.data ?? []);
      // the same number, ignoring leading zeros
      const same = (value) => String(value ?? '').replace(/^0+/, '') === person.replace(/^0+/, '');
      return list.find((candidate) => same(candidate.personal_number)) ?? null;
    },
    enabled: person !== null,
    staleTime: Infinity,
    // many rows can name people at once and the API throttles: try again, spaced out, instead of giving up
    retry: 4,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
  return person
    ? { personalNumber: person, name: user.data?.name ?? null, permissions: user.data?.permissions ?? null, loading: user.isPending, failed: user.isError || (user.isSuccess && user.data === null) }
    : null;
}
