import type { ReactNode } from 'react';
import { AppFrame } from '@/components/layout/AppFrame';

/** Authenticated area: loads the session once, then wraps each screen in the app shell. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
