'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { domainColor } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { campCommanders, stationsForType } from './stations';
import { useSettingsQuery } from './useSettings';
import './settings.css';

/** One domain: its approval route with whoever holds each station, and the way into its settings. */
function DomainCard({ unitId, bookingTypeId }: { unitId: number; bookingTypeId: number }) {
  const { catalog, typeName, me } = useSession();
  const query = useSettingsQuery(unitId, bookingTypeId);
  const name = typeName(bookingTypeId);

  const managers = query.data?.managers ?? [];
  const admins = campCommanders(managers);
  const stations = query.data ? stationsForType(bookingTypeId, catalog, managers) : [];

  return (
    <section className="card dcard" style={{ '--dc': domainColor(bookingTypeId) } as CSSProperties} aria-label={name}>
      <div className="card-head">
        <DomainBadge bookingTypeId={bookingTypeId} />
        <div>
          <h2>{name}</h2>
          {query.data ? <span className="hint">{admins.length ? `מפקד מחנה: ${admins.join(', ')}` : 'לא שובץ מפקד מחנה'}</span> : null}
        </div>
        {query.data ? (
          <span className="tools">
            <Link className="btn sm ghost" href={`/requests?view=open&types=${bookingTypeId}${me.is_super_admin ? `&units=${unitId}` : ''}`}>
              {query.data.open_count} פתוחות
            </Link>
          </span>
        ) : null}
      </div>

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
        <ol className="steps" aria-label={`שלבי האישור ב${name}`}>
          {stations.map((station) => (
            <li key={station.id} className={station.people.length ? '' : 'none'}>
              <span className="pt" />
              <div>
                <b>{station.label}</b>
                <span>{station.people.length ? station.people.join(', ') : 'לא שובץ בעל תפקיד'}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

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
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { me, catalog, unitName } = useSession();

  const requested = Number(search.get('unit'));
  const unitId = me.is_super_admin && catalog.units.some((unit) => unit.id === requested) ? requested : (me.user.unit_id ?? catalog.units[0]?.id ?? 0);
  const typeIds = me.is_super_admin ? catalog.booking_types.map((type) => type.id) : me.managed_booking_types;

  const setUnit = (id: number) => {
    const next = new URLSearchParams(search.toString());
    next.set('unit', String(id));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

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
              <select className="input" value={unitId} onChange={(event) => setUnit(Number(event.target.value))}>
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />
      {typeIds.length === 0 ? (
        <EmptyState title="אין תחומים בניהולך" />
      ) : (
        <div className="st-domains">
          {typeIds.map((id) => (
            <DomainCard key={`${unitId}-${id}`} unitId={unitId} bookingTypeId={id} />
          ))}
        </div>
      )}
    </>
  );
}
