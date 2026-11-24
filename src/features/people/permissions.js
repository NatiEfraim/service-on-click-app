

import { ROLE_NAME } from '@/lib/labels';
import { hasOwnRoute, routeRoleLabel, routeRoles } from '@/lib/routeTypes';
import { topicHandlerRole } from '@/lib/topicTypes';

/**
 * The columns' order (roles & permissions guide): the commanders (a camp's, the service desk's), the stages of the
 * approval route, the infosec officer, then the clearance grant's other roles (the coordinator who schedules, the קב"ט
 * who submits).
 */
const ROLE_ORDER = ['commander', 'admin', 'admin_ict', 'approver', 'vice_approver', 'transportation_control_officer', 'in_unit_food_control_officer', 'ict_handler', 'infosec_officer', 'interview_coordinator', 'department_security_officer'];

/** Roles every person has or that are not a "grant on a domain" - never drawn as a role chip. */
const NOT_A_GRANT = new Set(['user', 'super_admin']);

/**
 * The commander flags of `get-admin-permissions` / `assign-admin-role` (the super admin's): the camp commander on a camp
 * type (`is_admin`), the service desk's commander on a תקשוב type (`is_admin_ict`); a type answers one of them, the other is
 * null. Neither is a role of the approvers' request.
 */
export const COMMANDER_FLAGS = [
  { role: 'admin', flag: 'is_admin' },
  { role: 'admin_ict', flag: 'is_admin_ict' },
];
const COMMANDER_ROLES = new Set(COMMANDER_FLAGS.map((commander) => commander.role));

const roleRank = (role) => {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
};

const byRole = (a, b) => roleRank(a) - roleRank(b) || a.localeCompare(b);

/** A role's name; on a type with a route of its own, the words its route uses (the desk's vice approver is its נציג מוקד). */
export const roleLabel = (role, bookingTypeId) => (bookingTypeId != null ? routeRoleLabel(role, bookingTypeId) : null) ?? ROLE_NAME[role] ?? role;

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
  const grants = groupGrants(parsed);

  // The requester access (user_{id}) is not a domain role, but it is still named, last: a person who only
  // opens requests (e.g. the imported booking-type lists) is "משתמש: תחומים", not "ללא תפקיד".
  const requesterIds = [...new Set(parsed.filter((entry) => entry.role === REQUESTER).map((entry) => entry.bookingTypeId))];
  if (requesterIds.length) grants.push({ role: REQUESTER, bookingTypeIds: requesterIds.sort((a, b) => a - b) });

  return grants;
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



/** Who the caller is: the super admin, or a commander with the types they command (a camp's admin_N, the desk's admin_ict_N). */
export function callerFrom(me) {
  const administered = new Set();
  for (const name of me.permissions) {
    const parsed = parsePermissionName(name);
    if (parsed && COMMANDER_ROLES.has(parsed.role)) administered.add(parsed.bookingTypeId);
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

/**
 * The requester flag (`is_user`: may open requests of the domain). Not a role of the domain's one-role choice: a person may
 * hold a role and also open requests, so it is a cell of its own (`user`) with its own toggle, sent only when changed.
 */
export const REQUESTER = 'user';
const isApproverSide = (role) => !COMMANDER_ROLES.has(role) && !NOT_A_GRANT.has(role);

/** Statuses only a control officer sets; a type reaching them has the control officer step. */
const CONTROL_OFFICER_STATUSES = [14, 17, 18];

/** Each control-officer role (רמ"ד תו"ב) is bound to one booking type (the API's RoleEnum): shipments 8, in-unit food 11. */
const CONTROL_OFFICER_TYPE = { transportation_control_officer: 8, in_unit_food_control_officer: 11 };

/** The booking types with a control officer step, from `catalog.booking_type_statuses`. */
export function controlOfficerTypesOf(catalog) {
  return Object.entries(catalog?.booking_type_statuses ?? {})
    .filter(([, statuses]) => statuses.some((status) => CONTROL_OFFICER_STATUSES.includes(status)))
    .map(([id]) => Number(id));
}

/** The roles of the clearance grant and of any other type with a route of its own (lib/routeTypes); never a grant on another type. */
const ROUTE_ROLES = new Set(['department_security_officer', 'interview_coordinator']);

/**
 * The roles a booking type has (roles & permissions guide, per-type table) - used only where the server sends no row of
 * flags to read it from (the super admin's fallback): a type with a route of its own has exactly the route's roles
 * (lib/routeTypes: on the clearance grant the קב"ט who submits, the infosec officer who owns it, the coordinator; at the
 * service desk the representative - the type's vice approver - and the desk's commander); the other ביטחון מידע types
 * (lib/topicTypes) have only their one handler (the infosec officer); every other type the approver, the vice approver
 * (not the barber, 5) and the control officer (only where that step exists). When the server sends a row, its flag keys
 * are the answer and this is not used.
 */
export function roleApplies(role, bookingTypeId) {
  const id = Number(bookingTypeId);
  if (hasOwnRoute(id)) return routeRoles(id).some((candidate) => candidate.name === role);
  if (ROUTE_ROLES.has(role) || role === 'admin_ict') return false;
  const handler = topicHandlerRole(id);
  if (handler) return role === handler;
  if (role === 'infosec_officer' || role === 'ict_handler') return false;
  if (role === 'vice_approver') return id !== 5;
  if (role in CONTROL_OFFICER_TYPE) return id === CONTROL_OFFICER_TYPE[role];
  return true;
}

/**
 * Rows are booking types, columns the `is_<role>` flags. Approver rows derive from the caller's `admin_*`
 * permissions, so they are empty for the super admin; the grid then uses the admin answer and permission names.
 */
export function buildMatrix({ approver, admin, permissionNames, caller, targetUuid, controlOfficerTypes }) {
  const rows = new Map();
  const put = (bookingTypeId, role, value) => {
    // The barber answers as the approver; stale permission names must not revive a handler role.
    if (Number(bookingTypeId) === 5 && role === 'vice_approver') return;
    // A control officer (רמ"ד תו"ב) exists only on the types with that step; the server's own rows always pass.
    if (role in CONTROL_OFFICER_TYPE && controlOfficerTypes && !controlOfficerTypes.includes(Number(bookingTypeId))) return;
    const row = rows.get(bookingTypeId) ?? { bookingTypeId, cells: {} };
    row.cells[role] = { value, lock: lockReason(caller, targetUuid, bookingTypeId) };
    rows.set(bookingTypeId, row);
  };

  for (const row of approver.permissions) {
    for (const [key, value] of Object.entries(row)) {
      const flag = FLAG.exec(key);
      if (flag && typeof value === 'boolean' && isApproverSide(flag[1])) put(row.booking_type_id, flag[1], value);
      // the requester flag: only on a type whose requester is the plain user (the server sends it there, never on 14)
      else if (flag && flag[1] === REQUESTER && typeof value === 'boolean') put(row.booking_type_id, REQUESTER, value);
    }
  }

  const adminRows = caller.isSuperAdmin ? (admin?.permissions ?? []) : [];

  if (caller.isSuperAdmin && approver.permissions.length === 0) {
    const held = new Set(permissionNames);
    const roles = Object.keys(approver.role_options ?? {}).filter(isApproverSide);
    for (const row of adminRows) {
      for (const role of roles) if (roleApplies(role, row.booking_type_id)) put(row.booking_type_id, role, held.has(`${role}_${row.booking_type_id}`));
    }
  }

  // each type answers one commander flag (a camp type the camp commander's, a תקשוב type the desk commander's); null means the type has no such role
  for (const row of adminRows) {
    for (const { role, flag } of COMMANDER_FLAGS) {
      if (typeof row[flag] === 'boolean') put(row.booking_type_id, role, row[flag]);
    }
  }

  const sorted = [...rows.values()].sort((a, b) => a.bookingTypeId - b.bookingTypeId);
  // a column for every role the server offers (role_options; for the super admin each commander some type answers), even
  // with no row yet (no rows, no columns: the dialog then says there is no domain to assign)
  const commanders = caller.isSuperAdmin ? COMMANDER_FLAGS.filter(({ flag }) => adminRows.some((row) => typeof row[flag] === 'boolean')).map(({ role }) => role) : [];
  const offered = sorted.length ? [...Object.keys(approver.role_options ?? {}).filter(isApproverSide), ...commanders] : [];
  // the requester flag is a cell of its own (its switch), never a role column
  const roles = [...new Set([...offered, ...sorted.flatMap((row) => Object.keys(row.cells))])].filter((role) => role !== REQUESTER).sort(byRole);
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
    for (const role of [...matrix.roles, REQUESTER]) {
      const cell = row.cells[role];
      const to = shownValue(row, role, edits);
      if (cell && to !== undefined && to !== cell.value) changes.push({ bookingTypeId: row.bookingTypeId, role, from: cell.value, to });
    }
  }
  return changes;
}

/** `role_assignments` for `assign-approver-role`: changed booking types only, each with exactly the flags that row has (guide: none it lacks - e.g. no approver flag on ביטחון מידע / תקשוב, no vice approver on the barber). */
export function approverAssignments(matrix, edits) {
  const changed = new Set(pendingChanges(matrix, edits).filter((change) => !COMMANDER_ROLES.has(change.role)).map((change) => change.bookingTypeId));
  return matrix.rows
    .filter((row) => changed.has(row.bookingTypeId))
    .map((row) => {
      const assignment = { booking_type_id: row.bookingTypeId };
      for (const role of Object.keys(row.cells).sort(byRole)) {
        if (COMMANDER_ROLES.has(role) || role === REQUESTER) continue;
        assignment[`is_${role}`] = shownValue(row, role, edits) ?? false;
      }
      // the requester flag is optional: sent only when it was changed, so a role change never touches it
      const requester = row.cells[REQUESTER];
      const asked = shownValue(row, REQUESTER, edits);
      if (requester && asked !== requester.value) assignment.is_user = asked;
      return assignment;
    });
}

/** `role_assignments` of `assign-admin-role` (super admin): the booking types whose commander flag changed, each with the flag its type answers (`is_admin` on a camp type, `is_admin_ict` on a תקשוב type). */
export function adminAssignments(matrix, edits) {
  return pendingChanges(matrix, edits)
    .filter((change) => COMMANDER_ROLES.has(change.role))
    .map((change) => ({ booking_type_id: change.bookingTypeId, [COMMANDER_FLAGS.find(({ role }) => role === change.role).flag]: change.to }));
}

/** The server's `reason` is optional (max 500); the product requires one for every change. */
export const REASON_MAX = 500;

export function reasonError(reason, required) {
  const text = reason.trim();
  if (!text) return required ? 'יש לציין סיבה לשינוי ההרשאות' : null;
  if (text.length > REASON_MAX) return `הסיבה יכולה להכיל עד ${REASON_MAX} תווים`;
  return null;
}
