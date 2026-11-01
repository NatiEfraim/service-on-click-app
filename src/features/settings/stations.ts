import { routeFor } from '@/features/bookings/route';
import type { Catalog, SettingsManager, StageId } from '@/lib/api/types';

/** Statuses only a control officer sets (14, 17, 18); a type reaching them has that station. */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];

/** Roles (from `managers[].roles`) that hold each approval-route station. */
const STATION_ROLES: Partial<Record<StageId, string[]>> = {
  control_officer: ['transportation_control_officer'],
  vice_approver: ['vice_approver'],
  approver: ['approver'],
  barber_done: ['vice_approver', 'approver'],
  realization: ['approver'],
};

export interface StationPeople {
  id: StageId;
  label: string;
  /** Full names, in the server's order, each once. */
  people: string[];
}

/** The names of whoever holds one of these roles. */
export function peopleWithRoles(managers: readonly SettingsManager[], roles: readonly string[]): string[] {
  const names = managers.filter((manager) => manager.roles.some((role) => roles.includes(role))).map((manager) => manager.full_name);
  return [...new Set(names)];
}

/** The camp commanders (`admin`) of the type in this unit. */
export function campCommanders(managers: readonly SettingsManager[]): string[] {
  return peopleWithRoles(managers, ['admin']);
}

/** Stations of a booking type with their holders, inferred from its reachable statuses. */
export function stationsForType(bookingTypeId: number, catalog: Pick<Catalog, 'booking_type_statuses'>, managers: readonly SettingsManager[]): StationPeople[] {
  const reachable = catalog.booking_type_statuses?.[String(bookingTypeId)] ?? [];
  const hasControlOfficer = reachable.some((statusId) => CONTROL_OFFICER_STATUSES.includes(statusId));

  // routeFor owns labels and the barber rule; the stage says whether the control officer step applies
  const route = routeFor({ booking_type_id: bookingTypeId, stage: hasControlOfficer ? 'control_officer' : 'vice_approver' }, catalog as Catalog);

  return route.flatMap((station) => {
    const roles = STATION_ROLES[station.id as StageId];
    return roles ? [{ id: station.id as StageId, label: station.label, people: peopleWithRoles(managers, roles) }] : [];
  });
}

/** Whether any station of the type has nobody - the card draws it as a warning. */
export function hasEmptyStation(stations: readonly StationPeople[]): boolean {
  return stations.some((station) => station.people.length === 0);
}
