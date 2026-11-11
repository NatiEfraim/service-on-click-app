import { describe, expect, it } from 'vitest';
import { requestRoute, stageOf } from './requesterData';

/** Booking type ids: a plain domain (בינוי), הובלות (starts at the control officer), the barber. */
const CONSTRUCTION = 13;
const TRANSPORT = 8;
const BARBER = 5;

describe('stageOf (the API Workflow::stageOf, for a requester)', () => {
  it('sends a received request of a plain domain to the handler, and of הובלות to the control officer', () => {
    expect(stageOf(1, CONSTRUCTION)).toBe('vice_approver');
    expect(stageOf(1, TRANSPORT)).toBe('control_officer');
  });

  it('follows the route through the handler, the commander and realization', () => {
    expect(stageOf(14, TRANSPORT)).toBe('vice_approver');
    expect(stageOf(17, TRANSPORT)).toBe('vice_approver');
    expect(stageOf(2, CONSTRUCTION)).toBe('approver');
    expect(stageOf(15, CONSTRUCTION)).toBe('approver');
    expect(stageOf(16, CONSTRUCTION)).toBe('approver');
    expect(stageOf(3, CONSTRUCTION)).toBe('realization');
  });

  it('puts the supplier holds on their own stages', () => {
    expect(stageOf(8, TRANSPORT)).toBe('supplier_files');
    expect(stageOf(9, TRANSPORT)).toBe('supplier_approval');
    expect(stageOf(10, TRANSPORT)).toBe('supplier_number');
  });

  it('closes every terminal status', () => {
    for (const status of [4, 5, 6, 7, 12, 13]) expect(stageOf(status, CONSTRUCTION)).toBe('closed');
  });

  it('gives the barber one step: waiting for the barber until approved (the end) or closed', () => {
    expect(stageOf(1, BARBER)).toBe('barber');
    expect(stageOf(11, BARBER)).toBe('closed');
    expect(stageOf(12, BARBER)).toBe('closed');
    expect(stageOf(6, BARBER)).toBe('closed');
  });
});

describe('requestRoute (drawn as the management screens draw it)', () => {
  const labels = (route) => route.stations.map((station) => station.label);

  it('draws a plain domain without the control officer', () => {
    const route = requestRoute(2, CONSTRUCTION);
    expect(labels(route)).toEqual(['התקבלה', 'גורם מטפל', 'מפקד תחום', 'מימוש', 'סגירה']);
    expect(route.stations[route.here].id).toBe('approver');
    expect(route.mode).toBe('here');
  });

  it('draws הובלות with the control officer, and a supplier hold at the commander', () => {
    expect(labels(requestRoute(1, TRANSPORT))).toEqual(['התקבלה', 'רמ"ד תו"ב', 'גורם מטפל', 'מפקד תחום', 'מימוש', 'סגירה']);
    const hold = requestRoute(9, TRANSPORT);
    expect(hold.stations[hold.here].id).toBe('approver');
    expect(hold.mode).toBe('hold');
  });

  it('draws the barber as received → the barber → closed, finished when approved', () => {
    const waiting = requestRoute(1, BARBER);
    expect(labels(waiting)).toEqual(['התקבלה', 'הספר', 'סגירה']);
    expect(waiting.stations[waiting.here].id).toBe('barber');
    const approved = requestRoute(11, BARBER);
    expect(labels(approved)).toEqual(['התקבלה', 'הספר', 'סגירה']);
    expect(approved.mode).toBe('finished');
  });

  it('ends a completed request finished and a rejected one stopped', () => {
    expect(requestRoute(5, CONSTRUCTION).mode).toBe('finished');
    expect(requestRoute(4, CONSTRUCTION).mode).toBe('stopped');
  });
});
