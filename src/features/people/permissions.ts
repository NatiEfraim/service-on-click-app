/** Roles and the permissions matrix; a permission is `{role}_{booking_type_id}`. */
import type { ApproverAssignment } from '@/lib/api/endpoints';
import type { ApproverRow, Me, RolePermissionRow, UserPermissions } from '@/lib/api/types';
import { ROLE_NAME } from '@/lib/labels';

/** The camp commander first, then the stages of the approval route. */
const ROLE_ORDER = ['admin', 'approver', 'vice_approver', 'transportation_control_officer'];

/** Roles every person has or that are not a "grant on a domain" - never drawn as a role chip. */
const NOT_A_GRANT = new Set(['user', 'super_admin']);

const roleRank = (role: string): number => {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
};

const byRole = (a: string, b: string): number => roleRank(a) - roleRank(b) || a.localeCompare(b);

export const roleLabel = (role: string): string => ROLE_NAME[role] ?? role;

const PERMISSION_NAME = /^(.+)_(\d+)$/;

export function parsePermissionName(name: string): { role: string; bookingTypeId: number } | null {
  const match = PERMISSION_NAME.exec(name.trim());
  return match ? { role: match[1], bookingTypeId: Number(match[2]) } : null;
}

export interface RoleGrant {
  role: string;
  /** Ascending. `null`: the list the person came from does not say on which domains (the admins list). */
  bookingTypeIds: number[] | null;
}

function groupGrants(entries: Iterable<{ role: string; bookingTypeId: number }>): RoleGrant[] {
  const ids = new Map<string, Set<number>>();
  for (const { role, bookingTypeId } of entries) {
    if (NOT_A_GRANT.has(role)) continue;
    const set = ids.get(role) ?? new Set<number>();
    set.add(bookingTypeId);
    ids.set(role, set);
  }
  return [...ids]
    .sort(([a], [b]) => byRole(a, b))
    .map(([role, set]) => ({ role, bookingTypeIds: [...set].sort((a, b) => a - b) }));
}

/** From the permission names of `GET /users`. */
export function grantsFromPermissionNames(names: readonly string[]): RoleGrant[] {
  const parsed = names.map(parsePermissionName).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return groupGrants(parsed);
}

/** From a row of `get-approvers`. */
export function grantsFromApprover(row: Pick<ApproverRow, 'permissions'>): RoleGrant[] {
  return groupGrants(row.permissions.map((permission) => ({ role: permission.role, bookingTypeId: permission.booking_type_id })));
}

/** More domains than this are summarised as "N תחומים". */
const MAX_NAMED_DOMAINS = 2;

/** The text of one role chip: "גורם מטפל: רכב שיתופי, מספרה" or, past two domains, "גורם מטפל: 9 תחומים". */
export function grantChip(grant: RoleGrant, domainName: (bookingTypeId: number) => string): { label: string; title: string } {
  const role = roleLabel(grant.role);
  if (grant.bookingTypeIds === null) return { label: role, title: role };
  const names = grant.bookingTypeIds.map(domainName);
  return {
    label: `${role}: ${names.length <= MAX_NAMED_DOMAINS ? names.join(', ') : `${names.length} תחומים`}`,
    title: `${role}: ${names.join(', ')}`,
  };
}

/** What decides which cells of the matrix are closed to the signed-in user. The server enforces the same rules. */
export interface Caller {
  isSuperAdmin: boolean;
  /** The booking types the caller is camp commander of (`admin_<id>` in their own permissions). */
  administered: ReadonlySet<number>;
  uuid: string;
}

export function callerFrom(me: Pick<Me, 'is_super_admin' | 'permissions'> & { user: Pick<Me['user'], 'uuid'> }): Caller {
  const administered = new Set<number>();
  for (const name of me.permissions) {
    const parsed = parsePermissionName(name);
    if (parsed?.role === 'admin') administered.add(parsed.bookingTypeId);
  }
  return { isSuperAdmin: me.is_super_admin, administered, uuid: me.user.uuid };
}

export const LOCK_SELF = 'לא ניתן לשנות את ההרשאות של עצמך';
export const LOCK_DOMAIN = 'ניתן לשבץ רק בתחומים שבניהולך';

/** Why a cell is closed to the caller, or `null` when it may be changed. The super admin may change anything. */
export function lockReason(caller: Caller, targetUuid: string, bookingTypeId: number): string | null {
  if (caller.isSuperAdmin) return null;
  if (targetUuid === caller.uuid) return LOCK_SELF;
  if (!caller.administered.has(bookingTypeId)) return LOCK_DOMAIN;
  return null;
}

export interface MatrixCell {
  value: boolean;
  /** Why it cannot be changed (shown as a tooltip), or `null`. */
  lock: string | null;
}

export interface MatrixRow {
  bookingTypeId: number;
  /** role -> cell. A role missing here does not apply to this domain. */
  cells: Record<string, MatrixCell>;
}

export interface Matrix {
  /** The columns, in reading order. */
  roles: string[];
  /** By booking type id. */
  rows: MatrixRow[];
}

export interface MatrixSources {
  /** `get-approver-permissions` */
  approver: UserPermissions;
  /** `get-admin-permissions` - the super admin only */
  admin?: UserPermissions;
  /** The person's permission names from `GET /users`; fallback when the super admin gets no approver rows. */
  permissionNames: readonly string[];
  caller: Caller;
  targetUuid: string;
}

const FLAG = /^is_(.+)$/;
const isApproverSide = (role: string): boolean => role !== 'admin' && !NOT_A_GRANT.has(role);

/**
 * Rows are booking types, columns the `is_<role>` flags. Approver rows derive from the caller's `admin_*`
 * permissions, so they are empty for the super admin; the grid then uses the admin answer and permission names.
 */
export function buildMatrix({ approver, admin, permissionNames, caller, targetUuid }: MatrixSources): Matrix {
  const rows = new Map<number, MatrixRow>();
  const put = (bookingTypeId: number, role: string, value: boolean) => {
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

  const adminRows: RolePermissionRow[] = caller.isSuperAdmin ? (admin?.permissions ?? []) : [];

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

/** `role:bookingTypeId` -> ticked or not, only for the cells the user touched. */
export type Edits = Readonly<Record<string, boolean>>;

export const cellKey = (role: string, bookingTypeId: number): string => `${role}:${bookingTypeId}`;

/** Cell value: the user's edit, else the server's; `undefined` when the role does not apply. */
export function shownValue(row: MatrixRow, role: string, edits: Edits): boolean | undefined {
  const cell = row.cells[role];
  if (!cell) return undefined;
  if (cell.lock !== null) return cell.value;
  return edits[cellKey(role, row.bookingTypeId)] ?? cell.value;
}

export interface CellChange {
  bookingTypeId: number;
  role: string;
  from: boolean;
  to: boolean;
}

export function pendingChanges(matrix: Matrix, edits: Edits): CellChange[] {
  const changes: CellChange[] = [];
  for (const row of matrix.rows) {
    for (const role of matrix.roles) {
      const cell = row.cells[role];
      const to = shownValue(row, role, edits);
      if (cell && to !== undefined && to !== cell.value) changes.push({ bookingTypeId: row.bookingTypeId, role, from: cell.value, to });
    }
  }
  return changes;
}

/** `role_assignments` for `assign-approver-role`: changed booking types only, each with both required flags. */
export function approverAssignments(matrix: Matrix, edits: Edits): ApproverAssignment[] {
  const changed = new Set(pendingChanges(matrix, edits).filter((change) => change.role !== 'admin').map((change) => change.bookingTypeId));
  return matrix.rows
    .filter((row) => changed.has(row.bookingTypeId))
    .map((row) => {
      const assignment: ApproverAssignment = {
        booking_type_id: row.bookingTypeId,
        is_approver: shownValue(row, 'approver', edits) ?? false,
        is_vice_approver: shownValue(row, 'vice_approver', edits) ?? false,
      };
      for (const role of Object.keys(row.cells)) {
        if (role !== 'admin' && role !== 'approver' && role !== 'vice_approver') assignment[`is_${role}`] = shownValue(row, role, edits) ?? false;
      }
      return assignment;
    });
}

/** `role_assignments` of `assign-admin-role` (super admin): the booking types whose camp-commander flag changed. */
export function adminAssignments(matrix: Matrix, edits: Edits): { booking_type_id: number; is_admin: boolean }[] {
  return pendingChanges(matrix, edits)
    .filter((change) => change.role === 'admin')
    .map((change) => ({ booking_type_id: change.bookingTypeId, is_admin: change.to }));
}

/** The server's `reason` is optional (max 500); the product requires one for every change. */
export const REASON_MAX = 500;

export function reasonError(reason: string, required: boolean): string | null {
  const text = reason.trim();
  if (!text) return required ? 'יש לציין סיבה לשינוי ההרשאות' : null;
  if (text.length > REASON_MAX) return `הסיבה יכולה להכיל עד ${REASON_MAX} תווים`;
  return null;
}
