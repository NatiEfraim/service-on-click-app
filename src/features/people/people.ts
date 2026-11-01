/** One person shape merged from `GET /users`, `get-approvers` (no unit) and `get-admins` (name only). */
import type { AdminRow, ApproverRow, AppUser } from '@/lib/api/types';
import { grantsFromApprover, grantsFromPermissionNames, type RoleGrant } from './permissions';

/** `PaginationEnum::PER_PAGE`: the lists of people come 20 to a page, with no total. */
export const PAGE_SIZE = 20;

export interface PersonRow {
  uuid: string;
  name: string | null;
  personalNumber: string | null;
  personalId: string | null;
  phone: string | null;
  /** Only the full user list says where a person sits. */
  affiliation: { unitName: string | null; departmentName: string | null } | null;
  isSuperAdmin: boolean;
  grants: RoleGrant[];
}

export function personFromUser(user: AppUser): PersonRow {
  return {
    uuid: user.uuid,
    name: user.name,
    personalNumber: user.personal_number,
    personalId: user.personal_id,
    phone: user.phone,
    affiliation: { unitName: user.unit_name, departmentName: user.department_name },
    isSuperAdmin: user.roles.some((role) => role.name === 'super_admin'),
    grants: grantsFromPermissionNames(user.permissions.map((permission) => permission.name)),
  };
}

/** The camp commanders come from `get-admins` without their domains. */
function adminGrant(): RoleGrant {
  return { role: 'admin', bookingTypeIds: null };
}

const NAME_COLLATOR = new Intl.Collator('he');

/** Hebrew alphabetical; people without a name last. */
export function compareByName(a: Pick<PersonRow, 'name'>, b: Pick<PersonRow, 'name'>): number {
  if (!a.name && !b.name) return 0;
  if (!a.name) return 1;
  if (!b.name) return -1;
  return NAME_COLLATOR.compare(a.name, b.name);
}

/** Approvers and vice approvers, plus (for the super admin) the camp commanders - one row per person. */
export function mergeRoleHolders(approvers: readonly ApproverRow[], admins: readonly AdminRow[]): PersonRow[] {
  const people = new Map<string, PersonRow>();

  for (const row of approvers) {
    people.set(row.uuid, {
      uuid: row.uuid,
      name: row.full_name,
      personalNumber: row.personal_number,
      personalId: null,
      phone: row.phone,
      affiliation: null,
      isSuperAdmin: false,
      grants: grantsFromApprover(row),
    });
  }

  for (const row of admins) {
    const existing = people.get(row.uuid);
    if (existing) {
      if (!existing.grants.some((grant) => grant.role === 'admin')) existing.grants = [adminGrant(), ...existing.grants];
    } else {
      people.set(row.uuid, {
        uuid: row.uuid,
        name: row.full_name,
        personalNumber: row.personal_number,
        personalId: null,
        phone: null,
        affiliation: null,
        isSuperAdmin: false,
        grants: [adminGrant()],
      });
    }
  }

  return [...people.values()].sort(compareByName);
}

/** Reads a 20-per-page list with no total until a page is not full (or `maxPages`). */
export async function loadAllPages<T>(
  fetchPage: (page: number) => Promise<readonly T[] | null | undefined>,
  { pageSize = PAGE_SIZE, maxPages = 10 }: { pageSize?: number; maxPages?: number } = {},
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const rows = (await fetchPage(page)) ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
