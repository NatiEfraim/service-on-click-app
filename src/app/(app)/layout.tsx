import type { ReactNode } from 'react';
import { AppFrame } from '@/components/layout/AppFrame';

/** Everything behind the login: the session (who am I, what can I see) is loaded once here, then the shell wraps each screen. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
