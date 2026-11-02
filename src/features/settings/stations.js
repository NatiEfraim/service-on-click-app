import { routeFor } from '@/features/bookings/route';


/** Statuses only a control officer sets (14, 17, 18); a type reaching them has that station. */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];

/** Roles (from `managers[].roles`) that hold each approval-route station. */
const STATION_ROLES = {
  control_officer: ['transportation_control_officer'],
  vice_approver: ['vice_approver'],
  approver: ['approver'],
  barber_done: ['vice_approver', 'approver'],
  realization: ['approver'],
};



/** The names of whoever holds one of these roles. */
export function peopleWithRoles(managers, roles) {
  const names = managers.filter((manager) => manager.roles.some((role) => roles.includes(role))).map((manager) => manager.full_name);
  return [...new Set(names)];
}

/** The camp commanders (`admin`) of the type in this unit. */
export function campCommanders(managers) {
  return peopleWithRoles(managers, ['admin']);
}

/** Stations of a booking type with their holders, inferred from its reachable statuses. */
export function stationsForType(bookingTypeId, catalog, managers) {
  const reachable = catalog.booking_type_statuses?.[String(bookingTypeId)] ?? [];
  const hasControlOfficer = reachable.some((statusId) => CONTROL_OFFICER_STATUSES.includes(statusId));

  // routeFor owns labels and the barber rule; the stage says whether the control officer step applies
  const route = routeFor({ booking_type_id: bookingTypeId, stage: hasControlOfficer ? 'control_officer' : 'vice_approver' }, catalog);

  return route.flatMap((station) => {
    const roles = STATION_ROLES[station.id];
    return roles ? [{ id: station.id, label: station.label, people: peopleWithRoles(managers, roles) }] : [];
  });
}

/** Whether any station of the type has nobody - the card draws it as a warning. */
export function hasEmptyStation(stations) {
  return stations.some((station) => station.people.length === 0);
}
