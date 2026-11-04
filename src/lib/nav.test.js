import { describe, expect, it } from 'vitest';

import { buildNav, canAct, homeKind, isActivePath, requestsHref } from './nav';

const NO_CAPABILITIES = {
  'audit.view': false,
  'sync.view': false,
  'sync.operate': false,
  'sla.manage': false,
  'config.global': false,
  'users.manage': false,
  'dashboard.view': false,
  'reports.view': false,
  'targets.manage': false,
};

function makeMe(over = {}) {
  const { caps = [], ...rest } = over;
  return {
    user: { uuid: 'u', personal_number: '1', personal_id: null, full_name: 'x', unit_id: 1, unit_name: 'H', department_id: null, department_name: null },
    roles: [],
    permissions: [],
    capabilities: { ...NO_CAPABILITIES, ...Object.fromEntries(caps.map((c) => [c, true])) },
    is_super_admin: false,
    is_admin: false,
    is_handler_only: false,
    managed_booking_types: [1],
    dashboard_booking_types: [1],
    ...rest,
  };
}

const labels = (me) => buildNav(me).map((entry) => entry.id);

describe('buildNav', () => {
  it('gives the super admin every screen (the queue only if they also act on a type)', () => {
    const me = makeMe({ is_super_admin: true, caps: ['audit.view', 'sync.view', 'sync.operate', 'config.global', 'users.manage', 'dashboard.view', 'reports.view', 'targets.manage'] });
    expect(labels(me)).toEqual(['home', 'requests', 'reports', 'manage', 'audit', 'sync']);
    const manage = buildNav(me).find((entry) => entry.id === 'manage');
    expect(manage?.kind === 'group' && manage.items.map((item) => item.id)).toEqual(['domains', 'users', 'org', 'hatch']);
  });

  it('gives an admin the list and users management, but not the service domains, history or sync', () => {
    const me = makeMe({ is_admin: true, caps: ['users.manage', 'dashboard.view', 'reports.view', 'targets.manage'] });
    expect(labels(me)).toEqual(['home', 'requests', 'reports', 'manage']);
    const manage = buildNav(me).find((entry) => entry.id === 'manage');
    expect(manage?.kind === 'group' && manage.items.map((item) => item.id)).toEqual(['users']);
  });

  it('gives the service domains to the super admin only', () => {
    const me = makeMe({ is_super_admin: true, caps: ['users.manage'] });
    const manage = buildNav(me).find((entry) => entry.id === 'manage');
    expect(manage?.kind === 'group' && manage.items.map((item) => item.id)).toEqual(['domains', 'users', 'hatch']);
  });

  it('gives an approver the queue because they act on bookings, and no empty management menu', () => {
    const me = makeMe({ permissions: ['approver_1', 'approver_2'], caps: ['dashboard.view'] });
    expect(labels(me)).toEqual(['home', 'requests']);
  });

  it('reduces a handler to the queue alone', () => {
    const me = makeMe({ is_handler_only: true, permissions: ['vice_approver_1'] });
    expect(buildNav(me)).toEqual([expect.objectContaining({ id: 'requests', label: 'קריאות', href: '/requests?view=mine&sort=stage_age_hours&dir=desc', counter: 'queue' })]);
  });
});

describe('canAct', () => {
  it('is true for admins, approvers, vice approvers and control officers, false for plain users', () => {
    expect(canAct(makeMe({ permissions: ['vice_approver_8'] }))).toBe(true);
    expect(canAct(makeMe({ permissions: ['transportation_control_officer_8'] }))).toBe(true);
    expect(canAct(makeMe({ permissions: ['approver_1'] }))).toBe(true);
    expect(canAct(makeMe({ permissions: ['admin_1', 'user_1'] }))).toBe(true);
    expect(canAct(makeMe({ permissions: ['user_1'] }))).toBe(false);
  });
});

describe('homeKind', () => {
  it('sends each kind of user to their own main screen', () => {
    expect(homeKind(makeMe({ is_handler_only: true }))).toBe('requests');
    expect(homeKind(makeMe({ is_admin: true, caps: ['dashboard.view'], dashboard_booking_types: [1, 2] }))).toBe('tiles');
    expect(homeKind(makeMe({ is_super_admin: true, caps: ['dashboard.view'], dashboard_booking_types: [1, 2] }))).toBe('tiles');
    expect(homeKind(makeMe({ caps: ['dashboard.view'], permissions: ['approver_1'] }))).toBe('dashboard');
    // a domain commander of several domains picks one on the tiles (built from GET overview)
    expect(homeKind(makeMe({ caps: ['dashboard.view'], permissions: ['approver_1', 'approver_2'], dashboard_booking_types: [1, 2] }))).toBe('tiles');
    expect(homeKind(makeMe({ is_admin: true, caps: ['dashboard.view'], dashboard_booking_types: [3] }))).toBe('dashboard');
    expect(homeKind(makeMe({ permissions: ['vice_approver_1'] }))).toBe('requests');
    expect(homeKind(makeMe())).toBe('requests');
  });
});

describe('isActivePath', () => {
  it('matches the exact home route only for "/"', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/requests', '/')).toBe(false);
  });

  it('matches a screen and the drill-downs that belong to it', () => {
    expect(isActivePath('/manage/settings/1/3', '/manage/domains', ['/manage/settings'])).toBe(true);
    expect(isActivePath('/dashboard', '/', ['/dashboard'])).toBe(true);
    expect(isActivePath('/requests-old', '/requests')).toBe(false);
  });
});

describe('unified requests navigation', () => {
  it('gives every role exactly one requests entry and defaults to the appropriate view', () => {
    const handler = makeMe({ is_handler_only: true, permissions: ['vice_approver_1'] });
    const approver = makeMe({ permissions: ['approver_5'] });
    const admin = makeMe({ is_admin: true, permissions: ['admin_1'] });
    for (const user of [handler, approver, admin]) {
      expect(buildNav(user).filter((item) => item.id === 'requests')).toHaveLength(1);
      expect(buildNav(user).some((item) => item.id === 'queue')).toBe(false);
    }
    expect(requestsHref(handler)).toContain('view=mine');
    expect(requestsHref(approver)).toContain('view=mine');
    expect(requestsHref(admin)).toContain('view=open');
    expect(isActivePath('/requests', requestsHref(handler))).toBe(true);
  });
  it('lets the super admin see the mine view even without per-type permissions', () => {
    expect(canAct(makeMe({ is_super_admin: true }))).toBe(true);
  });
});
