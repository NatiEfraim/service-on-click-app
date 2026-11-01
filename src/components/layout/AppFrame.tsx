'use client';

import { Suspense, type ReactNode } from 'react';
import { BookingDrawerHost } from '@/features/bookings/BookingDrawerHost';
import { SessionProvider } from '@/providers/SessionProvider';
import { Loading } from '@/components/ui/Feedback';
import { TopBar } from './TopBar';

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <a className="skip-link" href="#main">
        דילוג לתוכן
      </a>
      <Suspense fallback={null}>
        <TopBar />
      </Suspense>
      <main className="page" id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
      <Suspense fallback={null}>
        <BookingDrawerHost />
      </Suspense>
    </SessionProvider>
  );
}
