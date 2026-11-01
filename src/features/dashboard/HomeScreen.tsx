'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { DomainIcon } from '@/components/booking/DomainBadge';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { StageId } from '@/lib/api/types';
import { domainColor, domainIconSrc, STAGE_COLOR, STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';

/**
 * The main screen of an admin / super admin: a tile per service domain with its open and over-target counts, and open bookings
 * by domain and stage. A tile opens that domain's dashboard; a bar segment opens the bookings in it.
 */
export function HomeScreen() {
  const router = useRouter();
  const { typeName } = useSession();
  const query = useQuery({ queryKey: keys.home, queryFn: ({ signal }) => insightsApi.home(signal) });

  if (query.isPending) return <Loading rows={8} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const { domains, by_type_stage: byTypeStage } = query.data;
  const open = domains.reduce((sum, d) => sum + d.open, 0);
  const over = domains.reduce((sum, d) => sum + (d.overdue ?? 0), 0);

  const rows = Object.entries(byTypeStage)
    .map(([type, stages]) => ({ type: Number(type), stages, total: Object.values(stages).reduce((sum, n) => sum + (n ?? 0), 0) }))
    .sort((a, b) => b.total - a.total);
  const widest = Math.max(1, ...rows.map((r) => r.total));
  const usedStages = STAGE_ORDER.filter((id) => rows.some((r) => r.stages[id]));

  return (
    <>
      <PageHead
        title="מסך ראשי"
        sub={`${domains.length} תחומי שירות, ${open} קריאות פתוחות${over ? `, ${over} מהן חורגות מיעד הטיפול` : ''}. בחרו תחום כדי לפתוח את הדשבורד שלו.`}
      />
      <section className="tiles" aria-label="תחומי שירות">
        {domains.map((domain) => (
          <Link key={domain.booking_type_id} href={`/dashboard?types=${domain.booking_type_id}`} className="dtile" style={{ '--dc': domainColor(domain.booking_type_id) } as CSSProperties}>
            <span className="dtile-ic">
              {domainIconSrc(domain.booking_type_id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={domainIconSrc(domain.booking_type_id)!} alt="" width={36} height={36} />
              ) : (
                <Icon name="layers" />
              )}
            </span>
            <span className="dtile-name">{domain.name}</span>
            <span className="dtile-meta">
              <b>{domain.open}</b> פתוחות{domain.overdue ? <> · <span className="bad-t">{domain.overdue} חורגות</span></> : null}
            </span>
          </Link>
        ))}
      </section>

      <section className="card mt">
        <div className="card-head">
          <h2>קריאות פתוחות לפי תחום ולפי השלב שבו הן נמצאות</h2>
          <span className="hint">לחיצה על פס פותחת את הקריאות</span>
        </div>
        <div style={{ padding: '8px 0 0' }}>
          {rows.length === 0 ? (
            <EmptyState title="אין קריאות פתוחות" />
          ) : (
            rows.map((row) => (
              <div className="hbar" key={row.type}>
                <span className="lab">
                  <DomainIcon bookingTypeId={row.type} />
                  {typeName(row.type)}
                </span>
                <span className="track" style={{ width: `${Math.max(8, (row.total / widest) * 100)}%` }}>
                  {STAGE_ORDER.filter((id) => row.stages[id]).map((id: StageId) => (
                    <button
                      key={id}
                      type="button"
                      style={{ flex: row.stages[id], background: STAGE_COLOR[id] }}
                      title={`${STAGE_SHORT[id]}: ${row.stages[id]}`}
                      aria-label={`${typeName(row.type)} - ${STAGE_SHORT[id]}: ${row.stages[id]}`}
                      onClick={() => router.push(`/requests?view=open&types=${row.type}&stage=${id}`)}
                    />
                  ))}
                </span>
                <b className="num">{row.total}</b>
              </div>
            ))
          )}
        </div>
        {usedStages.length ? (
          <div className="legend">
            {usedStages.map((id) => (
              <span key={id}>
                <i style={{ background: STAGE_COLOR[id] }} />
                {STAGE_SHORT[id]}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
