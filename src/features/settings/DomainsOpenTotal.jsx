'use client';

import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from '@/providers/SessionProvider';
import { settingsQueryOptions } from './useSettings';

/**
 * "47 קריאות פתוחות" at the top of the domains page: the open bookings of every domain shown, as a link to them.
 * It reads the same cached settings the cards load (same query keys), so it costs no extra requests.
 */
export function DomainsOpenTotal({ unitId, typeIds }) {
  const { me } = useSession();
  const results = useQueries({ queries: typeIds.map((id) => settingsQueryOptions(unitId, id)) });
  const ready = results.length > 0 && results.every((result) => result.isSuccess);
  const open = results.reduce((sum, result) => sum + (Number(result.data?.open_count) || 0), 0);

  return (
    <div className="st-open-total">
      <Link href={`/requests?view=open&types=${typeIds.join(',')}${me.is_super_admin ? `&units=${unitId}` : ''}`} aria-busy={!ready || undefined}>
        <b>{ready ? open : '…'}</b> קריאות פתוחות
      </Link>
    </div>
  );
}
