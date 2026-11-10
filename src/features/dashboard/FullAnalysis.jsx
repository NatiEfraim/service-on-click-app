'use client';

import { Card, CardBody } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/Feedback';
import { fmtHours, fmtLongHours } from '@/lib/format';
import { DEFAULT_TARGET_HOURS } from '@/lib/targets';
import { STAGE_SHORT, WAIT_LABEL } from '@/lib/labels';
import { BottlenecksPanel } from './BottlenecksPanel';
import { SEVERITY } from './constants';

/** Handling times, outcomes and the per-stage bottleneck table; opened from "לניתוח המלא". */
export function FullAnalysis({ data, ordered, pct, goIds }) {
  return (
    <>
      <Card spaced title="זמני טיפול ותוצאות" hint={`${data.rates.closed} נסגרו בחלון`}>
        <CardBody>
          <dl className="kv" style={{ marginBottom: 14 }}>
            <dt>חציון</dt>
            <dd>
              <b>{fmtLongHours(data.handling.median_hours)}</b>
            </dd>
            <dt>ממוצע</dt>
            <dd>{fmtLongHours(data.handling.avg_hours)}</dd>
            <dt>90% מהקריאות</dt>
            <dd>תוך {fmtLongHours(data.handling.p90_hours)}</dd>
            <dt>יעד התחום</dt>
            <dd>{data.target ? fmtLongHours(data.target.target_hours) : `${fmtLongHours(DEFAULT_TARGET_HOURS)} (ברירת מחדל)`}</dd>
          </dl>
          {data.rates.closed ? (
            (
              [
                ['הסתיימו', data.rates.completed_pct, 'var(--ok)'],
                ['נדחו', data.rates.rejected_pct, 'var(--bad)'],
                ['בוטלו ע"י המבקש', data.rates.canceled_by_user_pct, 'var(--warn)'],
                ['בוטלו ע"י מאשר', data.rates.canceled_by_approver_pct, 'var(--hold)'],
              ]
            ).map(([label, value, color]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 48px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                <span>{label}</span>
                <span className="mbar" style={{ minWidth: 0 }}>
                  <span className="fill" style={{ width: `${value}%`, background: color }} />
                </span>
                <b className="num">{value}%</b>
              </div>
            ))
          ) : (
            <div className="muted">אין קריאות שנסגרו בחלון</div>
          )}
        </CardBody>
      </Card>

      <Card spaced title="צווארי בקבוק: זמן בכל שלב" hint={'הפס מציג את החציון; "חורגות" = קריאות שממתינות בשלב ועברו את יעד הטיפול'}>
        <div className="tbl-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>שלב</th>
                <th>סוג המתנה</th>
                <th className="num">ממתינות</th>
                <th className="num">חורגות</th>
                <th>חציון בשלב</th>
                <th className="num">חציון</th>
                <th className="num">90% עד</th>
                <th className="num">הוותיקה</th>
                <th className="num">חלק מהזמן</th>
                <th>מצב</th>
              </tr>
            </thead>
            <tbody>
              {ordered.length ? (
                ordered.map((stage) => (
                  <tr key={stage.stage} className={stage.open_count ? 'clk' : ''} onClick={() => stage.open_count && goIds(stage.open_booking_ids)}>
                    <td>
                      <b>{STAGE_SHORT[stage.stage]}</b>
                    </td>
                    <td className="small muted">{WAIT_LABEL[stage.wait_kind] ?? ''}</td>
                    <td className="num">
                      <b>{stage.open_count}</b>
                    </td>
                    <td className="num">{stage.breached_open ? <b style={{ color: 'var(--bad)' }}>{stage.breached_open}</b> : (stage.breached_open ?? '—')}</td>
                    <td>
                      <div className="mbar">
                        <span className="fill" style={{ width: pct(stage.median_hours) }} />
                      </div>
                    </td>
                    <td className="num">{fmtHours(stage.median_hours)}</td>
                    <td className="num">{fmtHours(stage.p90_hours)}</td>
                    <td className="num">{fmtHours(stage.oldest_open_hours)}</td>
                    <td className="num">{stage.share_of_lead_time == null ? '—' : `${Math.round(stage.share_of_lead_time * 100)}%`}</td>
                    <td>
                      <Chip tone={SEVERITY[stage.severity].tone}>{SEVERITY[stage.severity].label}</Chip>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10}>
                    <EmptyState title="אין נתונים בחלון" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-foot">{data.definitions}</div>
      </Card>

      <BottlenecksPanel types={data.booking_type_ids} days={data.window_days} />
    </>
  );
}
