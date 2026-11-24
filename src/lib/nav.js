import { SHOW_DEPARTMENTS } from '@/lib/labels';


/** Menu visibility is a convenience built from `GET /me`; the server enforces every call. */

/** Holds a role that moves bookings on at least one type: the approval route's, or a topic's / a route's handler role. */
export function canAct(me) {
  // the camp commander (admin) decides in the domain commander's turns too; the control officers, the ביטחון מידע
  // handler and the roles of the routes (lib/routeTypes: the coordinator, the service desk's commander) act on their own types
  return me.is_super_admin || me.permissions.some((permission) => /^(admin|admin_ict|approver|vice_approver|transportation_control_officer|in_unit_food_control_officer|infosec_officer|ict_handler|interview_coordinator)_\d+$/.test(permission));
}

/** Commands a set of domains: the camp commander (admin_N) or the service desk's commander (admin_ict_N); both review the system. */
export function isCommander(me) {
  return Boolean(me.is_admin || me.is_ict_admin);
}

export function can(me, capability) {
  return me.capabilities[capability] === true;
}

/** Owns a type with a route of its own (the קצין ביטחון מידע on the clearance grant): its dashboard and settings are theirs to read. */
export function ownsRoutes(me) {
  return (me.route_owner_booking_types ?? []).length > 0;
}

/** May open the service domains screens: the super admin (who edits them), or the owner of a route type (who reads their own). */
export function canOpenDomains(me) {
  return Boolean(me.is_super_admin) || ownsRoutes(me);
}







export function buildNav(me) {
  const handlerOnly = me.is_handler_only;
  // every user starts at the requester home (open a request, "הקריאות שלי"); the management dashboard follows it
  const entries = [{ kind: 'link', id: 'start', href: '/', label: 'דף הבית' }];

  // a vice approver (handler only) also gets the dashboard of their own domains, limited to their stage
  if (can(me, 'dashboard.view')) {
    entries.push({ kind: 'link', id: 'home', href: '/overview', label: 'מסך ראשי', also: ['/dashboard'] });
  }

  entries.push({ kind: 'link', id: 'requests', href: requestsHref(me), also: ['/requests', '/queue'], label: 'קריאות', ...(canAct(me) || handlerOnly ? { counter: 'queue' } : {}) });

  if (can(me, 'reports.view')) {
    entries.push({ kind: 'link', id: 'reports', href: '/reports', label: 'דו"חות' });
  }

  if (!handlerOnly) {
    const items = [];
    if (canOpenDomains(me)) items.push({ id: 'domains', href: '/manage/domains', label: 'תחומי שירות', description: me.is_super_admin ? 'מסלולי אישור, הגדרות, טופס ויעד טיפול' : 'ההגדרות והטופס של התחומים שבאחריותך', also: ['/manage/settings'] });
    if (can(me, 'users.manage')) items.push({ id: 'users', href: '/manage/users', label: 'משתמשים והרשאות', description: 'שיבוץ תפקידים ומחלקות' });
    if (can(me, 'config.global')) items.push({ id: 'org', href: '/manage/org', label: SHOW_DEPARTMENTS ? 'יחידות ומחלקות' : 'יחידות', description: 'שמות פנימיים ומיפוי לאותיות' });
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
  if (!can(me, 'dashboard.view')) return 'requests';
  return me.dashboard_booking_types.length > 1 ? 'tiles' : 'dashboard';
}

export function isActivePath(pathname, href, also = []) {
  const candidates = [href, ...also];
  return candidates.map((candidate) => candidate.split('?')[0]).some((candidate) => (candidate === '/' ? pathname === '/' : pathname === candidate || pathname.startsWith(`${candidate}/`)));
}

/** One list; handlers and domain approvers enter their work queue, the commanders and the system admin enter open bookings. */
export function requestsHref(me) {
  return me.is_handler_only || (!isCommander(me) && !me.is_super_admin && canAct(me))
    ? '/requests?view=mine&sort=stage_age_hours&dir=desc'
    : '/requests?view=open';
}
