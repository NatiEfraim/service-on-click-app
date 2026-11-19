import { describe, expect, it } from 'vitest';

import {
  adminAssignments,
  approverAssignments,
  roleApplies,
  buildMatrix,
  callerFrom,
  cellKey,
  grantChip,
  grantsFromApprover,
  grantsFromPermissionNames,
  LOCK_DOMAIN,
  LOCK_SELF,
  lockReason,
  parsePermissionName,
  pendingChanges,
  reasonError,
  shownValue,
} from './permissions';

const typeName = (id) => `תחום ${id}`;

describe('parsePermissionName', () => {
  it('splits the role from the booking type', () => {
    expect(parsePermissionName('approver_8')).toEqual({ role: 'approver', bookingTypeId: 8 });
    expect(parsePermissionName('vice_approver_13')).toEqual({ role: 'vice_approver', bookingTypeId: 13 });
    expect(parsePermissionName('transportation_control_officer_8')).toEqual({ role: 'transportation_control_officer', bookingTypeId: 8 });
  });

  it('refuses names that carry no booking type', () => {
    expect(parsePermissionName('approver')).toBeNull();
    expect(parsePermissionName('approver_x')).toBeNull();
  });
});

describe('grants', () => {
  it('groups permission names by role, in reading order, leaving out the plain user role', () => {
    const grants = grantsFromPermissionNames(['user_1', 'vice_approver_3', 'approver_8', 'vice_approver_1', 'admin_2', 'approver_3', 'user_8']);
    expect(grants).toEqual([
      { role: 'admin', bookingTypeIds: [2] },
      { role: 'approver', bookingTypeIds: [3, 8] },
      { role: 'vice_approver', bookingTypeIds: [1, 3] },
    ]);
  });

  it('reads the rows of get-approvers', () => {
    const grants = grantsFromApprover({
      permissions: [
        { booking_type_id: 2, role: 'vice_approver', display_name: 'x', icon: null },
        { booking_type_id: 1, role: 'vice_approver', display_name: 'x', icon: null },
      ],
    });
    expect(grants).toEqual([{ role: 'vice_approver', bookingTypeIds: [1, 2] }]);
  });

  it('names up to two domains and counts more', () => {
    expect(grantChip({ role: 'approver', bookingTypeIds: [1, 2] }, typeName)).toEqual({ label: 'מפקד תחום: תחום 1, תחום 2', title: 'מפקד תחום: תחום 1, תחום 2' });
    expect(grantChip({ role: 'vice_approver', bookingTypeIds: [1, 2, 3] }, typeName)).toEqual({ label: 'גורם מטפל: 3 תחומים', title: 'גורם מטפל: תחום 1, תחום 2, תחום 3' });
  });

  it('shows only the role when the list does not say on which domains', () => {
    expect(grantChip({ role: 'admin', bookingTypeIds: null }, typeName).label).toBe('מפקד מחנה');
  });
});

const ADMIN_ME = { is_super_admin: false, permissions: ['admin_1', 'admin_2'], user: { uuid: 'me' } };
const SUPER_ME = { is_super_admin: true, permissions: [], user: { uuid: 'root' } };

describe('callerFrom / lockReason', () => {
  it('reads the booking types an admin administers from their own permissions', () => {
    const caller = callerFrom(ADMIN_ME);
    expect(caller.isSuperAdmin).toBe(false);
    expect([...caller.administered]).toEqual([1, 2]);
    expect(caller.uuid).toBe('me');
  });

  it('closes the own row and the domains an admin does not administer', () => {
    const caller = callerFrom(ADMIN_ME);
    expect(lockReason(caller, 'me', 1)).toBe(LOCK_SELF);
    expect(lockReason(caller, 'other', 1)).toBeNull();
    expect(lockReason(caller, 'other', 5)).toBe(LOCK_DOMAIN);
  });

  it('leaves everything open to the super admin', () => {
    const caller = callerFrom(SUPER_ME);
    expect(lockReason(caller, 'root', 99)).toBeNull();
  });
});

const approverAnswer = (rows) => ({
  role_options: { approver: 3, vice_approver: 4 },
  user: { full_name: 'x', personal_number: '1' },
  permissions: rows.map((row) => ({
    booking_type_id: row.id,
    name: `type_${row.id}`,
    display_name: `ניהול ${row.id}`,
    icon: null,
    ...(row.approver !== undefined ? { is_approver: row.approver } : {}),
    ...(row.vice !== undefined ? { is_vice_approver: row.vice } : {}),
    ...(row.control !== undefined ? { is_transportation_control_officer: row.control } : {}),
  })),
});

const adminAnswer = (rows) => ({
  role_options: { admin: 2 },
  user: { full_name: 'x', personal_number: '1' },
  permissions: rows.map((row) => ({ booking_type_id: row.id, name: `type_${row.id}`, display_name: `ניהול ${row.id}`, icon: null, is_admin: row.admin })),
});

const ADMIN_CALLER = callerFrom(ADMIN_ME);
const SUPER_CALLER = callerFrom(SUPER_ME);

describe('buildMatrix for an admin', () => {
  const approver = approverAnswer([
    { id: 1, approver: true, vice: false },
    { id: 2, approver: false, vice: false },
  ]);

  it('has a row per returned domain and a column per flag - and no admin column', () => {
    const matrix = buildMatrix({ approver, permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'p' });
    expect(matrix.roles).toEqual(['approver', 'vice_approver']);
    expect(matrix.rows.map((row) => row.bookingTypeId)).toEqual([1, 2]);
    expect(matrix.rows[0].cells.approver).toEqual({ value: true, lock: null });
    expect(matrix.rows[0].cells.vice_approver).toEqual({ value: false, lock: null });
  });

  it('adds the control officer column only where the server sent that flag', () => {
    const matrix = buildMatrix({ approver: approverAnswer([{ id: 8, approver: false, vice: false, control: true }, { id: 1, approver: false, vice: false }]), permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'p' });
    expect(matrix.roles).toEqual(['approver', 'vice_approver', 'transportation_control_officer']);
    expect(matrix.rows.find((row) => row.bookingTypeId === 1)?.cells.transportation_control_officer).toBeUndefined();
    expect(matrix.rows.find((row) => row.bookingTypeId === 8)?.cells.transportation_control_officer?.value).toBe(true);
  });

  it('closes every cell of the admin\'s own row', () => {
    const matrix = buildMatrix({ approver, permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'me' });
    expect(matrix.rows.every((row) => Object.values(row.cells).every((cell) => cell.lock === LOCK_SELF))).toBe(true);
  });

  it('does not show an admin column even if the admin answer is passed', () => {
    const matrix = buildMatrix({ approver, admin: adminAnswer([{ id: 1, admin: true }]), permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'p' });
    expect(matrix.roles).not.toContain('admin');
  });
});

describe('buildMatrix for the super admin', () => {
  it('puts the camp commander column first, next to the approver columns of the server', () => {
    const matrix = buildMatrix({
      approver: approverAnswer([{ id: 1, approver: false, vice: true }]),
      admin: adminAnswer([{ id: 1, admin: true }]),
      permissionNames: [],
      caller: SUPER_CALLER,
      targetUuid: 'p',
    });
    expect(matrix.roles).toEqual(['admin', 'approver', 'vice_approver']);
    expect(matrix.rows[0].cells.admin.value).toBe(true);
  });

  it('builds the grid from the admin answer and the person\'s permissions when the server sends no approver rows', () => {
    const matrix = buildMatrix({
      approver: approverAnswer([]),
      admin: adminAnswer([
        { id: 1, admin: false },
        { id: 3, admin: false },
      ]),
      permissionNames: ['vice_approver_3', 'user_1', 'user_3'],
      caller: SUPER_CALLER,
      targetUuid: 'p',
    });
    expect(matrix.roles).toEqual(['admin', 'approver', 'vice_approver']);
    expect(matrix.rows.map((row) => row.bookingTypeId)).toEqual([1, 3]);
    expect(matrix.rows[1].cells.vice_approver.value).toBe(true);
    expect(matrix.rows[1].cells.approver.value).toBe(false);
    expect(matrix.rows[0].cells.vice_approver.value).toBe(false);
  });

  it('does not use the fallback for an admin whose answer is empty', () => {
    const matrix = buildMatrix({ approver: approverAnswer([]), admin: adminAnswer([{ id: 1, admin: false }]), permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'p' });
    expect(matrix.rows).toEqual([]);
    expect(matrix.roles).toEqual([]);
  });
});

describe('edits and requests', () => {
  const approver = approverAnswer([
    { id: 1, approver: true, vice: false },
    { id: 2, approver: false, vice: false },
    { id: 3, approver: false, vice: true },
  ]);
  const matrix = buildMatrix({
    approver,
    admin: adminAnswer([
      { id: 1, admin: false },
      { id: 2, admin: false },
      { id: 3, admin: true },
    ]),
    permissionNames: [],
    caller: SUPER_CALLER,
    targetUuid: 'p',
  });

  it('has no pending change before anything is ticked', () => {
    expect(pendingChanges(matrix, {})).toEqual([]);
    expect(approverAssignments(matrix, {})).toEqual([]);
    expect(adminAssignments(matrix, {})).toEqual([]);
  });

  it('ignores an edit that puts a cell back where it was', () => {
    expect(pendingChanges(matrix, { [cellKey('vice_approver', 2)]: false })).toEqual([]);
  });

  it('sends only the changed domains, each with the final value of both flags', () => {
    const edits = { [cellKey('vice_approver', 2)]: true, [cellKey('approver', 1)]: false };
    expect(pendingChanges(matrix, edits).map((change) => `${change.role}:${change.bookingTypeId}:${change.to}`).sort()).toEqual(['approver:1:false', 'vice_approver:2:true']);
    expect(approverAssignments(matrix, edits)).toEqual([
      { booking_type_id: 1, is_approver: false, is_vice_approver: false },
      { booking_type_id: 2, is_approver: false, is_vice_approver: true },
    ]);
    expect(adminAssignments(matrix, edits)).toEqual([]);
  });

  it('keeps the unchanged flag of a changed domain at its current value', () => {
    expect(approverAssignments(matrix, { [cellKey('approver', 3)]: true })).toEqual([{ booking_type_id: 3, is_approver: true, is_vice_approver: true }]);
  });

  it('sends the camp commander changes as their own request and leaves them out of the approver request', () => {
    const edits = { [cellKey('admin', 3)]: false, [cellKey('admin', 1)]: true };
    expect(adminAssignments(matrix, edits)).toEqual([
      { booking_type_id: 1, is_admin: true },
      { booking_type_id: 3, is_admin: false },
    ]);
    expect(approverAssignments(matrix, edits)).toEqual([]);
  });

  it('adds the control officer flag where the row has one', () => {
    const withControl = buildMatrix({
      approver: approverAnswer([{ id: 8, approver: false, vice: false, control: false }]),
      permissionNames: [],
      caller: ADMIN_CALLER,
      targetUuid: 'p',
    });
    // domain 8 is not administered by ADMIN_CALLER: locked, so an edit does nothing
    expect(approverAssignments(withControl, { [cellKey('transportation_control_officer', 8)]: true })).toEqual([]);

    const open = buildMatrix({
      approver: approverAnswer([{ id: 1, approver: false, vice: false, control: false }]),
      permissionNames: [],
      caller: ADMIN_CALLER,
      targetUuid: 'p',
    });
    expect(approverAssignments(open, { [cellKey('transportation_control_officer', 1)]: true })).toEqual([
      { booking_type_id: 1, is_approver: false, is_vice_approver: false, is_transportation_control_officer: true },
    ]);
  });

  it('never changes a locked cell', () => {
    const locked = buildMatrix({ approver, permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'me' });
    const edits = { [cellKey('approver', 2)]: true };
    expect(shownValue(locked.rows[1], 'approver', edits)).toBe(false);
    expect(pendingChanges(locked, edits)).toEqual([]);
  });

  it('shows the edit for an open cell and undefined for a role the row does not have', () => {
    expect(shownValue(matrix.rows[1], 'vice_approver', { [cellKey('vice_approver', 2)]: true })).toBe(true);
    expect(shownValue(matrix.rows[1], 'transportation_control_officer', {})).toBeUndefined();
  });
});

describe('reasonError', () => {
  it('is required when permissions change', () => {
    expect(reasonError('', true)).toBe('יש לציין סיבה לשינוי ההרשאות');
    expect(reasonError('   ', true)).toBe('יש לציין סיבה לשינוי ההרשאות');
    expect(reasonError('מינוי חדש', true)).toBeNull();
  });

  it('is not needed when only the department changes', () => {
    expect(reasonError('', false)).toBeNull();
  });

  it('is at most 500 characters', () => {
    expect(reasonError('א'.repeat(500), true)).toBeNull();
    expect(reasonError('א'.repeat(501), true)).toBe('הסיבה יכולה להכיל עד 500 תווים');
  });
});

describe('barber roles', () => {
  it('offers only the approver flag on the barber, including the super admin fallback', () => {
    const matrix = buildMatrix({ approver: approverAnswer([]), admin: adminAnswer([{ id: 5, admin: false }, { id: 1, admin: false }]), permissionNames: ['vice_approver_5'], caller: SUPER_CALLER, targetUuid: 'p' });
    const barber = matrix.rows.find((row) => row.bookingTypeId === 5);
    expect(barber.cells.vice_approver).toBeUndefined();
    expect(matrix.rows.find((row) => row.bookingTypeId === 1).cells.vice_approver).toBeDefined();
    expect(approverAssignments(matrix, { [cellKey('approver', 5)]: true })).toEqual([{ booking_type_id: 5, is_approver: true }]);
  });
});

describe('ביטחון מידע / תקשוב roles (roles & permissions guide)', () => {
  const guideAnswer = {
    role_options: { approver: 3, vice_approver: 4, transportation_control_officer: 6, infosec_officer: 7, ict_handler: 8 },
    user: { full_name: 'x', personal_number: '1' },
    permissions: [
      { booking_type_id: 1, is_approver: false, is_vice_approver: false },
      { booking_type_id: 5, is_approver: false },
      { booking_type_id: 8, is_approver: false, is_vice_approver: false, is_transportation_control_officer: false },
      { booking_type_id: 14, is_infosec_officer: false },
      { booking_type_id: 17, is_ict_handler: false },
    ],
  };
  const matrix = buildMatrix({ approver: guideAnswer, permissionNames: [], caller: ADMIN_CALLER, targetUuid: 'p', controlOfficerTypes: [8] });

  it('shows every offered role as a column, in the guide order', () => {
    expect(matrix.roles).toEqual(['approver', 'vice_approver', 'transportation_control_officer', 'ict_handler', 'infosec_officer']);
  });

  it('gives a checkbox only where the row has the flag (else —)', () => {
    const cells = (id) => Object.keys(matrix.rows.find((row) => row.bookingTypeId === id).cells).sort();
    expect(cells(14)).toEqual(['infosec_officer']);
    expect(cells(17)).toEqual(['ict_handler']);
    expect(cells(5)).toEqual(['approver']);
    expect(cells(8)).toEqual(['approver', 'transportation_control_officer', 'vice_approver']);
  });

  it('sends only the flags a changed row has - no approver flag on 14-19', () => {
    // the super admin (a camp commander may assign only in the domains they manage, so 14 / 17 would be locked for one)
    const open = buildMatrix({ approver: guideAnswer, permissionNames: [], caller: SUPER_CALLER, targetUuid: 'p', controlOfficerTypes: [8] });
    expect(approverAssignments(open, { [cellKey('infosec_officer', 14)]: true, [cellKey('ict_handler', 17)]: true })).toEqual([
      { booking_type_id: 14, is_infosec_officer: true },
      { booking_type_id: 17, is_ict_handler: true },
    ]);
  });

  it('applies each role only to its own types (the super admin fallback)', () => {
    expect(roleApplies('infosec_officer', 14)).toBe(true);
    expect(roleApplies('approver', 14)).toBe(false);
    expect(roleApplies('ict_handler', 18)).toBe(true);
    expect(roleApplies('infosec_officer', 18)).toBe(false);
    expect(roleApplies('infosec_officer', 1)).toBe(false);
    expect(roleApplies('vice_approver', 5)).toBe(false);
    expect(roleApplies('approver', 5)).toBe(true);
  });

  it('builds the super admin fallback without boxes where a role does not apply', () => {
    const fallback = buildMatrix({
      approver: { ...guideAnswer, permissions: [] },
      admin: adminAnswer([{ id: 1, admin: false }, { id: 14, admin: null }, { id: 17, admin: null }]),
      permissionNames: ['infosec_officer_14'],
      caller: SUPER_CALLER,
      targetUuid: 'p',
      controlOfficerTypes: [8],
    });
    const cells = (id) => fallback.rows.find((row) => row.bookingTypeId === id).cells;
    expect(Object.keys(cells(14))).toEqual(['infosec_officer']);
    expect(cells(14).infosec_officer.value).toBe(true);
    expect(Object.keys(cells(17))).toEqual(['ict_handler']);
    expect(Object.keys(cells(1)).sort()).toEqual(['admin', 'approver', 'vice_approver']);
  });
});

describe('the clearance grant\'s roles (lib/routeTypes)', () => {
  const answer = {
    role_options: { approver: 3, vice_approver: 4, infosec_officer: 7, ict_handler: 8, department_security_officer: 9, interview_coordinator: 10 },
    user: { full_name: 'x', personal_number: '1' },
    permissions: [{ booking_type_id: 14, is_infosec_officer: false, is_department_security_officer: true, is_interview_coordinator: false }],
  };

  it('applies exactly the route\'s three roles to the type, and none of them elsewhere', () => {
    expect(roleApplies('department_security_officer', 14)).toBe(true);
    expect(roleApplies('interview_coordinator', 14)).toBe(true);
    expect(roleApplies('infosec_officer', 14)).toBe(true);
    expect(roleApplies('approver', 14)).toBe(false);
    expect(roleApplies('interview_coordinator', 15)).toBe(false);
    expect(roleApplies('department_security_officer', 1)).toBe(false);
  });

  it('reads the three flags of the type-14 row and sends all three back on a change', () => {
    const matrix = buildMatrix({ approver: answer, permissionNames: [], caller: SUPER_CALLER, targetUuid: 'p' });
    // every role the server offers is a column, in reading order; the row itself has only the route's three
    expect(matrix.roles).toEqual(['approver', 'vice_approver', 'ict_handler', 'infosec_officer', 'interview_coordinator', 'department_security_officer']);
    expect(Object.keys(matrix.rows[0].cells).sort()).toEqual(['department_security_officer', 'infosec_officer', 'interview_coordinator']);
    expect(approverAssignments(matrix, { [cellKey('interview_coordinator', 14)]: true, [cellKey('department_security_officer', 14)]: false })).toEqual([
      { booking_type_id: 14, is_infosec_officer: false, is_interview_coordinator: true, is_department_security_officer: false },
    ]);
  });

  it('builds the super admin fallback with the three roles when the server sends no row', () => {
    const fallback = buildMatrix({ approver: { ...answer, permissions: [] }, admin: adminAnswer([{ id: 14, admin: null }]), permissionNames: ['interview_coordinator_14'], caller: SUPER_CALLER, targetUuid: 'p' });
    const cells = fallback.rows.find((row) => row.bookingTypeId === 14).cells;
    expect(Object.keys(cells).sort()).toEqual(['department_security_officer', 'infosec_officer', 'interview_coordinator']);
    expect(cells.interview_coordinator.value).toBe(true);
    expect(cells.infosec_officer.value).toBe(false);
  });

  it('names the new roles on a person\'s chips', () => {
    expect(grantChip({ role: 'department_security_officer', bookingTypeIds: [14] }, typeName).label).toBe('קב"ט מחלקתי: תחום 14');
    expect(grantChip({ role: 'interview_coordinator', bookingTypeIds: [14] }, typeName).label).toBe('מתאם תחקיר: תחום 14');
  });
});
