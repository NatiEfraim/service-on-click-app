

/** Menu visibility is a convenience built from `GET /me`; the server enforces every call. */

/** Holds an approver, vice approver or control officer role on at least one type. */
export function canAct(me) {
  // the camp commander (admin) decides in the domain commander's turns too
  return me.permissions.some((permission) => /^(admin|approver|vice_approver|transportation_control_officer)_\d+$/.test(permission));
}

export function can(me, capability) {
  return me.capabilities[capability] === true;
}







export function buildNav(me) {
  const handlerOnly = me.is_handler_only;
  const entries = [];

  if (can(me, 'dashboard.view') && !handlerOnly) {
    entries.push({ kind: 'link', id: 'home', href: '/', label: 'מסך ראשי', also: ['/dashboard'] });
  }

  if (handlerOnly || canAct(me)) {
    entries.push({ kind: 'link', id: 'queue', href: '/queue', label: handlerOnly ? 'הקריאות שלי לטיפול' : 'ממתין לטיפולי', counter: 'queue' });
  }

  if (!handlerOnly) {
    entries.push({ kind: 'link', id: 'requests', href: '/requests', label: 'קריאות' });
  }

  if (can(me, 'reports.view')) {
    entries.push({ kind: 'link', id: 'reports', href: '/reports', label: 'דו"חות' });
  }

  if (!handlerOnly) {
    const items = [
      { id: 'domains', href: '/manage/domains', label: 'תחומי שירות', description: 'מסלולי אישור, הגדרות, טופס ויעד טיפול', also: ['/manage/settings'] },
    ];
    if (can(me, 'users.manage')) items.push({ id: 'users', href: '/manage/users', label: 'משתמשים והרשאות', description: 'שיבוץ תפקידים ומחלקות' });
    if (can(me, 'config.global')) items.push({ id: 'org', href: '/manage/org', label: 'יחידות ומחלקות', description: 'שמות פנימיים ומיפוי לאותיות' });
    entries.push({ kind: 'group', id: 'manage', label: 'ניהול', items });
  }

  if (can(me, 'audit.view')) {
    entries.push({ kind: 'link', id: 'audit', href: '/audit', label: 'היסטוריית שינויים' });
  }
  if (can(me, 'sync.view')) {
    entries.push({ kind: 'link', id: 'sync', href: '/sync', label: 'סנכרון עם האפליקציה' });
  }

  return entries;
}

/**
 * Which screen `/` shows. The domain tiles (GET admin/home) are for the system admin and camp commanders over several
 * domains; anyone else with a dashboard (one domain, or a domain commander of several) gets their (combined) dashboard.
 */
export function homeKind(me) {
  if (me.is_handler_only) return 'queue';
  if (!can(me, 'dashboard.view')) return me.is_super_admin || me.is_admin ? 'requests' : canAct(me) ? 'queue' : 'requests';
  if ((me.is_super_admin || me.is_admin) && me.dashboard_booking_types.length > 1) return 'tiles';
  return 'dashboard';
}

export function isActivePath(pathname, href, also = []) {
  const candidates = [href, ...also];
  return candidates.some((candidate) => (candidate === '/' ? pathname === '/' : pathname === candidate || pathname.startsWith(`${candidate}/`)));
}
