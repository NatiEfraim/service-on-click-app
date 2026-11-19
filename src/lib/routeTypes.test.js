import { describe, expect, it } from 'vitest';
import { hasOwnRoute, isRouteStatus, routeOf, routeRoles, routeStageOf, routeSteps, sectionLabel } from './routeTypes';

const catalog = {
  statuses: [{ id: 101, name: 'interview_assignment' }, { id: 102, name: 'interview_scheduled' }, { id: 103, name: 'interviewed' }, { id: 104, name: 'awaiting_clearance' }, { id: 105, name: 'clearance_granted' }],
  sections: [{ id: 'requester', label: 'פרטים נוספים' }, { id: 'handler', label: 'למילוי על ידי גורמים רלוונטיים' }],
  routes: {
    14: {
      key: 'clearance_grant',
      initial_status_id: 101,
      success_status_id: 105,
      status_ids: [101, 102, 103, 104, 105, 4],
      steps: [{ status_id: 101, label: 'הקצאה לתחקיר' }, { status_id: 102, label: 'נקבע מול המועמד' }, { status_id: 103, label: 'תוחקר' }, { status_id: 104, label: 'ממתין לקבלת הכשר' }, { status_id: 105, label: 'קיבל הכשר ביטחוני' }],
      requester_role: { id: 9, name: 'department_security_officer', label: 'קב"ט מחלקתי' },
      owner_role: { id: 7, name: 'infosec_officer', label: 'קצין ביטחון מידע' },
      roles: [{ id: 7, name: 'infosec_officer', label: 'קצין ביטחון מידע' }, { id: 10, name: 'interview_coordinator', label: 'מתאם תחקיר' }],
    },
  },
};

describe('route types', () => {
  it('knows the clearance grant and nothing else', () => {
    expect(hasOwnRoute(14)).toBe(true);
    expect(hasOwnRoute('14')).toBe(true);
    expect(hasOwnRoute(15)).toBe(false);
    expect(isRouteStatus(101)).toBe(true);
    expect(isRouteStatus(18)).toBe(false);
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
});
