'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DomainIcon } from '@/components/booking/DomainBadge';
import { Card } from '@/components/ui/Card';
import { FadeIn } from '@/components/ui/FadeIn';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { domainColor, STAGE_COLOR } from '@/lib/labels';
import { CHART_STAGE_ORDER, chartStageCounts, chartStageLabel } from './constants';
import { useSession } from '@/providers/SessionProvider';
import { StageDonut } from './StageDonut';
import { StageColumns } from './StageBars';
import { GroupTile } from './GroupTile';
import { TileBody } from './TileBody';
import { ICT_TYPES, INFOSEC_TYPES } from '@/lib/topicTypes';

/** Matches the .chart-fade transition in screens.css. */
const CHART_FADE_MS = 130;

/** The whole screen fading in once its data arrives: a rare, whole-page moment, so a little longer than a list. */
const HOME_FADE_MS = 260;

/** Domains shown as one tile on the home screen (booking type ids), with the mobile app's category icon (shirt, car, sandwich). */
const TILE_GROUPS = [
  { name: 'רכב', types: [1, 2], iconType: 1, iconSrc: '/icons/groups/car.svg' },
  { name: 'ציוד', types: [3, 4], iconType: 3, iconSrc: '/icons/groups/equipment.svg' },
  { name: 'מזון', types: [10, 11], iconType: 10, iconSrc: '/icons/groups/food.svg' },
  // the two request topics, all their types in one tile each (lib/topicTypes: תקשוב is 17-25)
  { name: 'ביטחון מידע', types: INFOSEC_TYPES, iconType: 14, iconSrc: '/icons/requester/infosec.svg' },
  { name: 'תקשוב', types: ICT_TYPES, iconType: 17, iconSrc: '/icons/requester/it.svg' },
];

/**
 * A group tile's domains by their sub-group (the API's `group`: הרשאות, התקנות…), in the order of their first domain;
 * one entry when the domains have no sub-group (רכב, ציוד, מזון) or all share one.
 */
function subGroups(members) {
  const byName = new Map();
  for (const domain of [...members].sort((a, b) => a.booking_type_id - b.booking_type_id)) {
    const name = domain.group ?? '';
    if (!byName.has(name)) byName.set(name, { name, members: [] });
    byName.get(name).members.push(domain);
  }
  return [...byName.values()];
}

/**
 * The home data for a domain commander of several domains, built from GET overview (GET admin/home is admin-only on
 * the API): their domains with open bookings, and open bookings per domain and stage. Overdue is not split by domain there.
 */
function homeFromOverview(overview, typeIds, typeName) {
  return {
    domains: typeIds.map((id) => ({ booking_type_id: id, name: typeName(id), open: overview.by_type?.[id] ?? 0, overdue: null })),
    by_type_stage: Object.fromEntries(Object.entries(overview.by_type_stage ?? {}).filter(([type]) => typeIds.includes(Number(type)))),
  };
}

/** Home: domain tiles beside the picked domain's doughnut by stage (domain picker in its head), then its columns by stage. */
export function HomeScreen() {
  const router = useRouter();
  const { me, typeName } = useSession();
  // the system admin and camp commanders read GET admin/home; a domain commander's tiles come from GET overview
  const fullHome = me.is_super_admin || me.is_admin;
  const query = useQuery(
    fullHome
      ? { queryKey: keys.home, queryFn: ({ signal }) => insightsApi.home(signal) }
      : { queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), select: (data) => homeFromOverview(data, me.dashboard_booking_types, typeName) },
  );
  const [pickedType, setPickedType] = useState(null);
  // Drawn once per visit, so the chart does not jump on every refetch.
  const [randomPick] = useState(() => Math.random());
  // The domain whose chart is on screen; trails the pick by the fade-out.
  const [chartType, setChartType] = useState(null);
  const [fading, setFading] = useState(false);
  const pendingType = useRef(null);
  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(() => {
      setChartType(pendingType.current);
      setFading(false);
    }, CHART_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [fading]);
  // The home screen fills the window without scrolling: its height runs from where it starts to the window bottom.
  const fitRef = useCallback((node) => {
    if (!node) return;
    const fit = () => node.style.setProperty('--home-top', `${node.getBoundingClientRect().top + window.scrollY}px`);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  if (query.isPending) return <Loading rows={8} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const { domains, by_type_stage: byTypeStage } = query.data;

  // Until a domain name is clicked, show a random domain that has open bookings.
  const withOpen = Object.keys(byTypeStage).map(Number).filter((type) => Object.values(byTypeStage[type] ?? {}).some((n) => n));
  const shownType = pickedType ?? (withOpen.length ? withOpen[Math.floor(randomPick * withOpen.length)] : null);
  // A new pick first fades the old chart out, then the new one fades in.
  if (shownType !== chartType && !fading) {
    if (chartType === null) setChartType(shownType);
    else setFading(true);
  }
  const shownStages = chartType === null ? {} : chartStageCounts(chartType, byTypeStage[chartType] ?? {});
  pendingType.current = shownType;
  const shownTotal = Object.values(shownStages).reduce((sum, n) => sum + (n ?? 0), 0);

  // Related domains share one tile; a group with a single domain present is shown as that domain's own tile.

  const tiles = [];
  for (const domain of domains) {
    const group = TILE_GROUPS.find((g) => g.types.includes(domain.booking_type_id));
    const key = group ? group.name : String(domain.booking_type_id);
    let tile = tiles.find((t) => t.key === key);
    if (!tile) {
      tile = { key, name: domain.name, iconType: group?.iconType ?? domain.booking_type_id, iconSrc: group?.iconSrc, members: [], open: 0, overdue: 0 };
      tiles.push(tile);
    }
    tile.members.push(domain);
    tile.open += domain.open;
    tile.overdue += domain.overdue ?? 0;
    if (group && tile.members.length > 1) tile.name = group.name;
  }
  // Food takes the barbershop's place (and the barbershop food's).
  const food = tiles.findIndex((t) => t.key === 'מזון');
  const barber = tiles.findIndex((t) => t.members.some((m) => m.booking_type_id === 5));
  if (food >= 0 && barber >= 0) [tiles[food], tiles[barber]] = [tiles[barber], tiles[food]];

  const rows = Math.max(1, Math.ceil(tiles.length / 3));
  const perRow = Math.ceil(tiles.length / rows);
  const expandLastRow = tiles.length === 8;

  // everything appears together, fading in, once the data is here
  return (
    <FadeIn duration={HOME_FADE_MS}>
      <PageHead
        hideTitle
        title="מסך ראשי"
      />
      <div className="home" ref={fitRef}>
      <div className="home-top">
        <section className="tiles stagger" aria-label="תחומי שירות" data-expand-last-row={expandLastRow || undefined} style={{ '--per-row': perRow, '--rows': rows }}>
          {tiles.map((tile, index) =>
            tile.members.length === 1 ? (
              <Link key={tile.key} href={`/dashboard?types=${tile.members[0].booking_type_id}`} className="dtile" style={{ '--dc': domainColor(tile.members[0].booking_type_id), '--i': index }}>
                <TileBody iconType={tile.members[0].booking_type_id} name={tile.name} open={tile.open} overdue={tile.overdue} />
              </Link>
            ) : (
              subGroups(tile.members).length > 1 ? (
                // several sub-groups (תקשוב): a panel under the tile, wide enough to read (GroupTile)
                <GroupTile key={tile.key} tile={tile} subs={subGroups(tile.members)} index={index} />
              ) : (
              // Hover (or focus) opens the group into its domains; each one links to its own dashboard.
              <div key={tile.key} className="dtile dgroup" tabIndex={0} aria-label={`${tile.name}: ${tile.members.map((m) => m.name).join(', ')}`} style={{ '--dc': domainColor(tile.members[0].booking_type_id), '--i': index }}>
                <TileBody iconType={tile.iconType} iconSrc={tile.iconSrc} name={tile.name} open={tile.open} overdue={tile.overdue} />
                <div className="dgroup-menu" data-members={tile.members.length}>
                  {tile.members.map((domain) => (
                    <Link key={domain.booking_type_id} href={`/dashboard?types=${domain.booking_type_id}`} className="dgroup-item" style={{ '--dc': domainColor(domain.booking_type_id) }}>
                      <TileBody iconType={domain.booking_type_id} name={domain.name} open={domain.open} overdue={domain.overdue} />
                    </Link>
                  ))}
                </div>
              </div>
              )
            ),
          )}
        </section>

        <Card
          className="home-card home-chart home-donut"
          title={
            <span key={chartType ?? 'none'} className={`chart-fade${fading ? ' out' : ''}`}>
              {chartType === null ? 'קריאות פתוחות לפי שלב' : (
                <>
                  <DomainIcon bookingTypeId={chartType} />
                  {`${typeName(chartType)}: ${shownTotal} קריאות פתוחות`}
                </>
              )}
            </span>
          }
        >
          <div key={chartType ?? 'none'} className={`chart-fade${fading ? ' out' : ''}`}>
            {chartType === null ? (
              <EmptyState title="אין קריאות פתוחות" />
            ) : (
              <StageDonut stages={shownStages} bookingTypeId={chartType} onPick={(id) => router.push(`/requests?view=open&types=${chartType}&stage=${id}`)} />
            )}
          </div>
        </Card>
      </div>

      <Card
        className="home-card home-chart home-cols"
        title={
          <span key={chartType ?? 'none'} className={`chart-fade${fading ? ' out' : ''}`}>
            {chartType === null ? 'קריאות פתוחות לפי שלב' : (
              <>
                <DomainIcon bookingTypeId={chartType} />
                {`${typeName(chartType)}: ${shownTotal} קריאות פתוחות לפי שלב`}
              </>
            )}
          </span>
        }
        hint="בחירת תחום למטה משנה את שני הגרפים, לחיצה על עמודה פותחת את הקריאות"
      >
        <div className="hcols">
          <div className="hcols-main">
            {/* first in the DOM, so in right-to-left it sits on the right */}
            <div className="legend hcols-legend">
              {CHART_STAGE_ORDER.filter((id) => shownStages[id] > 0).map((id) => (
                <span key={id}>
                  <i style={{ background: STAGE_COLOR[id] }} />
                  {chartStageLabel(id, chartType)}
                </span>
              ))}
            </div>
            <div key={chartType ?? 'none'} className={`chart-fade hcols-chart${fading ? ' out' : ''}`}>
              {chartType === null ? (
                <EmptyState title="אין קריאות פתוחות" />
              ) : (
                <StageColumns stages={shownStages} bookingTypeId={chartType} onPick={(id) => router.push(`/requests?view=open&types=${chartType}&stage=${id}`)} />
              )}
            </div>
          </div>
          <div className="hcols-domains" role="group" aria-label="בחירת תחום">
            {domains.map((domain) => (
              <button
                key={domain.booking_type_id}
                type="button"
                aria-pressed={shownType === domain.booking_type_id}
                onClick={() => setPickedType(domain.booking_type_id)}
              >
                <DomainIcon bookingTypeId={domain.booking_type_id} />
                {domain.name}
              </button>
            ))}
          </div>
        </div>
      </Card>
      </div>
    </FadeIn>
  );
}
