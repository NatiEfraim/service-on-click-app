import { describe, expect, it } from 'vitest';

import { campCommanders, hasEmptyStation, peopleWithRoles, stationsForType } from './stations';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 6, 11, 12, 13],
    '8': [1, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18],
  },
};

const manager = (name, ...roles) => ({ uuid: name, full_name: name, personal_number: name, roles });
const managers = [
  manager('דנה', 'approver'),
  manager('גיל', 'vice_approver'),
  manager('מירב', 'admin'),
  manager('נעם', 'admin', 'approver'),
];

describe('peopleWithRoles', () => {
  it('lists each person once, in the order given', () => {
    expect(peopleWithRoles(managers, ['vice_approver', 'approver'])).toEqual(['דנה', 'גיל', 'נעם']);
    expect(peopleWithRoles(managers, ['transportation_control_officer'])).toEqual([]);
  });

  it('finds the camp commanders', () => {
    expect(campCommanders(managers)).toEqual(['מירב', 'נעם']);
  });
});

describe('stationsForType', () => {
  it('gives the plain route to a type without a barber or a control officer', () => {
    const stations = stationsForType(1, catalog, managers);
    expect(stations.map((s) => s.id)).toEqual(['vice_approver', 'approver', 'realization']);
    expect(stations.map((s) => s.people)).toEqual([['גיל'], ['דנה', 'נעם'], ['דנה', 'נעם']]);
  });

  it('gives the barber type only the barber step, held by the approver', () => {
    const stations = stationsForType(5, catalog, managers);
    expect(stations.map((s) => s.id)).toEqual(['barber']);
    expect(stations[0].people).toEqual(['דנה', 'נעם']);
  });

  it('adds the control officer where his statuses can be reached, and flags the station nobody holds', () => {
    const stations = stationsForType(8, catalog, managers);
    expect(stations.map((s) => s.id)).toEqual(['control_officer', 'vice_approver', 'approver', 'realization']);
    expect(stations[0].people).toEqual([]);
    expect(hasEmptyStation(stations)).toBe(true);
    expect(hasEmptyStation(stationsForType(1, catalog, managers))).toBe(false);
  });

  it('leaves out opening and closing, which nobody holds', () => {
    expect(stationsForType(1, catalog, []).every((s) => ['vice_approver', 'approver', 'realization'].includes(s.id))).toBe(true);
  });

  it('copes with a type the catalog does not know', () => {
    expect(stationsForType(99, catalog, managers).map((s) => s.id)).toEqual(['vice_approver', 'approver', 'realization']);
  });
});

describe('the service desk (20-25): the commander and the representatives, never the requester every user is', () => {
  it('lists the commander and the representatives with their holders, named the desk\'s way', () => {
    const people = [manager('רוני', 'vice_approver'), manager('טל', 'admin_ict'), manager('גיל', 'vice_approver')];
    const stations = stationsForType(20, catalog, people);
    expect(stations.map((s) => s.id)).toEqual(['admin_ict', 'vice_approver']);
    expect(stations.map((s) => s.label)).toEqual(['מפקד תקשוב', 'נציג מוקד']);
    expect(stations.map((s) => s.people)).toEqual([['טל'], ['רוני', 'גיל']]);
    expect(hasEmptyStation(stationsForType(24, catalog, [manager('טל', 'admin_ict')]))).toBe(true);
  });
});

describe('the clearance grant (14): whoever works its route', () => {
  it('lists the requester, the owner and the coordinator with their holders', () => {
    const people = [manager('דנה', 'department_security_officer'), manager('יוסי', 'infosec_officer'), manager('מיכל', 'interview_coordinator')];
    const stations = stationsForType(14, catalog, people);
    expect(stations.map((s) => s.id)).toEqual(['department_security_officer', 'infosec_officer', 'interview_coordinator']);
    expect(stations.map((s) => s.label)).toEqual(['קב"ט מחלקתי', 'קצין ביטחון מידע', 'מתאם תחקיר']);
    expect(stations.map((s) => s.people)).toEqual([['דנה'], ['יוסי'], ['מיכל']]);
    expect(hasEmptyStation(stationsForType(14, catalog, [manager('יוסי', 'infosec_officer')]))).toBe(true);
  });
});
