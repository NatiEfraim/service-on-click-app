'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { Select } from '@/components/ui/Select';
import { useSearchParams } from 'next/navigation';

import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { domainColor } from '@/lib/labels';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';
import { campCommanders, stationsForType } from './stations';
import { useSettingsQuery } from './useSettings';
import './settings.css';

/** Names shown on a stage's line before "+N". */
const MAX_NAMES = 2;
/** Below this the grid scrolls inside itself instead of squeezing the cards further. */
const MIN_GRID_HEIGHT = 420;

/** "a, b +3": the first names, then how many more. */
const shortList = (names) => `${names.slice(0, MAX_NAMES).join(', ')}${names.length > MAX_NAMES ? ` +${names.length - MAX_NAMES}` : ''}`;

/** One domain: its approval route with whoever holds each station, and the way into its settings. */
function DomainCard({ unitId, bookingTypeId, index }) {
  const { catalog, typeName, me } = useSession();
  const query = useSettingsQuery(unitId, bookingTypeId);
  const name = typeName(bookingTypeId);

  const managers = query.data?.managers ?? [];
  const admins = campCommanders(managers);
  const stations = query.data ? stationsForType(bookingTypeId, catalog, managers) : [];

  return (
    <section className="card dcard" style={{ '--dc': domainColor(bookingTypeId), animationDelay: `${index * 40}ms` }} aria-label={name}>
      <div className="card-head">
        <DomainBadge bookingTypeId={bookingTypeId} />
        <div>
          <h2>{name}</h2>
          {query.data ? (
            // two names, then "+N" (the full list is the tooltip), so a long list never runs out of the card
            <span className="hint" title={admins.join(', ') || undefined}>
              {admins.length ? `מפקד מחנה: ${shortList(admins)}` : 'לא שובץ מפקד מחנה'}
            </span>
          ) : null}
        </div>
        {query.data ? (
          <span className="tools">
            <Link className="btn sm ghost" href={`/requests?view=open&types=${bookingTypeId}${me.is_super_admin ? `&units=${unitId}` : ''}`}>
              {query.data.open_count} פתוחות
            </Link>
          </span>
        ) : null}
      </div>

      <SmoothSize className="st-card-body">
        {query.isPending ? (
          <div className="st-card-skel">
            <Loading rows={4} />
          </div>
        ) : query.isError ? (
          <div className="st-card-msg">
            לא ניתן לטעון את התחום.
            <Button size="sm" onClick={() => void query.refetch()}>
              נסו שוב
            </Button>
          </div>
        ) : (
          // one line a stage: "stage: names" (two names, then "+N"; the full list is the line's tooltip)
          <ol className="st-lines" aria-label={`שלבי האישור ב${name}`}>
            {stations.map((station) => (
              <li key={station.id} className={station.people.length ? '' : 'none'} title={station.people.join(', ') || undefined}>
                <span className="pt" aria-hidden="true" />
                <b>{station.label}</b>
                <span className="names">
                  {station.people.length ? shortList(station.people) : 'לא שובץ בעל תפקיד'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </SmoothSize>

      <div className="card-foot">
        <Link className="btn sm primary" href={`/manage/settings/${unitId}/${bookingTypeId}`}>
          <Icon name="sliders" />
          {me.is_super_admin ? 'הגדרות וטופס' : 'הגדרות'}
        </Link>
      </div>
    </section>
  );
}

/** Service domains of one unit (the system admin picks the unit, everyone else sees their own). */
export function DomainsScreen() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const { me, catalog, unitName } = useSession();

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
        title="תחומי שירות"
        sub={`${typeIds.length} תחומים ב${unitName(unitId)}. לכל תחום מוצגים שלבי האישור ומי מאייש כל שלב. ${
          me.is_super_admin ? 'ההגדרות ומבנה הטופס של כל תחום נפתחים מהכרטיס שלו.' : 'ההגדרות של כל תחום נפתחות מהכרטיס שלו.'
        }`}
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
        <div ref={grid} className="st-domains st-domains-fit">
          {typeIds.map((id, index) => (
            <DomainCard key={`${unitId}-${id}`} unitId={unitId} bookingTypeId={id} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
