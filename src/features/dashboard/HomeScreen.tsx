'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { DomainIcon } from '@/components/booking/DomainBadge';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { domainColor, domainIconSrc } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { StageBars, StageColumns } from './StageBars';

/** Matches the .chart-fade transition in screens.css. */
const CHART_FADE_MS = 130;

/** Domains shown as one tile on the home screen (booking type ids); the icon is the first type's. */
const TILE_GROUPS: { name: string; types: number[]; iconType: number }[] = [
  { name: 'רכב', types: [1, 2], iconType: 1 },
  { name: 'ציוד', types: [3, 4], iconType: 3 },
  { name: 'מזון', types: [10, 11], iconType: 10 },
];

/** Icon, name and counts of a domain tile (or of a group, or of one domain inside an opened group). */
function TileBody({ iconType, name, open, overdue }: { iconType: number; name: string; open: number; overdue?: number | null }) {
  return (
    <>
      <span className="dtile-ic">
        {domainIconSrc(iconType) ? (
          // eslint-disable-next-line @next/next/no-img-element -- static svg
          <img src={domainIconSrc(iconType)!} alt="" width={36} height={36} />
        ) : (
          <Icon name="layers" />
        )}
      </span>
      <span className="dtile-name">{name}</span>
      <span className="dtile-meta">
        <b>{open}</b> פתוחות{overdue ? <> · <span className="bad-t">{overdue} חורגות</span></> : null}
      </span>
    </>
  );
}

/** Admin home: domain tiles beside one domain's column chart, then open bookings by domain and stage. */
export function HomeScreen() {
  const router = useRouter();
  const { typeName } = useSession();
  const query = useQuery({ queryKey: keys.home, queryFn: ({ signal }) => insightsApi.home(signal) });
  const [pickedType, setPickedType] = useState<number | null>(null);
  // Drawn once per visit, so the chart does not jump on every refetch.
  const [randomPick] = useState(() => Math.random());
  // The domain whose chart is on screen; trails the pick by the fade-out.
  const [chartType, setChartType] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const pendingType = useRef<number | null>(null);
  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(() => {
      setChartType(pendingType.current);
      setFading(false);
    }, CHART_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [fading]);
  // The home screen fills the window without scrolling: its height runs from where it starts to the window bottom.
  const fitRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const fit = () => node.style.setProperty('--home-top', `${node.getBoundingClientRect().top + window.scrollY}px`);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  if (query.isPending) return <Loading rows={8} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const { domains, by_type_stage: byTypeStage } = query.data;
  const open = domains.reduce((sum, d) => sum + d.open, 0);
  const over = domains.reduce((sum, d) => sum + (d.overdue ?? 0), 0);

  // Until a domain name is clicked, show a random domain that has open bookings.
  const withOpen = Object.keys(byTypeStage).map(Number).filter((type) => Object.values(byTypeStage[type] ?? {}).some((n) => n));
  const shownType = pickedType ?? (withOpen.length ? withOpen[Math.floor(randomPick * withOpen.length)] : null);
  // A new pick first fades the old chart out, then the new one fades in.
  if (shownType !== chartType && !fading) {
    if (chartType === null) setChartType(shownType);
    else setFading(true);
  }
  const shownStages = chartType === null ? {} : byTypeStage[chartType] ?? {};
  pendingType.current = shownType;
  const shownTotal = Object.values(shownStages).reduce((sum: number, n) => sum + (n ?? 0), 0);

  // Related domains share one tile; a group with a single domain present is shown as that domain's own tile.
  type Domain = (typeof domains)[number];
  const tiles: { key: string; name: string; iconType: number; members: Domain[]; open: number; overdue: number }[] = [];
  for (const domain of domains) {
    const group = TILE_GROUPS.find((g) => g.types.includes(domain.booking_type_id));
    const key = group ? group.name : String(domain.booking_type_id);
    let tile = tiles.find((t) => t.key === key);
    if (!tile) {
      tile = { key, name: domain.name, iconType: group?.iconType ?? domain.booking_type_id, members: [], open: 0, overdue: 0 };
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

  return (
    <>
      <PageHead
        title="מסך ראשי"
        sub={`${domains.length} תחומי שירות, ${open} קריאות פתוחות${over ? `, ${over} מהן חורגות מיעד הטיפול` : ''}. בחרו תחום כדי לפתוח את הדשבורד שלו.`}
      />
      <div className="home" ref={fitRef}>
      <div className="home-top">
        <section className="tiles" aria-label="תחומי שירות" style={{ '--per-row': Math.ceil(tiles.length / Math.ceil(tiles.length / 3)), '--rows': Math.ceil(tiles.length / 3) } as CSSProperties}>
          {tiles.map((tile) =>
            tile.members.length === 1 ? (
              <Link key={tile.key} href={`/dashboard?types=${tile.members[0].booking_type_id}`} className="dtile" style={{ '--dc': domainColor(tile.members[0].booking_type_id) } as CSSProperties}>
                <TileBody iconType={tile.members[0].booking_type_id} name={tile.name} open={tile.open} overdue={tile.overdue} />
              </Link>
            ) : (
              // Hover (or focus) opens the group into its domains; each one links to its own dashboard.
              <div key={tile.key} className="dtile dgroup" tabIndex={0} aria-label={`${tile.name}: ${tile.members.map((m) => m.name).join(', ')}`} style={{ '--dc': domainColor(tile.members[0].booking_type_id) } as CSSProperties}>
                <TileBody iconType={tile.iconType} name={tile.name} open={tile.open} overdue={tile.overdue} />
                <span className="dgroup-menu">
                  {tile.members.map((domain) => (
                    <Link key={domain.booking_type_id} href={`/dashboard?types=${domain.booking_type_id}`} className="dgroup-item" style={{ '--dc': domainColor(domain.booking_type_id) } as CSSProperties}>
                      <TileBody iconType={domain.booking_type_id} name={domain.name} open={domain.open} overdue={domain.overdue} />
                    </Link>
                  ))}
                </span>
              </div>
            ),
          )}
        </section>

        <Card
          className="home-card home-chart"
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
          hint="לחיצה על עמודה פותחת את הקריאות"
        >
          <div key={chartType ?? 'none'} className={`chart-fade${fading ? ' out' : ''}`}>
            {chartType === null ? (
              <EmptyState title="אין קריאות פתוחות" />
            ) : (
              <StageColumns stages={shownStages} onPick={(id) => router.push(`/requests?view=open&types=${chartType}&stage=${id}`)} />
            )}
          </div>
        </Card>
      </div>

      <Card className="home-card home-bars" title="קריאות פתוחות לפי תחום ולפי השלב שבו הן נמצאות" hint="לחיצה על שם תחום מציגה את הגרף שלו למעלה, לחיצה על פס פותחת את הקריאות">
        <StageBars byTypeStage={byTypeStage} onPickType={setPickedType} pickedType={shownType} />
      </Card>
      </div>
    </>
  );
}
