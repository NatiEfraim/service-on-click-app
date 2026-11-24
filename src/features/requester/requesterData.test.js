import { describe, expect, it, vi } from 'vitest';
import { OPEN_STATUS_IDS, requesterApi } from '@/lib/api/endpoints';
import { counterOf, fetchMyRequests, requestCategories, requestRoute, shownFields, stageOf, accessibleBookingTypeIds, cleanInput, inputRuleOf, todayIso } from './requesterData';

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

describe('shownFields (a field that depends on another field\'s choice: the server\'s depends_on)', () => {
  const choice = (id, name) => ({ id, name, code: null, isInput: false, inputType: 'text', ltr: false, children: [] });
  const installType = { id: 1, fieldName: 'install_type', kind: 'select', required: true, dependsOn: null, options: [choice(11, 'מדפסת מחוברת'), choice(12, 'מדפסת חדשה')] };
  const printerIp = { id: 2, fieldName: 'printer_ip', kind: 'text', required: true, dependsOn: { field: 'install_type', values: ['מדפסת מחוברת'] }, options: [] };
  const fields = [installType, printerIp];

  it('hides the printer IP until a connected printer is picked', () => {
    expect(shownFields(fields, {}).map((f) => f.id)).toEqual([1]);
    expect(shownFields(fields, { 1: 12 }).map((f) => f.id)).toEqual([1]);
  });

  it('shows the printer IP, required as the server marks it, for a connected printer', () => {
    const shown = shownFields(fields, { 1: 11 });
    expect(shown.map((f) => f.id)).toEqual([1, 2]);
    expect(shown[1].required).toBe(true);
  });

  it('compares a typed parent by its value, and hides a field whose parent is not on the form', () => {
    const network = { id: 3, fieldName: 'network', kind: 'text', required: true, dependsOn: null, options: [] };
    const extra = { id: 4, fieldName: 'extra', kind: 'text', required: false, dependsOn: { field: 'network', values: ['TNG'] }, options: [] };
    expect(shownFields([network, extra], { 3: 'TNG' }).map((f) => f.id)).toEqual([3, 4]);
    expect(shownFields([network, extra], { 3: 'ARMY' }).map((f) => f.id)).toEqual([3]);
    expect(shownFields([extra], {}).map((f) => f.id)).toEqual([]);
  });

  it('leaves a form without dependent fields as it is', () => {
    const plain = [installType, { ...printerIp, dependsOn: null }];
    expect(shownFields(plain, {})).toBe(plain);
  });
});

describe('the service desk (20-25): a route of its own for the requester too', () => {
  it('stages its statuses: the queue, a representative\'s hands, closed', () => {
    expect(stageOf(1, 20)).toBe('service_desk_queue');
    expect(stageOf(151, 20)).toBe('service_desk_handling');
    expect(stageOf(5, 20)).toBe('closed');
    expect(stageOf(7, 20)).toBe('closed');
  });

  it('draws the submission, its queue and handling, and its closing, placing the request at its stage', () => {
    const sent = requestRoute(1, 20);
    expect(sent.stations.map((station) => station.id)).toEqual(['received', 'service_desk_queue', 'service_desk_handling', 'closed']);
    expect(sent.stations.map((station) => station.label)).toEqual(['הוגשה', 'הקריאה נשלחה', 'בטיפול המוקד', 'סיום טיפול']);
    expect(sent).toMatchObject({ here: 1, mode: 'here' });
    expect(requestRoute(151, 20)).toMatchObject({ here: 2, mode: 'here' });
    expect(requestRoute(5, 20)).toMatchObject({ here: 3, mode: 'finished' });
    expect(requestRoute(7, 20)).toMatchObject({ here: 3, mode: 'stopped' });
  });

  it('counts a request in the desk\'s hands as handling and a completed one as done', () => {
    expect(counterOf({ statusId: 151 })).toBe('handling');
    expect(counterOf({ statusId: 1 })).toBe('handling');
    expect(counterOf({ statusId: 5 })).toBe('done');
    expect(counterOf({ statusId: 7 })).toBeNull();
  });
});

describe('accessibleBookingTypeIds (every category a user has access to)', () => {
  const ALL = Array.from({ length: 25 }, (_, i) => i + 1);
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const perms = (role, ids) => ids.map((id) => `${role}_${id}`);

  it('super admin: every type', () => {
    expect(accessibleBookingTypeIds({ is_super_admin: true, permissions: [] }, ALL)).toEqual(ALL);
  });

  it('infosec officer: 14, 15, 16 although the server manages only 14 for them', () => {
    const me = { permissions: perms('infosec_officer', [14, 15, 16]), managed_booking_types: [14], dashboard_booking_types: [14] };
    expect(accessibleBookingTypeIds(me, ALL)).toEqual([14, 15, 16]);
  });

  it('infosec officer who also holds the camp roles: the service domains too', () => {
    const me = { permissions: [...perms('infosec_officer', [14, 15, 16]), ...perms('approver', range(1, 13))], managed_booking_types: [14] };
    expect(accessibleBookingTypeIds(me, ALL)).toEqual(range(1, 16));
  });

  it('the service desk: its representative and its commander see the six תקשוב types', () => {
    expect(accessibleBookingTypeIds({ permissions: perms('vice_approver', range(20, 25)), managed_booking_types: range(20, 25) }, ALL)).toEqual(range(20, 25));
    expect(accessibleBookingTypeIds({ permissions: perms('admin_ict', range(20, 25)), managed_booking_types: range(20, 25), dashboard_booking_types: range(20, 25) }, ALL)).toEqual(range(20, 25));
  });

  it('department security officer and interview coordinator: the clearance grant', () => {
    expect(accessibleBookingTypeIds({ permissions: ['department_security_officer_14'] }, ALL)).toEqual([14]);
    expect(accessibleBookingTypeIds({ permissions: ['interview_coordinator_14'], managed_booking_types: [14] }, ALL)).toEqual([14]);
  });

  it('plain user: every type they may submit (user_1 .. user_25 but not 14)', () => {
    const ids = ALL.filter((id) => id !== 14);
    expect(accessibleBookingTypeIds({ permissions: perms('user', ids) }, ALL)).toEqual(ids);
  });

  it('camp commander: the domains they administer', () => {
    expect(accessibleBookingTypeIds({ permissions: perms('admin', [1, 2, 5]), managed_booking_types: [1, 2, 5] }, ALL)).toEqual([1, 2, 5]);
  });

  it('a type outside the catalog is never invented', () => {
    expect(accessibleBookingTypeIds({ permissions: ['approver_99'] }, ALL)).toEqual([]);
  });
});
describe('cleanInput (what may be typed in a form field)', () => {
  it('ID number: digits only, at most 9', () => {
    expect(cleanInput(inputRuleOf('personal_id'), '12a3-456 78901')).toBe('123456789');
  });
  it('personal number: digits only, at most 8', () => {
    expect(cleanInput(inputRuleOf('personal_number'), '123456789')).toBe('12345678');
  });
  it('phone: digits only, at most 10', () => {
    expect(cleanInput(inputRuleOf('phone'), '054-123 45678')).toBe('0541234567');
    expect(cleanInput(inputRuleOf('commander_phone'), '05412345678')).toBe('0541234567');
  });
  it('names, department, branch, rank, commander: letters only, no digits', () => {
    expect(cleanInput(inputRuleOf('first_name'), 'דניאל1')).toBe('דניאל');
    expect(cleanInput(inputRuleOf('last_name'), "בן-חיים אבו'ת")).toBe("בן-חיים אבו'ת");
    expect(cleanInput(inputRuleOf('rank'), 'רס"ל 7')).toBe('רס"ל ');
    expect(cleanInput(inputRuleOf('commander_name'), 'Dan 2')).toBe('Dan ');
  });
  it('any other field is left as typed', () => {
    expect(cleanInput(inputRuleOf('notes'), 'abc 123')).toBe('abc 123');
  });
  it('section and role (פתיחת משתמש): letters only', () => {
    expect(cleanInput(inputRuleOf('section'), 'מדור 3')).toBe('מדור ');
    expect(cleanInput(inputRuleOf('role'), 'קצין1')).toBe('קצין');
  });
  it("a permission's receiver: digits only, at most 9 (the server takes 5-9)", () => {
    expect(cleanInput(inputRuleOf('beneficiary'), 'm.a 1234567890')).toBe('123456789');
  });
  it('a device serial: letters, digits and hyphen, at most 100, left to right', () => {
    expect(cleanInput(inputRuleOf('serial'), 'SN-12 34/ab!')).toBe('SN-1234ab');
    expect(cleanInput(inputRuleOf('serial'), 'A'.repeat(120))).toHaveLength(100);
    expect(inputRuleOf('serial').ltr).toBe(true);
  });
  it('a folder name drops what a folder name cannot hold', () => {
    expect(cleanInput(inputRuleOf('folder_name'), 'דוחות: 2026/רבעון "1"?')).toBe('דוחות 2026רבעון 1');
  });
  it('folder owners: personal numbers with commas, spaces and new lines', () => {
    expect(cleanInput(inputRuleOf('owners'), '1234567, 7654321\n99805335;abc')).toBe('1234567, 7654321\n99805335');
  });
  it('size in GB: digits only', () => {
    expect(cleanInput(inputRuleOf('size'), '12.5 GB')).toBe('125');
  });
  it('a computer name: English letters, digits and hyphen, no spaces', () => {
    expect(cleanInput(inputRuleOf('computer_name'), 'PC-12 אב_3')).toBe('PC-123');
  });
  it("a printer's IP: digits and dots, at most 15", () => {
    expect(cleanInput(inputRuleOf('printer_ip'), '10.0.0.1 ip')).toBe('10.0.0.1');
    expect(cleanInput(inputRuleOf('printer_ip'), '255.255.255.2555')).toBe('255.255.255.255');
  });
  it('paths and OUs are written left to right, as typed', () => {
    for (const name of ['path', 'ou_upper', 'ou_lower']) {
      expect(inputRuleOf(name).ltr).toBe(true);
      expect(cleanInput(inputRuleOf(name), '\\\\srv\\share')).toBe('\\\\srv\\share');
    }
  });
  it('dates: an "until" not before today, an incident not after today', () => {
    expect(inputRuleOf('until').notBefore).toBe('today');
    expect(inputRuleOf('incident_date').notAfter).toBe('today');
  });
});

describe('todayIso', () => {
  it('is the local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
