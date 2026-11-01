import type { BookingRow, Catalog, HistoryEntry, StageId } from '@/lib/api/types';

export interface Station {
  id: string;
  label: string;
}

export type RouteMode = 'here' | 'hold' | 'stopped' | 'finished';

/** Statuses of the control-officer step (14 handling, 17 approved, 18 rejected) and of the barber (11 done). */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];
const BARBER_STATUS = 11;

/** Stations a booking travels through; barber and control-officer steps are derived from catalog and history. */
export function routeFor(booking: Pick<BookingRow, 'booking_type_id' | 'stage'>, catalog: Catalog | undefined, history?: HistoryEntry[]): Station[] {
  const reachable = catalog?.booking_type_statuses?.[String(booking.booking_type_id)] ?? [];
  const hasBarber = booking.stage === 'barber_done' || reachable.includes(BARBER_STATUS);
  const hasControlOfficer = booking.stage === 'control_officer' || (history ?? []).some((entry) => CONTROL_OFFICER_STATUSES.includes(entry.status_id));

  return [
    { id: 'received', label: 'התקבלה' },
    ...(hasControlOfficer ? [{ id: 'control_officer', label: 'רמ"ד תו"ב' }] : []),
    { id: 'vice_approver', label: 'גורם מטפל' },
    { id: 'approver', label: 'מפקד תחום' },
    ...(hasBarber ? [{ id: 'barber_done', label: 'הספר' }] : []),
    { id: 'realization', label: 'מימוש' },
    { id: 'closed', label: 'סגירה' },
  ];
}

/** Where the booking is on the route: at a station, on hold, stopped, or finished. */
export function routePosition(booking: Pick<BookingRow, 'stage' | 'status_id'>, stations: Station[]): { here: number; mode: RouteMode } {
  let here = stations.findIndex((station) => station.id === booking.stage);
  let mode: RouteMode = 'here';

  if (booking.stage.startsWith('supplier')) {
    // Waiting for a supplier or files: the decision stays with the domain commander.
    here = stations.findIndex((station) => station.id === 'approver');
    mode = 'hold';
  }
  if (booking.stage === ('closed' satisfies StageId)) {
    here = stations.length - 1;
    mode = booking.status_id === 5 ? 'finished' : 'stopped';
  }
  return { here: Math.max(0, here), mode };
}
