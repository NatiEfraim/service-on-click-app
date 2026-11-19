

/** React Query keys, in one place so a write can invalidate exactly what it changed. */
export const keys = {
  me: ['me'],
  catalog: ['catalog'],

  bookings: ['bookings'],
  bookingList: (params) => ['bookings', 'list', params],
  bookingDetail: (serial) => ['bookings', 'detail', serial],
  bookingSearch: (q) => ['bookings', 'search', q],
  /** Who may be assigned a route-type request (refreshed with every booking write). */
  handlerCandidates: (uuid) => ['bookings', 'handler-candidates', uuid],

  overview: ['overview'],
  home: ['home'],
  domainDashboard: (params) => ['domain-dashboard', params],
  bottlenecks: (params) => ['bottlenecks', params],
  reports: (params) => ['reports', params],
  targets: ['targets'],

  settings: (unitId, bookingTypeId) => ['settings', unitId, bookingTypeId],
  settingsAll: ['settings'],

  users: (query, page) => ['users', query, page],
  usersAll: ['users'],
  person: (uuid) => ['users', 'person', uuid],
  approvers: (query) => ['approvers', query],
  approversAll: ['approvers'],
  /** Everyone holding a role, all pages, as the users screen shows them. */
  roleHolders: ['approvers', 'role-holders'],
  admins: (query) => ['admins', query],
  permissions: (kind, uuid) => ['permissions', kind, uuid],
  permissionsAll: ['permissions'],

  org: ['org'],
  audit: (params) => ['audit', 'list', params],
  auditAll: ['audit'],
  auditVerify: ['audit', 'verify'],
  sync: ['sync'],
  syncFile: (id) => ['sync', 'file', id],
};

/** Invalidates everything showing booking counts, ages or history; `me` and `catalog` are kept. */
export function invalidateWork(client) {
  return Promise.all([
    client.invalidateQueries({ queryKey: keys.bookings }),
    client.invalidateQueries({ queryKey: keys.overview }),
    client.invalidateQueries({ queryKey: keys.home }),
    client.invalidateQueries({ queryKey: ['domain-dashboard'] }),
    client.invalidateQueries({ queryKey: ['bottlenecks'] }),
    client.invalidateQueries({ queryKey: ['reports'] }),
    client.invalidateQueries({ queryKey: keys.sync }),
    client.invalidateQueries({ queryKey: keys.auditAll }),
  ]);
}
