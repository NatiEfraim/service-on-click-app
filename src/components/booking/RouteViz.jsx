import { routeFor, routePosition } from '@/features/bookings/route';

import { fmtHours } from '@/lib/format';
import { DEFAULT_WARN_RATIO, targetHoursOr } from '@/lib/targets';

/** The full approval route with the booking's position. */
export function Rail({ booking, catalog, history }) {
  const stations = routeFor(booking, catalog, history);
  const { here, mode } = routePosition(booking, stations);

  return (
    <div className="rail" role="img" aria-label={`מסלול הקריאה: ${booking.stage_label}`}>
      {stations.map((station, index) => {
        const state = index < here ? 'done' : index === here ? mode : '';
        return (
          <div key={station.id} className={`station ${state}`.trim()}>
            <span className="dot" />
            <span className="name">{station.label}</span>
            {index === here ? (
              <span className="sub">
                {mode === 'hold' ? booking.status_label : mode === 'stopped' ? booking.status_label : mode === 'finished' ? 'הושלמה' : fmtHours(booking.stage_age_hours)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The route as a row of dots, for lists. */
export function MiniRoute({ booking, catalog }) {
  const stations = routeFor(booking, catalog);
  const { here, mode } = routePosition(booking, stations);
  const modeClass = { here: 'h', hold: 'hold', stopped: 'stop', finished: 'fin' }[mode];

  return (
    <span className="mr" title={mode === 'hold' ? `${booking.stage_label} · ${booking.status_label}` : booking.stage_label}>
      {stations.map((station, index) => (
        <i key={station.id} className={index < here ? 'd' : index === here ? modeClass : ''} />
      ))}
    </span>
  );
}

export function AgeColumnsHeader() {
  return (
    <div className="age-columns-header">
      <span className="age-columns"><span style={{ gridColumn: '1 / -1', fontSize: 12 }}>בשעות</span><span>בשלב</span><span>סה״כ</span></span>
      <span className="sr">הזמנים מוצגים בשעות</span>
    </div>
  );
}
/** Age against the handling target: green under half of it, yellow from half, red in the last fifth and over it. */
export function AgeBar({ booking }) {
  if (booking.stage === 'closed') return <span className="muted small">סגורה</span>;

  const age = booking.total_age_hours ?? booking.stage_age_hours ?? 0;
  // a domain with no target of its own is measured against the default (48h)
  const target = targetHoursOr(booking.target_hours);
  const ratio = Math.min(1, age / target);
  const overdue = booking.overdue || (booking.target_hours == null && age > target);
  // green while under half the target, yellow from half, red from 80% (the last fifth before the target) and over it
  const tone = overdue ? 'over' : ratio >= DEFAULT_WARN_RATIO ? 'late' : ratio >= 0.5 ? 'near' : '';

  return (
    <div className={`age ${tone}`.trim()} title={`שעות בשלב הנוכחי ושעות מאז שהקריאה נפתחה. הפס: הזמן הכולל מול יעד הטיפול (${target} ש׳${booking.target_hours == null ? ', ברירת מחדל' : ''})`}>
      <span className="age-columns" aria-label={`${Math.round(booking.stage_age_hours ?? 0)} שעות בשלב הנוכחי, ${booking.total_age_hours != null ? Math.round(booking.total_age_hours) : 'לא ידוע'} שעות בסך הכול`}>
        {/* each number says what it is under it, so the row reads without the column heading */}
        <span className="age-cell">
          <span className="v">{Math.round(booking.stage_age_hours ?? 0)} ש׳</span>
          <span className="cap">בשלב</span>
        </span>
        <span className="age-cell">
          <span className="small muted">{booking.total_age_hours != null ? `${Math.round(booking.total_age_hours)} ש׳` : '—'}</span>
          <span className="cap">סה״כ</span>
        </span>
      </span>
      {target && ratio !== null ? (
        <span className="bar">
          <span style={{ width: `${Math.max(4, ratio * 100)}%` }} />
        </span>
      ) : null}
    </div>
  );
}
