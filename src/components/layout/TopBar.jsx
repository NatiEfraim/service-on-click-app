'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { buildNav, isActivePath } from '@/lib/nav';
import { APP_NAME } from '@/lib/config';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { ManageMenu } from './ManageMenu';
import { UserMenu } from './UserMenu';

export function TopBar() {
  const { me } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = buildNav(me);
  const hasQueue = nav.some((entry) => entry.kind === 'link' && entry.counter === 'queue');

  // Queue tab badge; shares its query with the dashboards.
  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), enabled: hasQueue, staleTime: 60_000 });
  const waiting = overview.data?.awaiting_me.count ?? 0;

  // the active-screen pill is one element that glides to the current item instead of each item painting its own
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  useLayoutEffect(() => {
    const navEl = navRef.current;
    const pill = indicatorRef.current;
    if (!navEl || !pill) return;
    const place = () => {
      const active = navEl.querySelector(':scope > a[aria-current="page"], :scope > .dd.current > button');
      if (!active) {
        pill.style.opacity = '0';
        return;
      }
      const box = active.getBoundingClientRect();
      const origin = navEl.getBoundingClientRect();
      pill.style.opacity = '1';
      pill.style.width = `${box.width}px`;
      pill.style.transform = `translateX(${box.left - origin.left}px)`;
    };
    place();
    // the first placement is instant; moves after that glide
    requestAnimationFrame(() => pill.classList.add('ready'));
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [pathname, waiting, nav.length]);

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
        <nav ref={navRef} className={`tabs-nav${menuOpen ? ' open' : ''}`} aria-label="ניווט ראשי">
          <span ref={indicatorRef} className="nav-indicator" aria-hidden="true" />
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
