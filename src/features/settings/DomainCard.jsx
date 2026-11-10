'use client';

import Link from 'next/link';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { domainColor } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { campCommanders, stationsForType } from './stations';
import { useSettingsQuery } from './useSettings';

/** Names shown on a stage's line before "+N". */
const MAX_NAMES = 2;

/** "a, b +3": the first names, then how many more. */
const shortList = (names) => `${names.slice(0, MAX_NAMES).join(', ')}${names.length > MAX_NAMES ? ` +${names.length - MAX_NAMES}` : ''}`;

/** One domain: its approval route with whoever holds each station, and the way into its settings. */
export function DomainCard({ unitId, bookingTypeId, index }) {
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
            <span className="hint" data-tip={admins.join(', ') || undefined}>
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
              <li key={station.id} className={station.people.length ? '' : 'none'} data-tip={station.people.join(', ') || undefined}>
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
