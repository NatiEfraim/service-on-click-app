
import { AppFrame } from '@/components/layout/AppFrame';

/** Authenticated area: loads the session once, then wraps each screen in the app shell. */
export default function AppLayout({ children }) {
  return <AppFrame>{children}</AppFrame>;
}
