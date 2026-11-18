'use client';

import { Select } from '@/components/ui/Select';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';
import './settings.css';
import { DomainCard } from './DomainCard';
import { DomainsOpenTotal } from './DomainsOpenTotal';

/** Service domains of one unit (the system admin picks the unit, everyone else sees their own). */
export function DomainsScreen() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const { me, catalog } = useSession();

  const requested = Number(search.get('unit'));
  const unitId = me.is_super_admin && catalog.units.some((unit) => unit.id === requested) ? requested : (me.user.unit_id ?? catalog.units[0]?.id ?? 0);
  // the super admin edits every domain; the owner of a route type (lib/routeTypes) reads the ones they own
  const typeIds = me.is_super_admin ? catalog.booking_types.map((type) => type.id) : (me.route_owner_booking_types ?? []);

  const setUnit = (id) => setParams({ unit: String(id) });

  if (!unitId) return <EmptyState title="לא נמצאה יחידה" />;

  return (
    <>
      <PageHead hideTitle title="תחומי שירות" />
      {typeIds.length > 0 || me.is_super_admin ? (
        <div className="st-domains-toolbar">
          {typeIds.length > 0 ? <DomainsOpenTotal unitId={unitId} typeIds={typeIds} /> : null}
          {me.is_super_admin ? (
            <label className="st-unit">
              יחידה
              <Select className="input" value={unitId} onChange={(event) => setUnit(Number(event.target.value))}>
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
      ) : null}
      {typeIds.length === 0 ? (
        <EmptyState title="אין תחומים בניהולך" />
      ) : (
        <div className="st-domains">
          {typeIds.map((id, index) => (
            <DomainCard key={`${unitId}-${id}`} unitId={unitId} bookingTypeId={id} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
