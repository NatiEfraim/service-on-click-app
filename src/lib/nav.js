

/** Menu visibility is a convenience built from `GET /me`; the server enforces every call. */

/** Holds an approver, vice approver or control officer role on at least one type. */
export function canAct(me) {
  // the camp commander (admin) decides in the domain commander's turns too
  return me.is_super_admin || me.permissions.some((permission) => /^(admin|approver|vice_approver|transportation_control_officer)_\d+$/.test(permission));
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

  entries.push({ kind: 'link', id: 'requests', href: requestsHref(me), also: ['/requests', '/queue'], label: 'קריאות', ...(canAct(me) || handlerOnly ? { counter: 'queue' } : {}) });

  if (can(me, 'reports.view')) {
    entries.push({ kind: 'link', id: 'reports', href: '/reports', label: 'דו"חות' });
  }

  if (!handlerOnly) {
    const items = [];
    if (me.is_super_admin) items.push({ id: 'domains', href: '/manage/domains', label: 'תחומי שירות', description: 'מסלולי אישור, הגדרות, טופס ויעד טיפול', also: ['/manage/settings'] });
    if (can(me, 'users.manage')) items.push({ id: 'users', href: '/manage/users', label: 'משתמשים והרשאות', description: 'שיבוץ תפקידים ומחלקות' });
    if (can(me, 'config.global')) items.push({ id: 'org', href: '/manage/org', label: 'יחידות ומחלקות', description: 'שמות פנימיים ומיפוי לאותיות' });
    if (me.is_super_admin) items.push({ id: 'hatch', href: '/manage/hatch', label: 'צוהר דיגיטלי', description: 'ייצוא וייבוא ידני מול האפליקציה' });
    if (items.length > 0) entries.push({ kind: 'group', id: 'manage', label: 'ניהול', items });
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
 * Which screen `/` shows: with a dashboard over several domains the tiles to pick one (a domain commander's built from
 * GET overview, see HomeScreen), over a single domain that domain's dashboard.
 */
export function homeKind(me) {
  if (me.is_handler_only) return 'requests';
  if (!can(me, 'dashboard.view')) return me.is_super_admin || me.is_admin ? 'requests' : 'requests';
  return me.dashboard_booking_types.length > 1 ? 'tiles' : 'dashboard';
}

export function isActivePath(pathname, href, also = []) {
  const candidates = [href, ...also];
  return candidates.map((candidate) => candidate.split('?')[0]).some((candidate) => (candidate === '/' ? pathname === '/' : pathname === candidate || pathname.startsWith(`${candidate}/`)));
}

/** One list; handlers and domain approvers enter their work queue, senior administrators enter open bookings. */
export function requestsHref(me) {
  return me.is_handler_only || (!me.is_admin && !me.is_super_admin && canAct(me))
    ? '/requests?view=mine&sort=stage_age_hours&dir=desc'
    : '/requests?view=open';
}
