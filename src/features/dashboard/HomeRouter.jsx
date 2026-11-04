'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui/Feedback';
import { homeKind, requestsHref } from '@/lib/nav';
import { useSession } from '@/providers/SessionProvider';
import { DomainDashboard } from './DomainDashboard';
import { HomeScreen } from './HomeScreen';

/** Routes `/` by role: admins get domain tiles, commanders their domain, handlers their queue. */
export function HomeRouter() {
  const { me } = useSession();
  const router = useRouter();
  const kind = homeKind(me);

  useEffect(() => {
    if (kind === 'requests') router.replace(requestsHref(me));
  }, [kind, router, me]);

  if (kind === 'tiles') return <HomeScreen />;
  if (kind === 'dashboard') return <DomainDashboard />;
  return <Loading rows={4} />;
}
