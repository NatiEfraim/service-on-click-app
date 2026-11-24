import { describe, expect, it } from 'vitest';

import { bookingRoute, isFinishedStatus, progressRoute, routeFor, routePosition } from './route';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 6, 11, 12, 13],
  },
};

const ids = (stations) => stations.map((s) => s.id);
const entry = (statusId) => ({ action_type_id: null, action_label: null, status_id: statusId, status_label: '', actor_name: null, actor_id: null, source: 'external', occurred_at: '', correlation_id: null });

describe('routeFor', () => {
  it('is received - vice approver - approver - realization - closed for an ordinary type', () => {
    expect(ids(routeFor({ booking_type_id: 1, stage: 'approver' }, catalog))).toEqual(['received', 'vice_approver', 'approver', 'realization', 'closed']);
  });

  it('gives a barber booking its one step: received - barber - closed', () => {
    expect(ids(routeFor({ booking_type_id: 5, stage: 'barber' }, catalog))).toEqual(['received', 'barber', 'closed']);
  });

  it('finishes a barber booking approved by the barber, stops a rejected one', () => {
    const stations = routeFor({ booking_type_id: 5, stage: 'closed' }, catalog);
    expect(routePosition({ stage: 'closed', status_id: 11 }, stations)).toEqual({ here: 2, mode: 'finished' });
    expect(routePosition({ stage: 'closed', status_id: 12 }, stations)).toEqual({ here: 2, mode: 'stopped' });
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

describe('a type with a route of its own (the clearance grant)', () => {
  const routes = {
    statuses: [{ id: 101, name: 'interview_assignment' }, { id: 102, name: 'interview_scheduled' }, { id: 103, name: 'interviewed' }, { id: 104, name: 'awaiting_clearance' }, { id: 105, name: 'clearance_granted' }],
    routes: { 14: { success_status_id: 105, steps: [{ status_id: 101, label: 'הקצאה לתחקיר' }, { status_id: 102, label: 'נקבע מול המועמד' }, { status_id: 103, label: 'תוחקר' }, { status_id: 104, label: 'ממתין לקבלת הכשר' }, { status_id: 105, label: 'קיבל הכשר ביטחוני' }] } },
  };

  it('draws the submission, its steps and its successful end as the closing station, from the catalog or without one', () => {
    const fromCatalog = routeFor({ booking_type_id: 14, stage: 'interview_scheduled' }, routes);
    expect(ids(fromCatalog)).toEqual(['received', 'interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance', 'closed']);
    expect(fromCatalog.at(-1).label).toBe('קיבל הכשר ביטחוני');
    expect(ids(routeFor({ booking_type_id: 14, stage: 'interview_scheduled' }))).toEqual(ids(fromCatalog));
  });

  it('places the request at its stage, finished at 105 and stopped at a refusal', () => {
    const stations = routeFor({ booking_type_id: 14, stage: 'interviewed' }, routes);
    expect(routePosition({ stage: 'interviewed', status_id: 103 }, stations)).toEqual({ here: 3, mode: 'here' });
    expect(routePosition({ stage: 'closed', status_id: 105 }, stations)).toEqual({ here: 5, mode: 'finished' });
    expect(routePosition({ stage: 'closed', status_id: 4 }, stations)).toEqual({ here: 5, mode: 'stopped' });
  });
});

describe('progressRoute (the server\'s progress bar)', () => {
  const steps = (current) => [
    { key: 'submitted', label: 'הוגשה', state: 'done', at: '2026-11-18T09:12:00+00:00' },
    { key: 'interview_assignment', status_id: 101, label: 'הקצאה לתחקיר', state: current > 101 ? 'done' : 'current', at: '2026-11-18T09:12:00+00:00' },
    { key: 'interview_scheduled', status_id: 102, label: 'נקבע מול המועמד', state: current === 102 ? 'current' : current > 102 ? 'done' : 'upcoming', at: current >= 102 ? '2026-11-18T10:00:00+00:00' : null },
    { key: 'interviewed', status_id: 103, label: 'תוחקר', state: current === 103 ? 'current' : current > 103 ? 'done' : 'upcoming', at: null },
    { key: 'awaiting_clearance', status_id: 104, label: 'ממתין לקבלת הכשר', state: current === 104 ? 'current' : current > 104 ? 'done' : 'upcoming', at: null },
    { key: 'clearance_granted', status_id: 105, label: 'קיבל הכשר ביטחוני', state: current === 105 ? 'done' : 'upcoming', at: null },
  ];

  it('marks the current step and keeps the time each passed step was reached', () => {
    const route = progressRoute(steps(102));
    expect(ids(route.stations)).toEqual(['submitted', 'interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance', 'closed']);
    expect(route.here).toBe(2);
    expect(route.mode).toBe('here');
    expect(route.stations[1].at).toBe('2026-11-18T09:12:00+00:00');
    expect(route.stations[3].at).toBeNull();
  });

  it('is finished once the last step is done', () => {
    expect(progressRoute(steps(105))).toMatchObject({ here: 5, mode: 'finished' });
  });

  it('ends a refused request at the refusal, after the steps it reached', () => {
    const refused = [...steps(102).map((row) => ({ ...row, state: row.state === 'current' ? 'done' : row.state })), { key: 'rejected', status_id: 4, label: 'נדחה', state: 'rejected', at: '2026-11-19T08:00:00+00:00' }];
    const route = progressRoute(refused);
    expect(ids(route.stations)).toEqual(['submitted', 'interview_assignment', 'interview_scheduled', 'closed']);
    expect(route.stations.at(-1).label).toBe('נדחה');
    expect(route).toMatchObject({ here: 3, mode: 'stopped' });
  });

  it('copes with nothing', () => {
    expect(progressRoute(null)).toEqual({ stations: [], here: 0, mode: 'here' });
  });
});

describe('the service desk (תקשוב, 20-25)', () => {
  const desk = {
    statuses: [{ id: 1, name: 'received' }, { id: 5, name: 'completed' }, { id: 151, name: 'in_service_desk' }],
    routes: { 20: { key: 'ict_service_desk', initial_status_id: 1, success_status_id: 5, status_ids: [1, 151, 5, 7, 6], steps: [{ status_id: 1, label: 'ההזמנה נשלחה' }, { status_id: 151, label: 'בטיפול המוקד' }, { status_id: 5, label: 'סיום טיפול' }] } },
  };

  it('draws the submission, the queue, the handling and the closing, every station once, from the catalog or without one', () => {
    const fromCatalog = routeFor({ booking_type_id: 20, stage: 'service_desk_queue' }, desk);
    expect(ids(fromCatalog)).toEqual(['received', 'service_desk_queue', 'service_desk_handling', 'closed']);
    expect(fromCatalog.map((station) => station.label)).toEqual(['הוגשה', 'ההזמנה נשלחה', 'בטיפול המוקד', 'סיום טיפול']);
    expect(ids(routeFor({ booking_type_id: 20, stage: 'service_desk_queue' }))).toEqual(ids(fromCatalog));
  });

  it('places a request in the queue, in a representative\'s hands, finished when done and stopped when closed without doing', () => {
    const stations = routeFor({ booking_type_id: 20, stage: 'service_desk_queue' }, desk);
    expect(routePosition({ stage: 'service_desk_queue', status_id: 1 }, stations)).toEqual({ here: 1, mode: 'here' });
    expect(routePosition({ stage: 'service_desk_handling', status_id: 151 }, stations)).toEqual({ here: 2, mode: 'here' });
    expect(routePosition({ stage: 'closed', status_id: 5 }, stations)).toEqual({ here: 3, mode: 'finished' });
    expect(routePosition({ stage: 'closed', status_id: 7 }, stations)).toEqual({ here: 3, mode: 'stopped' });
  });

  it('names the server\'s progress bar the desk\'s way, and stops it at a closing the bar does not know', () => {
    const progress = [
      { key: 'submitted', label: 'הוגשה', state: 'done', at: '2026-11-24T08:00:00+00:00' },
      { key: 'received', status_id: 1, label: 'ההזמנה נשלחה', state: 'done', at: '2026-11-24T08:00:00+00:00' },
      { key: 'in_service_desk', status_id: 151, label: 'בטיפול המוקד', state: 'current', at: '2026-11-24T09:00:00+00:00' },
      { key: 'completed', status_id: 5, label: 'סיום טיפול', state: 'upcoming', at: null },
    ];
    const handling = bookingRoute({ booking_type_id: 20, status_id: 151, stage: 'service_desk_handling', progress }, desk);
    expect(ids(handling.stations)).toEqual(['submitted', 'received', 'in_service_desk', 'closed']);
    expect(handling.stations.map((station) => station.label)).toEqual(['הוגשה', 'הקריאה נשלחה', 'בטיפול המוקד', 'סיום טיפול']);
    expect(handling).toMatchObject({ here: 2, mode: 'here' });

    // closed without doing (7): the server's bar still says the sent step is current; the route ends there, stopped
    const notDone = progress.map((row) => (row.status_id === 151 ? { ...row, state: 'upcoming', at: null } : row.status_id === 1 ? { ...row, state: 'current' } : row));
    const stopped = bookingRoute({ booking_type_id: 20, status_id: 7, stage: 'closed', status_label: 'נסגרה ללא ביצוע', progress: notDone }, desk);
    expect(ids(stopped.stations)).toEqual(['submitted', 'received', 'closed']);
    expect(stopped.stations.at(-1).label).toBe('נסגרה ללא ביצוע');
    expect(stopped).toMatchObject({ here: 2, mode: 'stopped' });
    expect(isFinishedStatus(5)).toBe(true);
    expect(isFinishedStatus(7)).toBe(false);
  });
});
