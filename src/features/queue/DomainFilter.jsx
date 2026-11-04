'use client';

import { DomainIcon } from '@/components/booking/DomainBadge';
import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/providers/SessionProvider';
import { useSetSearchParams } from '@/lib/useSetSearchParams';

/**
 * A handler's domains as buttons (icon + name): one filters "the bookings for me" to that domain (?types=<id>),
 * pressing it again shows every domain. The API's booking list takes `types`, so nothing new is needed there.
 */
export function DomainFilter({ picked }) {
  const { me, typeName } = useSession();
  const setParams = useSetSearchParams();
  const domains = me.managed_booking_types;
  if (domains.length < 2) return null;

  return (
    <div className="domain-filter" role="group" aria-label="סינון לפי תחום">
      {/* the default: every domain */}
      <button type="button" className="domain-pick" aria-pressed={picked === null} onClick={() => setParams({ types: null })}>
        <Icon name="layers" />
        כל התחומים
      </button>
      {domains.map((id) => (
        <button key={id} type="button" className="domain-pick" aria-pressed={picked === id} onClick={() => setParams({ types: picked === id ? null : String(id) })}>
          <DomainIcon bookingTypeId={id} />
          {typeName(id)}
        </button>
      ))}
    </div>
  );
}
