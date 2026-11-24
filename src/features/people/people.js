
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

/**
 * The commanders come from `get-admins` without their domains, and without saying which command they hold - a camp's
 * (admin_N) or the service desk's (admin_ict_N) - so the chip names both until the person's record is read (attachCommanderGrants).
 */
function commanderGrant() {
  return { role: 'commander', bookingTypeIds: null };
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

/** Approvers and vice approvers, plus (for the super admin) the commanders - one row per person. */
export function mergeRoleHolders(approvers, admins) {
  const people = new Map();

  for (const row of approvers) {
    people.set(row.uuid, holderRow(row, row.phone, grantsFromApprover(row)));
  }

  for (const row of admins) {
    const existing = people.get(row.uuid);
    if (existing) {
      if (!existing.grants.some((grant) => grant.role === 'commander')) existing.grants = [commanderGrant(), ...existing.grants];
    } else {
      people.set(row.uuid, holderRow(row, null, [commanderGrant()]));
    }
  }

  return [...people.values()].sort(compareByName);
}

/** More commanders than this and their records are not read one by one; their chips keep the generic word. */
export const COMMANDER_LOOKUPS_MAX = 12;

/**
 * Names each commander's command: the commanders' list says only that a person commands something, so the few of them
 * are read whole (`loadUser(row)`: the person's record from GET /users, with their permission names, or null), and the
 * generic chip gives way to the exact ones - "מפקד מחנה: רכב, מזון", "מפקד תקשוב: 6 תחומים". A record that cannot be read,
 * or a list too long to read, keeps the generic chip.
 */
export async function attachCommanderGrants(rows, loadUser) {
  const commanders = rows.filter((row) => row.grants.some((grant) => grant.role === 'commander'));
  if (!commanders.length || commanders.length > COMMANDER_LOOKUPS_MAX) return rows;
  const records = await Promise.all(commanders.map((row) => loadUser(row).catch(() => null)));
  const named = new Map();
  commanders.forEach((row, index) => {
    const record = records[index];
    if (!record?.permissions) return;
    const exact = grantsFromPermissionNames(record.permissions.map((permission) => permission.name)).filter((grant) => grant.role !== 'user');
    // the person's own record names their commands and every other role; nothing of the generic chip is left to say
    if (exact.length) named.set(row.uuid, exact);
  });
  return rows.map((row) => (named.has(row.uuid) ? { ...row, grants: named.get(row.uuid) } : row));
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
