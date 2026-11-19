import { describe, expect, it, vi } from 'vitest';
import { OPEN_STATUS_IDS, requesterApi } from '@/lib/api/endpoints';
import { counterOf, fetchMyRequests, requestCategories, requestRoute, shownFields, stageOf } from './requesterData';

/** Booking type ids: a plain domain (בינוי), הובלות (starts at the control officer), the barber. */
const CONSTRUCTION = 13;
const TRANSPORT = 8;
const BARBER = 5;

describe('fetchMyRequests', () => {
  it('filters open requests on the server and reads past the history page limit', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({ uuid: String(index), status: { id: 2 } }));
    const lastPage = [{ uuid: 'older', status: { id: 8 } }];
    const myBookings = vi.spyOn(requesterApi, 'myBookings').mockImplementation(async (page) => ({
      data: page <= 10 ? firstPage : lastPage,
    }));
    try {
      const signal = new AbortController().signal;
      const requests = await fetchMyRequests(signal, { openOnly: true });
      expect(myBookings).toHaveBeenCalledWith(11, OPEN_STATUS_IDS, signal);
      expect(requests.at(-1)).toMatchObject({ id: 'older', statusId: 8 });
    } finally {
      myBookings.mockRestore();
    }
  });
});

describe('requestCategories', () => {
  it('includes request types outside the managed and requester catalogs without duplicating known types', () => {
    const managed = { id: 'd8', name: 'Managed', typeIds: [8] };
    const catalog = { id: 'd13', name: 'Catalog', typeIds: [13] };
    const rows = [
      { bookingTypeId: 5, typeName: 'Own request' },
      { bookingTypeId: 5, typeName: 'Own request' },
      { bookingTypeId: 13, typeName: 'Use catalog metadata' },
    ];

    expect(requestCategories(rows, [catalog], [managed])).toEqual([
      expect.objectContaining({ id: 'd5', name: 'Own request', typeIds: [5] }),
      managed,
      catalog,
    ]);
  });
});

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

describe('the clearance grant (14): a route of its own', () => {
  it('stages its statuses by its steps, closed at the end or the refusal', () => {
    expect(stageOf(101, 14)).toBe('interview_assignment');
    expect(stageOf(102, 14)).toBe('interview_scheduled');
    expect(stageOf(103, 14)).toBe('interviewed');
    expect(stageOf(104, 14)).toBe('awaiting_clearance');
    expect(stageOf(105, 14)).toBe('closed');
    expect(stageOf(4, 14)).toBe('closed');
  });

  it('draws its steps as the route, finished when the clearance was granted', () => {
    const scheduled = requestRoute(102, 14);
    expect(scheduled.stations.map((station) => station.label)).toEqual(['הוגשה', 'הקצאה לתחקיר', 'נקבע מול המועמד', 'תוחקר', 'ממתין לקבלת הכשר', 'קיבל הכשר ביטחוני']);
    expect(scheduled.stations[scheduled.here].id).toBe('interview_scheduled');
    expect(scheduled.mode).toBe('here');
    expect(requestRoute(105, 14).mode).toBe('finished');
    expect(requestRoute(4, 14).mode).toBe('stopped');
  });

  it('counts a granted clearance as done and its open steps as handling', () => {
    expect(counterOf({ statusId: 105 })).toBe('done');
    expect(counterOf({ statusId: 101 })).toBe('handling');
    expect(counterOf({ statusId: 104 })).toBe('handling');
    expect(counterOf({ statusId: 4 })).toBeNull();
  });
});

describe('shownFields (fields tied to a choice of another field)', () => {
  const choice = (id, name) => ({ id, name, code: null, isInput: false, inputType: 'text', ltr: false, children: [] });
  const installType = { id: 1, fieldName: 'install_type', required: true, options: [choice(11, 'מדפסת מחוברת'), choice(12, 'מדפסת חדשה')] };
  const printerIp = { id: 2, fieldName: 'printer_ip', required: false, options: [] };
  const fields = [installType, printerIp];

  it('hides the printer IP until a connected printer is picked', () => {
    expect(shownFields(21, fields, {}).map((f) => f.id)).toEqual([1]);
    expect(shownFields(21, fields, { 1: 12 }).map((f) => f.id)).toEqual([1]);
  });

  it('shows the printer IP, required, for a connected printer', () => {
    const shown = shownFields(21, fields, { 1: 11 });
    expect(shown.map((f) => f.id)).toEqual([1, 2]);
    expect(shown[1].required).toBe(true);
  });

  it('leaves other types alone', () => {
    expect(shownFields(22, fields, {})).toBe(fields);
  });
});
