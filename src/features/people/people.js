
import { grantsFromApprover, grantsFromPermissionNames } from './permissions';

/** `PaginationEnum::PER_PAGE`: the lists of people come 20 to a page, with no total. */
export const PAGE_SIZE = 20;



export function personFromUser(user) {
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
function adminGrant() {
  return { role: 'admin', bookingTypeIds: null };
}

const NAME_COLLATOR = new Intl.Collator('he');

/** Hebrew alphabetical; people without a name last. */
export function compareByName(a, b) {
  if (!a.name && !b.name) return 0;
  if (!a.name) return 1;
  if (!b.name) return -1;
  return NAME_COLLATOR.compare(a.name, b.name);
}

/** One role holder as the people list shows them: from their API row, with their phone and grants. */
const holderRow = (row, phone, grants) => ({
  uuid: row.uuid,
  name: row.full_name,
  personalNumber: row.personal_number,
  personalId: null,
  phone,
  affiliation: null,
  isSuperAdmin: false,
  grants,
});

/** Approvers and vice approvers, plus (for the super admin) the camp commanders - one row per person. */
export function mergeRoleHolders(approvers, admins) {
  const people = new Map();

  for (const row of approvers) {
    people.set(row.uuid, holderRow(row, row.phone, grantsFromApprover(row)));
  }

  for (const row of admins) {
    const existing = people.get(row.uuid);
    if (existing) {
      if (!existing.grants.some((grant) => grant.role === 'admin')) existing.grants = [adminGrant(), ...existing.grants];
    } else {
      people.set(row.uuid, holderRow(row, null, [adminGrant()]));
    }
  }

  return [...people.values()].sort(compareByName);
}

/** Reads a 20-per-page list with no total until a page is not full (or `maxPages`). */
export async function loadAllPages(
  fetchPage,
  { pageSize = PAGE_SIZE, maxPages = 10 } = {},
) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const rows = (await fetchPage(page)) ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
