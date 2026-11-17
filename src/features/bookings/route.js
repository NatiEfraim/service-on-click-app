





import { isHoldStatus } from '@/lib/booking-workflow';
import { topicHandlerName } from '@/lib/topicTypes';

/** Statuses of the control-officer step (14 handling, 17 approved, 18 rejected) and of the barber (11 approved). */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];
const BARBER_STATUS = 11;
/** Closing statuses that end the route well: completed, approved by the barber. */
const FINISHED_STATUSES = [5, 11];

/** Stations a booking travels through; barber and control-officer steps are derived from catalog and history. */
export function routeFor(booking, catalog, history) {
  // ביטחון מידע / תקשוב: no approval route - one handler decides, then the request is carried out and closed
  const handler = topicHandlerName(booking.booking_type_id);
  if (handler) {
    return [
      { id: 'received', label: 'התקבלה' },
      { id: 'handler', label: handler },
      { id: 'realization', label: 'מימוש' },
      { id: 'closed', label: 'סגירה' },
    ];
  }
  const reachable = catalog?.booking_type_statuses?.[String(booking.booking_type_id)] ?? [];
  // a barber booking has one step: received, the barber answers, closed
  if (booking.stage === 'barber' || reachable.includes(BARBER_STATUS)) {
    return [
      { id: 'received', label: 'התקבלה' },
      { id: 'barber', label: 'הספר' },
      { id: 'closed', label: 'סגירה' },
    ];
  }
  const hasControlOfficer = booking.stage === 'control_officer' || reachable.some((id) => CONTROL_OFFICER_STATUSES.includes(id)) || (history ?? []).some((entry) => CONTROL_OFFICER_STATUSES.includes(entry.status_id));

  return [
    { id: 'received', label: 'התקבלה' },
    ...(hasControlOfficer ? [{ id: 'control_officer', label: 'רמ"ד תו"ב' }] : []),
    { id: 'vice_approver', label: 'גורם מטפל' },
    { id: 'approver', label: 'מפקד תחום' },
    { id: 'realization', label: 'מימוש' },
    { id: 'closed', label: 'סגירה' },
  ];
}

/** Where the booking is on the route: at a station, on hold, stopped, or finished. */
export function routePosition(booking, stations) {
  let here = stations.findIndex((station) => station.id === booking.stage);
  let mode = 'here';

  if (booking.stage.startsWith('supplier')) {
    // Waiting for a supplier or files: the decision stays with the domain commander.
    here = stations.findIndex((station) => station.id === 'approver');
    mode = 'hold';
  }
  // the topics' one handler holds every open stage but the realization (the API still names them by the approval route)
  const handlerAt = stations.findIndex((station) => station.id === 'handler');
  if (handlerAt >= 0 && booking.stage !== 'closed' && booking.stage !== 'realization') here = handlerAt;
  if (isHoldStatus(booking.status_id)) mode = 'hold';
  if (booking.stage === ('closed')) {
    here = stations.length - 1;
    mode = FINISHED_STATUSES.includes(booking.status_id) ? 'finished' : 'stopped';
  }
  return { here: Math.max(0, here), mode };
}
