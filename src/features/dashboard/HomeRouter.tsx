'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui/Feedback';
import { homeKind } from '@/lib/nav';
import { useSession } from '@/providers/SessionProvider';
import { DomainDashboard } from './DomainDashboard';
import { HomeScreen } from './HomeScreen';

/**
 * `/` means different things to different people: admins and the super admin see the domain tiles, a domain commander sees the
 * dashboard of their own domain(s), and someone who only handles bookings goes straight to their queue.
 */
export function HomeRouter() {
  const { me } = useSession();
  const router = useRouter();
  const kind = homeKind(me);

  useEffect(() => {
    if (kind === 'queue' || kind === 'requests') router.replace(`/${kind}`);
  }, [kind, router]);

  if (kind === 'tiles') return <HomeScreen />;
  if (kind === 'dashboard') return <DomainDashboard />;
  return <Loading rows={4} />;
}
