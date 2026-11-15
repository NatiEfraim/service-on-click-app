'use client';

import Link from 'next/link';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { domainColor } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { campCommanders, stationsForType } from './stations';
import { useSettingsQuery } from './useSettings';

/** Names shown on a stage's line before "+N". */
const MAX_NAMES = 2;

/** "a, b +3": the first names, then how many more; the "+3" shows the names it hides (hover or keyboard focus). */
function ShortNames({ names }) {
  const shown = names.slice(0, MAX_NAMES);
  const rest = names.slice(MAX_NAMES);
  return (
    <>
      {shown.join(', ')}
      {rest.length ? (
        <>
          {' '}
          <span className="more-names" tabIndex={0} data-tip={rest.join('\n')} aria-label={`ועוד ${rest.length}: ${rest.join(', ')}`}>
            +{rest.length}
          </span>
        </>
      ) : null}
    </>
  );
}

/** One domain: its approval route with whoever holds each station, and the way into its settings. */
export function DomainCard({ unitId, bookingTypeId, index }) {
  const { catalog, typeName, me } = useSession();
  const query = useSettingsQuery(unitId, bookingTypeId);
  const name = typeName(bookingTypeId);

  const managers = query.data?.managers ?? [];
  const admins = campCommanders(managers);
  // while loading, the same stages with no names yet: the placeholder is the card's final height, so nothing shifts
  const stations = stationsForType(bookingTypeId, catalog, managers);

  return (
    <section className="card dcard dcard-link" style={{ '--dc': domainColor(bookingTypeId), animationDelay: `${index * 40}ms` }} aria-label={name}>
      <div className="card-head">
        <DomainBadge bookingTypeId={bookingTypeId} />
        <div>
          <h2>{name}</h2>
          {query.data ? (
            // two names, then "+N" (its tooltip names the rest), so a long list never runs out of the card
            <span className="hint">
              {admins.length ? <>מפקד מחנה: <ShortNames names={admins} /></> : 'לא שובץ מפקד מחנה'}
            </span>
          ) : query.isPending ? (
            // the line's room is kept while loading (a shimmer), so the head does not grow when it arrives
            <span className="hint"><span className="skel st-skel-inline" style={{ width: 150 }} /></span>
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
          <ol className="st-lines" role="status" aria-label="טוען">
            {stations.map((station, i) => (
              <li key={station.id}>
                <span className="pt" aria-hidden="true" />
                <b>{station.label}</b>
                <span className="skel st-skel-inline" style={{ width: `${70 - i * 12}%` }} />
              </li>
            ))}
          </ol>
        ) : query.isError ? (
          <div className="st-card-msg">
            לא ניתן לטעון את התחום.
            <Button size="sm" onClick={() => void query.refetch()}>
              נסו שוב
            </Button>
          </div>
        ) : (
          // one line a stage: "stage: names" (two names, then "+N"; its tooltip names the rest)
          <ol className="st-lines" aria-label={`שלבי האישור ב${name}`}>
            {stations.map((station) => (
              <li key={station.id} className={station.people.length ? '' : 'none'}>
                <span className="pt" aria-hidden="true" />
                <b>{station.label}</b>
                <span className="names">
                  {station.people.length ? <ShortNames names={station.people} /> : 'לא שובץ בעל תפקיד'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </SmoothSize>

      {/* the card's one link, with no text of its own: stretched over the whole card (CSS), so a click anywhere opens
          the settings; its name is for keyboard and screen-reader users */}
      <Link className="dcard-go" href={`/manage/settings/${unitId}/${bookingTypeId}`} aria-label={`${me.is_super_admin ? 'הגדרות וטופס' : 'הגדרות'}: ${name}`} />
    </section>
  );
}
