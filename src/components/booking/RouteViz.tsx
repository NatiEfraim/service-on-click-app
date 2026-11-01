import { routeFor, routePosition } from '@/features/bookings/route';
import type { BookingRow, Catalog, HistoryEntry } from '@/lib/api/types';
import { fmtHours } from '@/lib/format';

/** The full approval route with the booking's position - the drawer's "מסלול האישור". */
export function Rail({ booking, catalog, history }: { booking: BookingRow; catalog: Catalog; history?: HistoryEntry[] }) {
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
                {mode === 'hold' ? booking.stage_label : mode === 'stopped' ? booking.status_label : mode === 'finished' ? 'הושלמה' : fmtHours(booking.stage_age_hours)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** A row of dots - the route at a glance, for lists. */
export function MiniRoute({ booking, catalog }: { booking: BookingRow; catalog: Catalog }) {
  const stations = routeFor(booking, catalog);
  const { here, mode } = routePosition(booking, stations);
  const modeClass = { here: 'h', hold: 'hold', stopped: 'stop', finished: 'fin' }[mode];

  return (
    <span className="mr" title={booking.stage_label}>
      {stations.map((station, index) => (
        <i key={station.id} className={index < here ? 'd' : index === here ? modeClass : ''} />
      ))}
    </span>
  );
}

/** Age since opening against the domain's handling target; red when it is over, amber when it is close. */
export function AgeBar({ booking }: { booking: Pick<BookingRow, 'stage' | 'total_age_hours' | 'stage_age_hours' | 'target_hours' | 'overdue'> }) {
  if (booking.stage === 'closed') return <span className="muted small">סגורה</span>;

  const age = booking.total_age_hours ?? booking.stage_age_hours ?? 0;
  const target = booking.target_hours;
  const ratio = target ? Math.min(1, age / target) : null;
  const tone = booking.overdue ? 'over' : target && ratio !== null && ratio > 0.8 ? 'near' : '';

  return (
    <div className={`age ${tone}`.trim()} title={`זמן מפתיחת הקריאה${target ? ' מול יעד הטיפול של התחום' : ''}`}>
      <span className="v">
        {fmtHours(age)}
        {target ? <span className="muted"> מתוך {fmtHours(target)}</span> : null}
      </span>
      {target && ratio !== null ? (
        <span className="bar">
          <span style={{ width: `${Math.max(4, ratio * 100)}%` }} />
        </span>
      ) : null}
    </div>
  );
}
