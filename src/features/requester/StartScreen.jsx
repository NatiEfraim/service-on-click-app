'use client';

import { Loading } from '@/components/ui/Feedback';
import { RequesterContent } from './RequesterContent';
import { useRequesterUser } from './RequesterHome';

/**
 * Every management role's home (`/`): the same requester screen a regular user sees - open a request (managers: ביטחון
 * מידע and תקשוב), the counters and "הקריאות שלי" - inside the app's frame, with the management screens in its menu.
 */
export function StartScreen() {
  const { user, name } = useRequesterUser();
  if (user.isPending) return <Loading rows={6} />;
  return <RequesterContent name={name} />;
}
