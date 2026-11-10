'use client';

import { useLayoutEffect, useRef } from 'react';
import { Select } from '@/components/ui/Select';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';
import './settings.css';
import { DomainCard } from './DomainCard';
import { DomainsOpenTotal } from './DomainsOpenTotal';

/** Below this the grid scrolls inside itself instead of squeezing the cards further. */
const MIN_GRID_HEIGHT = 420;

/** Service domains of one unit (the system admin picks the unit, everyone else sees their own). */
export function DomainsScreen() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const { me, catalog } = useSession();

  const requested = Number(search.get('unit'));
  const unitId = me.is_super_admin && catalog.units.some((unit) => unit.id === requested) ? requested : (me.user.unit_id ?? catalog.units[0]?.id ?? 0);
  const typeIds = me.is_super_admin ? catalog.booking_types.map((type) => type.id) : me.managed_booking_types;

  const setUnit = (id) => setParams({ unit: String(id) });

  // the grid takes exactly the room left above the footer, so the page itself never scrolls; the rows share it
  const grid = useRef(null);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const fit = () => {
      const page = el.closest('.page');
      const footer = document.querySelector('.app-footer')?.offsetHeight ?? 0;
      const below = (page ? parseFloat(getComputedStyle(page).paddingBottom) : 0) + footer;
      el.style.height = `${Math.max(MIN_GRID_HEIGHT, window.innerHeight - el.getBoundingClientRect().top - window.scrollY - below)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [typeIds.length]);

  if (!unitId) return <EmptyState title="לא נמצאה יחידה" />;

  return (
    <>
      <PageHead
        hideTitle
        title="תחומי שירות"
        actions={
          me.is_super_admin ? (
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
          ) : undefined
        }
      />
      {typeIds.length === 0 ? (
        <EmptyState title="אין תחומים בניהולך" />
      ) : (
        <>
        <DomainsOpenTotal unitId={unitId} typeIds={typeIds} />
        <div ref={grid} className="st-domains st-domains-fit">
          {typeIds.map((id, index) => (
            <DomainCard key={`${unitId}-${id}`} unitId={unitId} bookingTypeId={id} index={index} />
          ))}
        </div>
        </>
      )}
    </>
  );
}
