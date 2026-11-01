import type { Capability, Me } from './api/types';

/** Menu visibility is a convenience built from `GET /me`; the server enforces every call. */

/** Holds an approver, vice approver or control officer role on at least one type. */
export function canAct(me: Me): boolean {
  return me.permissions.some((permission) => /^(approver|vice_approver|transportation_control_officer)_\d+$/.test(permission));
}

export function can(me: Me, capability: Capability): boolean {
  return me.capabilities[capability] === true;
}

export interface NavLink {
  kind: 'link';
  id: string;
  href: string;
  label: string;
  /** Extra paths that count as "current". */
  also?: string[];
  counter?: 'queue';
}

export interface NavGroup {
  kind: 'group';
  id: string;
  label: string;
  items: { id: string; href: string; label: string; description: string; also?: string[] }[];
}

export type NavEntry = NavLink | NavGroup;

export function buildNav(me: Me): NavEntry[] {
  const handlerOnly = me.is_handler_only;
  const entries: NavEntry[] = [];

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
    const items: NavGroup['items'] = [
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

/** Which screen `/` shows. */
export function homeKind(me: Me): 'tiles' | 'dashboard' | 'queue' | 'requests' {
  if (me.is_handler_only) return 'queue';
  if (me.is_super_admin || me.is_admin) return can(me, 'dashboard.view') ? 'tiles' : 'requests';
  if (can(me, 'dashboard.view')) return 'dashboard';
  return canAct(me) ? 'queue' : 'requests';
}

export function isActivePath(pathname: string, href: string, also: string[] = []): boolean {
  const candidates = [href, ...also];
  return candidates.some((candidate) => (candidate === '/' ? pathname === '/' : pathname === candidate || pathname.startsWith(`${candidate}/`)));
}
