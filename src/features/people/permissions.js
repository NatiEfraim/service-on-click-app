

import { ROLE_NAME } from '@/lib/labels';

/** The camp commander first, then the stages of the approval route. */
const ROLE_ORDER = ['admin', 'approver', 'vice_approver', 'transportation_control_officer'];

/** Roles every person has or that are not a "grant on a domain" - never drawn as a role chip. */
const NOT_A_GRANT = new Set(['user', 'super_admin']);

const roleRank = (role) => {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
};

const byRole = (a, b) => roleRank(a) - roleRank(b) || a.localeCompare(b);

export const roleLabel = (role) => ROLE_NAME[role] ?? role;

const PERMISSION_NAME = /^(.+)_(\d+)$/;

export function parsePermissionName(name) {
  const match = PERMISSION_NAME.exec(name.trim());
  return match ? { role: match[1], bookingTypeId: Number(match[2]) } : null;
}



function groupGrants(entries) {
  const ids = new Map();
  for (const { role, bookingTypeId } of entries) {
    if (NOT_A_GRANT.has(role)) continue;
    const set = ids.get(role) ?? new Set();
    set.add(bookingTypeId);
    ids.set(role, set);
  }
  return [...ids]
    .sort(([a], [b]) => byRole(a, b))
    .map(([role, set]) => ({ role, bookingTypeIds: [...set].sort((a, b) => a - b) }));
}

/** From the permission names of `GET /users`. */
export function grantsFromPermissionNames(names) {
  const parsed = names.map(parsePermissionName).filter((entry) => entry !== null);
  return groupGrants(parsed);
}

/** From a row of `get-approvers`. */
export function grantsFromApprover(row) {
  return groupGrants(row.permissions.map((permission) => ({ role: permission.role, bookingTypeId: permission.booking_type_id })));
}

/** More domains than this are summarised as "N תחומים". */
const MAX_NAMED_DOMAINS = 2;

/** The text of one role chip: "גורם מטפל: רכב שיתופי, מספרה" or, past two domains, "גורם מטפל: 9 תחומים". */
export function grantChip(grant, domainName) {
  const role = roleLabel(grant.role);
  if (grant.bookingTypeIds === null) return { label: role, title: role };
  const names = grant.bookingTypeIds.map(domainName);
  return {
    label: `${role}: ${names.length <= MAX_NAMED_DOMAINS ? names.join(', ') : `${names.length} תחומים`}`,
    title: `${role}: ${names.join(', ')}`,
  };
}



export function callerFrom(me) {
  const administered = new Set();
  for (const name of me.permissions) {
    const parsed = parsePermissionName(name);
    if (parsed?.role === 'admin') administered.add(parsed.bookingTypeId);
  }
  return { isSuperAdmin: me.is_super_admin, administered, uuid: me.user.uuid };
}

export const LOCK_SELF = 'לא ניתן לשנות את ההרשאות של עצמך';
export const LOCK_DOMAIN = 'ניתן לשבץ רק בתחומים שבניהולך';

/** Why a cell is closed to the caller, or `null` when it may be changed. The super admin may change anything. */
export function lockReason(caller, targetUuid, bookingTypeId) {
  if (caller.isSuperAdmin) return null;
  if (targetUuid === caller.uuid) return LOCK_SELF;
  if (!caller.administered.has(bookingTypeId)) return LOCK_DOMAIN;
  return null;
}









const FLAG = /^is_(.+)$/;
const isApproverSide = (role) => role !== 'admin' && !NOT_A_GRANT.has(role);

/**
 * Rows are booking types, columns the `is_<role>` flags. Approver rows derive from the caller's `admin_*`
 * permissions, so they are empty for the super admin; the grid then uses the admin answer and permission names.
 */
export function buildMatrix({ approver, admin, permissionNames, caller, targetUuid }) {
  const rows = new Map();
  const put = (bookingTypeId, role, value) => {
    // The barber answers as the approver; stale permission names must not revive a handler role.
    if (Number(bookingTypeId) === 5 && role === 'vice_approver') return;
    const row = rows.get(bookingTypeId) ?? { bookingTypeId, cells: {} };
    row.cells[role] = { value, lock: lockReason(caller, targetUuid, bookingTypeId) };
    rows.set(bookingTypeId, row);
  };

  for (const row of approver.permissions) {
    for (const [key, value] of Object.entries(row)) {
      const flag = FLAG.exec(key);
      if (flag && typeof value === 'boolean' && isApproverSide(flag[1])) put(row.booking_type_id, flag[1], value);
    }
  }

  const adminRows = caller.isSuperAdmin ? (admin?.permissions ?? []) : [];

  if (caller.isSuperAdmin && approver.permissions.length === 0) {
    const held = new Set(permissionNames);
    const roles = Object.keys(approver.role_options ?? {}).filter(isApproverSide);
    for (const row of adminRows) {
      for (const role of roles) put(row.booking_type_id, role, held.has(`${role}_${row.booking_type_id}`));
    }
  }

  for (const row of adminRows) {
    if (typeof row.is_admin === 'boolean') put(row.booking_type_id, 'admin', row.is_admin);
  }

  const sorted = [...rows.values()].sort((a, b) => a.bookingTypeId - b.bookingTypeId);
  const roles = [...new Set(sorted.flatMap((row) => Object.keys(row.cells)))].sort(byRole);
  return { roles, rows: sorted };
}



export const cellKey = (role, bookingTypeId) => `${role}:${bookingTypeId}`;

/** Cell value: the user's edit, else the server's; `undefined` when the role does not apply. */
export function shownValue(row, role, edits) {
  const cell = row.cells[role];
  if (!cell) return undefined;
  if (cell.lock !== null) return cell.value;
  return edits[cellKey(role, row.bookingTypeId)] ?? cell.value;
}



export function pendingChanges(matrix, edits) {
  const changes = [];
  for (const row of matrix.rows) {
    for (const role of matrix.roles) {
      const cell = row.cells[role];
      const to = shownValue(row, role, edits);
      if (cell && to !== undefined && to !== cell.value) changes.push({ bookingTypeId: row.bookingTypeId, role, from: cell.value, to });
    }
  }
  return changes;
}

/** `role_assignments` for `assign-approver-role`: changed booking types only, each with its flags (no vice approver flag where the type has none, e.g. the barber). */
export function approverAssignments(matrix, edits) {
  const changed = new Set(pendingChanges(matrix, edits).filter((change) => change.role !== 'admin').map((change) => change.bookingTypeId));
  return matrix.rows
    .filter((row) => changed.has(row.bookingTypeId))
    .map((row) => {
      const assignment = {
        booking_type_id: row.bookingTypeId,
        is_approver: shownValue(row, 'approver', edits) ?? false,
      };
      for (const role of Object.keys(row.cells)) {
        if (role !== 'admin' && role !== 'approver') assignment[`is_${role}`] = shownValue(row, role, edits) ?? false;
      }
      return assignment;
    });
}

/** `role_assignments` of `assign-admin-role` (super admin): the booking types whose camp-commander flag changed. */
export function adminAssignments(matrix, edits) {
  return pendingChanges(matrix, edits)
    .filter((change) => change.role === 'admin')
    .map((change) => ({ booking_type_id: change.bookingTypeId, is_admin: change.to }));
}

/** The server's `reason` is optional (max 500); the product requires one for every change. */
export const REASON_MAX = 500;

export function reasonError(reason, required) {
  const text = reason.trim();
  if (!text) return required ? 'יש לציין סיבה לשינוי ההרשאות' : null;
  if (text.length > REASON_MAX) return `הסיבה יכולה להכיל עד ${REASON_MAX} תווים`;
  return null;
}
