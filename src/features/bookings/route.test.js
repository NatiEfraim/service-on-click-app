import { describe, expect, it } from 'vitest';

import { routeFor, routePosition } from './route';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 3, 4, 5, 6, 7, 11, 12, 13, 15, 16],
  },
};

const ids = (stations) => stations.map((s) => s.id);
const entry = (statusId) => ({ action_type_id: null, action_label: null, status_id: statusId, status_label: '', actor_name: null, actor_id: null, source: 'external', occurred_at: '', correlation_id: null });

describe('routeFor', () => {
  it('is received - vice approver - approver - realization - closed for an ordinary type', () => {
    expect(ids(routeFor({ booking_type_id: 1, stage: 'approver' }, catalog))).toEqual(['received', 'vice_approver', 'approver', 'realization', 'closed']);
  });

  it('adds the barber station for a type that can reach "handled by the barber"', () => {
    expect(ids(routeFor({ booking_type_id: 5, stage: 'approver' }, catalog))).toEqual(['received', 'vice_approver', 'approver', 'realization', 'barber_done', 'closed']);
  });

  it('adds the control-officer station only when a booking is, or has been, in it', () => {
    expect(ids(routeFor({ booking_type_id: 1, stage: 'control_officer' }, catalog))).toContain('control_officer');
    expect(ids(routeFor({ booking_type_id: 1, stage: 'vice_approver' }, catalog, [entry(1), entry(17)]))).toContain('control_officer');
    expect(ids(routeFor({ booking_type_id: 1, stage: 'vice_approver' }, catalog, [entry(1), entry(15)]))).not.toContain('control_officer');
  });

  it('copes with a missing catalog', () => {
    expect(ids(routeFor({ booking_type_id: 1, stage: 'approver' }, undefined))).toEqual(['received', 'vice_approver', 'approver', 'realization', 'closed']);
  });
});

describe('routePosition', () => {
  const stations = routeFor({ booking_type_id: 1, stage: 'approver' }, catalog);

  it('marks the current station', () => {
    expect(routePosition({ stage: 'vice_approver', status_id: 1 }, stations)).toEqual({ here: 1, mode: 'here' });
    expect(routePosition({ stage: 'realization', status_id: 3 }, stations)).toEqual({ here: 3, mode: 'here' });
  });

  it('puts a supplier wait on hold at the approver (the decision stays with the domain commander)', () => {
    expect(routePosition({ stage: 'supplier_approval', status_id: 9 }, stations)).toEqual({ here: 2, mode: 'hold' });
  });

  it('ends at the last station: finished when completed, stopped otherwise', () => {
    expect(routePosition({ stage: 'closed', status_id: 5 }, stations)).toEqual({ here: 4, mode: 'finished' });
    expect(routePosition({ stage: 'closed', status_id: 4 }, stations)).toEqual({ here: 4, mode: 'stopped' });
  });
});

describe('parked holds from the updated API', () => {
  it.each([8, 9, 10])('keeps status %s at the control officer and marks it as on hold', (status_id) => {
    const booking = { booking_type_id: 8, stage: 'control_officer', status_id };
    const stations = routeFor(booking, catalog);
    expect(routePosition(booking, stations)).toEqual({ here: ids(stations).indexOf('control_officer'), mode: 'hold' });
  });
  it.each(['vice_approver', 'approver'])('preserves the server supplied %s stage while waiting', (stage) => {
    const stations = routeFor({ booking_type_id: 1, stage }, catalog);
    expect(routePosition({ stage, status_id: 10 }, stations)).toEqual({ here: ids(stations).indexOf(stage), mode: 'hold' });
  });
  it('keeps the control officer in routes after takeover when the catalog includes that stage', () => {
    const stations = routeFor({ booking_type_id: 8, stage: 'vice_approver' }, { booking_type_statuses: { 8: [1, 17, 18, 15, 16] } });
    expect(ids(stations)).toContain('control_officer');
  });
});
