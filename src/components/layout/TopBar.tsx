'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { buildNav, isActivePath, type NavGroup } from '@/lib/nav';
import { initials } from '@/lib/format';
import { ROLE_NAME } from '@/lib/labels';
import { APP_NAME } from '@/lib/config';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';

/** Closes a dropdown on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function ManageMenu({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const current = group.items.some((item) => isActivePath(pathname, item.href, item.also));

  return (
    <div className={`dd${current ? ' current' : ''}`} ref={ref}>
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {group.label}
        <Icon name="down" />
      </button>
      {open ? (
        <div className="menu">
          {group.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActivePath(pathname, item.href, item.also) ? 'page' : undefined}
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
            >
              <span>
                {item.label}
                <small>{item.description}</small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const { me, unitName, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const name = me.user.full_name ?? me.user.personal_number;
  const roles = me.is_super_admin
    ? ROLE_NAME.super_admin
    : me.roles
        .map((role) => ROLE_NAME[role] ?? role)
        .filter((label) => label !== ROLE_NAME.user)
        .join(', ');

  return (
    <div className="dd" ref={ref}>
      <button type="button" className="userbtn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="avatar">{initials(name)}</span>
        <span className="nm">
          {name}
          <small>{roles}</small>
        </span>
        <Icon name="down" />
      </button>
      {open ? (
        <div className="menu" style={{ insetInlineStart: 'auto', insetInlineEnd: 0, minWidth: 280 }}>
          <div style={{ padding: 10 }}>
            <b>{name}</b>
            <div className="small muted">
              {roles || 'ללא תפקיד'} · {unitName(me.user.unit_id)}
            </div>
            <div className="small muted">
              מספר אישי <span className="serial">{me.user.personal_number}</span>
            </div>
          </div>
          <button type="button" className="mi" onClick={() => void signOut()}>
            <Icon name="logout" />
            התנתקות
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TopBar() {
  const { me } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = buildNav(me);
  const hasQueue = nav.some((entry) => entry.kind === 'link' && entry.counter === 'queue');

  // Queue tab badge; shares its query with the dashboards.
  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), enabled: hasQueue, staleTime: 60_000 });
  const waiting = overview.data?.awaiting_me.count ?? 0;

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Button className="icon menu-btn" aria-label="תפריט" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          <Icon name="menu" />
        </Button>
        <Link className="brand" href="/">
          <Logo />
          <div>
            <b>{APP_NAME}</b>
            <span>ניהול ובקרה</span>
          </div>
        </Link>
        <nav className={`tabs-nav${menuOpen ? ' open' : ''}`} aria-label="ניווט ראשי">
          {nav.map((entry) =>
            entry.kind === 'group' ? (
              <ManageMenu key={entry.id} group={entry} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            ) : (
              <Link key={entry.id} href={entry.href} aria-current={isActivePath(pathname, entry.href, entry.also) ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                {entry.label}
                {entry.counter === 'queue' && waiting > 0 ? (
                  <span className="count" aria-label={`${waiting} קריאות ממתינות`}>
                    {waiting}
                  </span>
                ) : null}
              </Link>
            ),
          )}
        </nav>
        <div className="top-tools">
          {!me.is_handler_only ? <GlobalSearch /> : null}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
