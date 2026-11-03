import { describe, expect, it } from 'vitest';

import { campCommanders, hasEmptyStation, peopleWithRoles, stationsForType } from './stations';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 3, 4, 5, 6, 7, 11, 12, 13, 15, 16],
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

  it('adds the barber step where "handled by the barber" can be reached, held by the vice approver and the approver', () => {
    const stations = stationsForType(5, catalog, managers);
    expect(stations.map((s) => s.id)).toEqual(['vice_approver', 'approver', 'realization', 'barber_done']);
    expect(stations.find((s) => s.id === 'barber_done')?.people).toEqual(['דנה', 'גיל', 'נעם']);
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
