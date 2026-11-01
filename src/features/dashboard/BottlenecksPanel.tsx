'use client';

import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { fmtHours } from '@/lib/format';

const TOP = 8;

/** Load per role holder and handler performance, from `GET /bottlenecks`. */
export function BottlenecksPanel({ types, days }: { types: number[]; days: number }) {
  const params = { types, days };
  const query = useQuery({ queryKey: keys.bottlenecks(params), queryFn: ({ signal }) => insightsApi.bottlenecks(params, signal), staleTime: 60_000 });

  if (query.isPending) {
    return (
      <section className="card mt">
        <div className="card-head">
          <h2>עומס על בעלי תפקידים</h2>
        </div>
        <div className="card-body">
          <Loading rows={3} />
        </div>
      </section>
    );
  }
  if (query.isError) {
    return (
      <section className="card mt">
        <div className="card-body">
          <ErrorNotice error={query.error} title="לא ניתן לטעון את העומס על בעלי התפקידים." onRetry={() => void query.refetch()} />
        </div>
      </section>
    );
  }

  const pools = [...query.data.pools].sort((a, b) => b.per_holder - a.per_holder).slice(0, TOP);
  const handlers = [...query.data.handlers].sort((a, b) => b.transitions - a.transitions).slice(0, TOP);
  const widest = Math.max(1, ...pools.map((pool) => pool.per_holder));

  return (
    <div className="grid g-2 mt">
      <section className="card">
        <div className="card-head">
          <h2>עומס על בעלי תפקידים</h2>
          <span className="hint">קריאות פתוחות לכל בעל תפקיד בשלב</span>
        </div>
        {pools.length ? (
          <div className="tbl-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>תחום</th>
                  <th>שלב / תפקיד</th>
                  <th className="num">פתוחות</th>
                  <th className="num">בעלי תפקיד</th>
                  <th>לכל בעל תפקיד</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <tr key={`${pool.booking_type_id}-${pool.stage}`}>
                    <td>
                      <b>{pool.label}</b>
                    </td>
                    <td className="small">
                      {pool.stage_label}
                      <div className="muted">{pool.role}</div>
                    </td>
                    <td className="num">{pool.open}</td>
                    <td className="num">{pool.holders || <span className="bad-t">אין</span>}</td>
                    <td>
                      <div className="mbar" style={{ minWidth: 90 }}>
                        <span className={`fill${pool.holders === 0 ? ' over' : ''}`} style={{ width: `${Math.max(4, (pool.per_holder / widest) * 100)}%` }} />
                      </div>
                      <span className="small muted">{pool.holders ? pool.per_holder : pool.open} לאדם</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="אין קריאות פתוחות" />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>מי טיפל בקריאות</h2>
          <span className="hint">{query.data.window_days} הימים האחרונים</span>
        </div>
        {handlers.length ? (
          <div className="tbl-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>שם</th>
                  <th className="num">מעברי סטטוס</th>
                  <th className="num">זמן חציוני</th>
                </tr>
              </thead>
              <tbody>
                {handlers.map((handler) => (
                  <tr key={handler.name}>
                    <td>
                      <b>{handler.name}</b>
                    </td>
                    <td className="num">{handler.transitions}</td>
                    <td className="num">{fmtHours(handler.median_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="אין נתוני טיפול בחלון הזמן" />
        )}
        <div className="card-foot">{query.data.definitions}</div>
      </section>
    </div>
  );
}
