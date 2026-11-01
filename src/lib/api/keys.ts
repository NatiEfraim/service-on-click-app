import type { QueryClient } from '@tanstack/react-query';

/** React Query keys, in one place so a write can invalidate exactly what it changed. */
export const keys = {
  me: ['me'] as const,
  catalog: ['catalog'] as const,

  bookings: ['bookings'] as const,
  bookingList: (params: object) => ['bookings', 'list', params] as const,
  bookingDetail: (serial: number) => ['bookings', 'detail', serial] as const,
  bookingSearch: (q: string) => ['bookings', 'search', q] as const,

  overview: ['overview'] as const,
  home: ['home'] as const,
  domainDashboard: (params: object) => ['domain-dashboard', params] as const,
  bottlenecks: (params: object) => ['bottlenecks', params] as const,
  reports: (params: object) => ['reports', params] as const,
  targets: ['targets'] as const,

  settings: (unitId: number, bookingTypeId: number) => ['settings', unitId, bookingTypeId] as const,
  settingsAll: ['settings'] as const,

  users: (query: string, page: number) => ['users', query, page] as const,
  usersAll: ['users'] as const,
  /** One person's full record (unit, department, every permission) - found through the users search. */
  person: (uuid: string) => ['users', 'person', uuid] as const,
  approvers: (query: string) => ['approvers', query] as const,
  approversAll: ['approvers'] as const,
  /** Everybody holding a role (approvers + vice approvers [+ admins for the super admin]), all pages, as the users screen shows them. */
  roleHolders: ['approvers', 'role-holders'] as const,
  admins: (query: string) => ['admins', query] as const,
  permissions: (kind: 'approver' | 'admin', uuid: string) => ['permissions', kind, uuid] as const,
  permissionsAll: ['permissions'] as const,

  org: ['org'] as const,
  audit: (params: object) => ['audit', 'list', params] as const,
  auditAll: ['audit'] as const,
  auditVerify: ['audit', 'verify'] as const,
  sync: ['sync'] as const,
  syncFile: (id: number) => ['sync', 'file', id] as const,
};

/**
 * After a decision, a corrected value or a configuration change: everything that shows booking counts, ages or history is stale.
 * `me` and `catalog` stay (they only change through `refreshCatalog`).
 */
export function invalidateWork(client: QueryClient): Promise<unknown> {
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
