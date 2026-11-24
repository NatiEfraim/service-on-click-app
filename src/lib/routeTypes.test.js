import { describe, expect, it } from 'vitest';
import { hasHandlerSection, hasOwnRoute, isRouteStatus, routeHandlerStages, routeOf, routeRoleLabel, routeRoles, routeStageOf, routeStages, routeStatusLabel, routeSteps, sectionLabel } from './routeTypes';

const catalog = {
  statuses: [{ id: 1, name: 'received' }, { id: 5, name: 'completed' }, { id: 101, name: 'interview_assignment' }, { id: 102, name: 'interview_scheduled' }, { id: 103, name: 'interviewed' }, { id: 104, name: 'awaiting_clearance' }, { id: 105, name: 'clearance_granted' }, { id: 151, name: 'in_service_desk' }],
  sections: [{ id: 'requester', label: 'פרטים נוספים' }, { id: 'handler', label: 'למילוי על ידי גורמים רלוונטיים' }],
  routes: {
    14: {
      key: 'clearance_grant',
      initial_status_id: 101,
      success_status_id: 105,
      status_ids: [101, 102, 103, 104, 105, 4],
      steps: [{ status_id: 101, label: 'הקצאה לתחקיר' }, { status_id: 102, label: 'נקבע מול המועמד' }, { status_id: 103, label: 'תוחקר' }, { status_id: 104, label: 'ממתין לקבלת הכשר' }, { status_id: 105, label: 'קיבל הכשר ביטחוני' }],
      requester_role: { id: 103, name: 'department_security_officer', label: 'קב"ט מחלקתי' },
      owner_role: { id: 101, name: 'infosec_officer', label: 'קצין ביטחון מידע' },
      roles: [{ id: 101, name: 'infosec_officer', label: 'קצין ביטחון מידע' }, { id: 104, name: 'interview_coordinator', label: 'מתאם תחקיר' }],
    },
    // the service desk's route as the API serves it: the shared statuses with their mobile names, the roles with the API's own names
    20: {
      key: 'ict_service_desk',
      initial_status_id: 1,
      success_status_id: 5,
      status_ids: [1, 151, 5, 7, 6],
      steps: [{ status_id: 1, label: 'ההזמנה נשלחה' }, { status_id: 151, label: 'בטיפול המוקד' }, { status_id: 5, label: 'סיום טיפול' }],
      requester_role: { id: 5, name: 'user', label: 'משתמש ' },
      owner_role: { id: 152, name: 'admin_ict', label: 'מפקד תקשוב' },
      roles: [{ id: 4, name: 'vice_approver', label: 'גורם מטפל' }, { id: 152, name: 'admin_ict', label: 'מפקד תקשוב' }],
    },
  },
};

describe('route types', () => {
  it('knows the clearance grant and the six service desk types, and nothing else', () => {
    expect(hasOwnRoute(14)).toBe(true);
    expect(hasOwnRoute('14')).toBe(true);
    for (const id of [20, 21, 22, 23, 24, 25]) expect(hasOwnRoute(id)).toBe(true);
    expect(hasOwnRoute(15)).toBe(false);
    expect(hasOwnRoute(1)).toBe(false);
    expect(isRouteStatus(101)).toBe(true);
    expect(isRouteStatus(151)).toBe(true);
    expect(isRouteStatus(18)).toBe(false);
  });

  it('lets the catalog say which types have a route', () => {
    expect(hasOwnRoute(99, { routes: { 99: { key: 'future', steps: [] } } })).toBe(true);
    expect(hasOwnRoute(20, catalog)).toBe(true);
    expect(hasOwnRoute(1, catalog)).toBe(false);
  });

  it('reads the route from the catalog, giving each step its stage key from the status name', () => {
    expect(routeSteps(14, catalog).map((step) => step.key)).toEqual(['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance', 'clearance_granted']);
    expect(routeOf(14, catalog).owner_role.name).toBe('infosec_officer');
    expect(routeOf(1, catalog)).toBeNull();
  });

  it('falls back to the known route without a catalog (the requester portal)', () => {
    expect(routeSteps(14).map((step) => step.label)).toEqual(['הקצאה לתחקיר', 'נקבע מול המועמד', 'תוחקר', 'ממתין לקבלת הכשר', 'קיבל הכשר ביטחוני']);
    expect(routeSteps(1)).toEqual([]);
  });

  it('stages a status as the API does: the step, closed at the end or the refusal, the start for anything else', () => {
    expect(routeStageOf(101, 14)).toBe('interview_assignment');
    expect(routeStageOf(102, 14, catalog)).toBe('interview_scheduled');
    expect(routeStageOf(104, 14)).toBe('awaiting_clearance');
    expect(routeStageOf(105, 14)).toBe('closed');
    expect(routeStageOf(4, 14)).toBe('closed');
    expect(routeStageOf(1, 14)).toBe('interview_assignment');
    expect(routeStageOf(1, 1)).toBeNull();
  });

  it('names the sections and lists the roles requester first, then the owner, then the coordinator', () => {
    expect(sectionLabel('handler', catalog)).toBe('למילוי על ידי גורמים רלוונטיים');
    expect(sectionLabel('requester')).toBe('פרטים נוספים');
    expect(routeRoles(14, catalog).map((role) => role.name)).toEqual(['department_security_officer', 'infosec_officer', 'interview_coordinator']);
    expect(routeRoles(14).map((role) => role.label)).toEqual(['קב"ט מחלקתי', 'קצין ביטחון מידע', 'מתאם תחקיר']);
    expect(routeRoles(5)).toEqual([]);
  });

  it('knows the clearance grant has a section the handlers fill, and its handlers\' turns', () => {
    expect(hasHandlerSection(14)).toBe(true);
    expect(hasHandlerSection(1)).toBe(false);
    expect(routeStages(14)).toEqual(['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance']);
    expect(routeHandlerStages(14)).toEqual(['interview_assignment', 'interviewed']);
    expect(routeStatusLabel(4, 14)).toBe('נדחתה ע"י קצין ביטחון מידע');
    expect(routeStatusLabel(102, 14)).toBeNull();
  });
});

describe('the service desk (תקשוב, 20-25): sent, in handling, closed', () => {
  it('stages its statuses: the queue, the handling, closed at the end - and older data waits in the queue', () => {
    expect(routeStageOf(1, 20)).toBe('service_desk_queue');
    expect(routeStageOf(151, 20)).toBe('service_desk_handling');
    expect(routeStageOf(151, 20, catalog)).toBe('service_desk_handling');
    expect(routeStageOf(5, 25)).toBe('closed');
    expect(routeStageOf(7, 25)).toBe('closed');
    expect(routeStageOf(6, 25)).toBe('closed');
    expect(routeStageOf(3, 22)).toBe('service_desk_queue');
    expect(routeStages(20)).toEqual(['service_desk_queue', 'service_desk_handling']);
    expect(routeHandlerStages(21, catalog)).toEqual(['service_desk_queue', 'service_desk_handling']);
  });

  it('draws its three steps, each knowing the stage it stands for, from the catalog or without one', () => {
    expect(routeSteps(20).map((step) => [step.status_id, step.stage, step.label])).toEqual([[1, 'service_desk_queue', 'הקריאה נשלחה'], [151, 'service_desk_handling', 'בטיפול המוקד'], [5, 'closed', 'סיום טיפול']]);
    expect(routeSteps(20, catalog).map((step) => step.stage)).toEqual(['service_desk_queue', 'service_desk_handling', 'closed']);
    expect(routeSteps(20, catalog).map((step) => step.key)).toEqual(['received', 'in_service_desk', 'completed']);
    expect(routeOf(23).key).toBe('ict_service_desk');
    expect(routeOf(23).initial_status_id).toBe(1);
  });

  it('has no section the handlers fill: its forms are the requester\'s alone', () => {
    expect(hasHandlerSection(20)).toBe(false);
    expect(hasHandlerSection(20, catalog)).toBe(false);
  });

  it('names its people the desk\'s way: the representative, the commander, every user as the requester', () => {
    expect(routeRoles(20).map((role) => [role.name, role.label])).toEqual([['user', 'משתמש'], ['admin_ict', 'מפקד תקשוב'], ['vice_approver', 'נציג מוקד']]);
    // the catalog's roles carry the API's names (and a stray space): the desk's words win, trimmed
    expect(routeRoles(20, catalog).map((role) => role.label)).toEqual(['משתמש', 'מפקד תקשוב', 'נציג מוקד']);
    expect(routeRoleLabel('vice_approver', 20)).toBe('נציג מוקד');
    expect(routeRoleLabel('vice_approver', 20, catalog)).toBe('נציג מוקד');
    expect(routeRoleLabel('admin_ict', 24)).toBe('מפקד תקשוב');
    expect(routeRoleLabel('vice_approver', 1)).toBeNull();
    expect(routeRoleLabel('approver', 20)).toBeNull();
  });

  it('names the shared statuses for a request, not an order', () => {
    expect(routeStatusLabel(1, 20)).toBe('הקריאה נשלחה');
    expect(routeStatusLabel(7, 20)).toBe('נסגרה ללא ביצוע');
    expect(routeStatusLabel(6, 20)).toBe('בוטלה ע"י המבקש');
    expect(routeStatusLabel(5, 20)).toBe('סיום טיפול');
    expect(routeStatusLabel(151, 20)).toBeNull();
    expect(routeStatusLabel(1, 1)).toBeNull();
  });
});
