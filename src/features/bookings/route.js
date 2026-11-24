import { isHoldStatus } from '@/lib/booking-workflow';
import { hasOwnRoute, routeStatusLabel, routeSteps } from '@/lib/routeTypes';
import { topicHandlerName } from '@/lib/topicTypes';

/** Statuses of the control-officer step (14 handling, 17 approved, 18 rejected) and of the barber (11 approved). */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];
const BARBER_STATUS = 11;
/** Closing statuses that end the route well: completed, approved by the barber, the clearance granted (105). */
const FINISHED_STATUSES = [5, 11, 105];

/** Whether a closing status ends the route well (completed, approved by the barber, the clearance granted). */
export const isFinishedStatus = (statusId) => FINISHED_STATUSES.includes(Number(statusId));

/**
 * The stations of a type with a route of its own (lib/routeTypes): the submission, every step but the last, and the
 * last step (the successful end) as the closing station. Each station is named as the stage its step stands for (the
 * service desk's first step, the sent request, is a stage of its own after the submission), so routePosition finds it.
 */
export function routeStations(steps) {
  const received = { id: 'received', label: 'הוגשה' };
  if (!steps.length) return [received, { id: 'closed', label: 'סגירה' }];
  return [received, ...steps.slice(0, -1).map((step) => ({ id: step.stage ?? step.key, label: step.label })), { id: 'closed', label: steps[steps.length - 1].label }];
}

/** Stations a booking travels through; barber and control-officer steps are derived from catalog and history. */
export function routeFor(booking, catalog, history) {
  // a type with a route of its own: its steps (from the catalog, else the known ones)
  if (hasOwnRoute(booking.booking_type_id, catalog)) return routeStations(routeSteps(booking.booking_type_id, catalog));
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

/**
 * A route type's route as the server's `progress[]` tells it (both details): the stations with the time each was
 * reached (`at`), where the request is and how - `here` on its way, `finished` once the last step is done, `stopped` on
 * a refusal, which then takes the closing station's place after the steps that were reached. The first station is the
 * submission (its own row on the server), so a route whose first step is the sent request (the service desk) still has
 * every station id once. `stopped` names a closing the progress bar does not know (the desk's "closed without doing",
 * the requester's cancellation): the route then ends there, stopped, after the steps that were reached.
 */
export function progressRoute(progress, stopped = null) {
  const rows = Array.isArray(progress) ? progress : [];
  const rejected = rows.find((row) => row.state === 'rejected') ?? (stopped ? { label: stopped, at: null } : null);
  const steps = rows.filter((row) => row.state !== 'rejected');
  const station = (row, index, count) => ({ id: index === 0 ? 'submitted' : index === count - 1 ? 'closed' : row.key, label: row.label, at: row.at ?? null });

  if (rejected) {
    const reached = steps.filter((row) => row.state === 'done' || (stopped && row.state === 'current'));
    const stations = [...reached.map((row, index) => station(row, index, reached.length + 1)), { id: 'closed', label: rejected.label, at: rejected.at ?? null }];
    return { stations, here: stations.length - 1, mode: 'stopped' };
  }

  const stations = steps.map((row, index) => station(row, index, steps.length));
  const current = steps.findIndex((row) => row.state === 'current');
  if (current >= 0) return { stations, here: current, mode: 'here' };
  const finished = steps.length > 0 && steps.every((row) => row.state === 'done');
  return { stations, here: Math.max(0, stations.length - 1), mode: finished ? 'finished' : 'here' };
}

/**
 * The route and the booking's place on it: from the server's progress bar when it has one (route types), its steps
 * named as the type's route names them (lib/routeTypes), else from its stage.
 */
export function bookingRoute(booking, catalog, history) {
  if (Array.isArray(booking.progress) && booking.progress.length) {
    const named = booking.progress.map((row) => ({ ...row, label: (row.status_id != null && routeStatusLabel(row.status_id, booking.booking_type_id, catalog)) || row.label }));
    const stopped = booking.stage === 'closed' && !isFinishedStatus(booking.status_id) ? booking.status_label ?? 'נסגרה' : null;
    return progressRoute(named, stopped);
  }
  const stations = routeFor(booking, catalog, history);
  return { stations, ...routePosition(booking, stations) };
}
