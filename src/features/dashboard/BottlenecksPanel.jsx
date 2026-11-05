'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { fmtHours } from '@/lib/format';
import { ALL_WINDOW_DAYS, BOTTLENECK_ROWS } from './constants';

/** Load per role holder and handler performance, from `GET /bottlenecks`. */
export function BottlenecksPanel({ types, days }) {
  const params = { types, days };
  const query = useQuery({ queryKey: keys.bottlenecks(params), queryFn: ({ signal }) => insightsApi.bottlenecks(params, signal), staleTime: 60_000 });

  if (query.isPending) {
    return (
      <Card spaced title="עומס על בעלי תפקידים">
        <CardBody>
          <Loading rows={3} />
        </CardBody>
      </Card>
    );
  }
  if (query.isError) {
    return (
      <Card spaced>
        <CardBody>
          <ErrorNotice error={query.error} title="לא ניתן לטעון את העומס על בעלי התפקידים." onRetry={() => void query.refetch()} />
        </CardBody>
      </Card>
    );
  }

  const pools = [...query.data.pools].sort((a, b) => b.per_holder - a.per_holder).slice(0, BOTTLENECK_ROWS);
  const handlers = [...query.data.handlers].sort((a, b) => b.transitions - a.transitions).slice(0, BOTTLENECK_ROWS);
  const widest = Math.max(1, ...pools.map((pool) => pool.per_holder));

  return (
    <div className="grid g-2 mt">
      <Card title="עומס על בעלי תפקידים" hint="קריאות פתוחות לכל בעל תפקיד בשלב">
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
      </Card>

      <Card title="מי טיפל בקריאות" hint={query.data.window_days >= ALL_WINDOW_DAYS ? 'כל התקופה' : `${query.data.window_days} הימים האחרונים`}>
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
      </Card>
    </div>
  );
}
