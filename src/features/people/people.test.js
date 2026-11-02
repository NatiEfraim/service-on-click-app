import { describe, expect, it } from 'vitest';

import { compareByName, loadAllPages, mergeRoleHolders, personFromUser } from './people';

const user = (patch) => ({
  uuid: 'u1',
  name: 'דניאל יצחק קם',
  personal_number: '99815386',
  personal_id: '315552810',
  phone: '0535215312',
  unit_id: 1,
  unit_name: 'H',
  department_id: null,
  department_name: null,
  roles: [],
  permissions: [],
  ...patch,
});

describe('personFromUser', () => {
  it('groups the permissions by role and keeps where the person sits', () => {
    const person = personFromUser(
      user({
        unit_name: 'N',
        department_name: 'לוגיסטיקה',
        roles: [{ id: 3, name: 'approver', display_name: 'מפקד תחום' }],
        permissions: [
          { id: 1, name: 'approver_3', display_name: 'x' },
          { id: 2, name: 'approver_1', display_name: 'x' },
          { id: 3, name: 'user_1', display_name: 'x' },
        ],
      }),
    );
    expect(person.grants).toEqual([{ role: 'approver', bookingTypeIds: [1, 3] }]);
    expect(person.affiliation).toEqual({ unitName: 'N', departmentName: 'לוגיסטיקה' });
    expect(person.isSuperAdmin).toBe(false);
  });

  it('marks the super admin and copes with a person known by ID number only', () => {
    const person = personFromUser(user({ name: null, personal_number: null, roles: [{ id: 1, name: 'super_admin', display_name: 'מנהל מערכת' }] }));
    expect(person.isSuperAdmin).toBe(true);
    expect(person.name).toBeNull();
    expect(person.personalNumber).toBeNull();
    expect(person.personalId).toBe('315552810');
  });
});

const approver = (uuid, name, roles) => ({
  uuid,
  full_name: name,
  personal_number: uuid,
  phone: null,
  permissions: roles.map(([role, id]) => ({ booking_type_id: id, role, display_name: 'x', icon: null })),
});
const admin = (uuid, name) => ({ uuid, full_name: name, personal_number: uuid });

describe('mergeRoleHolders', () => {
  it('lists approvers and camp commanders once each, alphabetically', () => {
    const rows = mergeRoleHolders([approver('2', 'דניאל', [['approver', 1]]), approver('3', 'אורי', [['vice_approver', 2]])], [admin('1', 'נתנאל'), admin('3', 'אורי')]);
    expect(rows.map((row) => row.name)).toEqual(['אורי', 'דניאל', 'נתנאל']);
    expect(rows.find((row) => row.uuid === '3')?.grants.map((grant) => grant.role)).toEqual(['admin', 'vice_approver']);
    expect(rows.find((row) => row.uuid === '1')?.grants).toEqual([{ role: 'admin', bookingTypeIds: null }]);
    expect(rows.every((row) => row.affiliation === null)).toBe(true);
  });

  it('does not repeat a camp commander twice', () => {
    expect(mergeRoleHolders([], [admin('1', 'נתנאל'), admin('1', 'נתנאל')])).toHaveLength(1);
  });
});

describe('compareByName', () => {
  it('puts the people without a name last', () => {
    const names = [{ name: null }, { name: 'ב' }, { name: 'א' }].sort(compareByName).map((row) => row.name);
    expect(names).toEqual(['א', 'ב', null]);
  });
});

describe('loadAllPages', () => {
  const pageOf = (size, page) => Array.from({ length: size }, (_, i) => `${page}-${i}`);

  it('reads pages until one is not full', async () => {
    const asked = [];
    const rows = await loadAllPages(
      async (page) => {
        asked.push(page);
        return page < 3 ? pageOf(4, page) : pageOf(2, page);
      },
      { pageSize: 4 },
    );
    expect(asked).toEqual([1, 2, 3]);
    expect(rows).toHaveLength(10);
  });

  it('stops after one request when the first page is short or missing', async () => {
    expect(await loadAllPages(async () => pageOf(3, 1), { pageSize: 20 })).toHaveLength(3);
    expect(await loadAllPages(async () => undefined)).toEqual([]);
  });

  it('never asks for more than maxPages', async () => {
    let calls = 0;
    await loadAllPages(
      async (page) => {
        calls++;
        return pageOf(5, page);
      },
      { pageSize: 5, maxPages: 3 },
    );
    expect(calls).toBe(3);
  });
});
