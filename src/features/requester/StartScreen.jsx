'use client';

import { Loading } from '@/components/ui/Feedback';
import { domainIconSrc } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { RequesterContent } from './RequesterContent';
import { useRequesterUser } from './RequesterHome';

/**
 * Every management role's home (`/`): the same requester screen a regular user sees - open a request (managers: ביטחון
 * מידע and תקשוב), the counters and "הקריאות שלי" - inside the app's frame, with the management screens in its menu.
 */
export function StartScreen() {
  const { user, name } = useRequesterUser();
  const { me, catalog } = useSession();
  // Add metadata for the service domains this role manages to the requester's categories.
  const managed = new Set(me.is_super_admin ? (catalog?.booking_types ?? []).map((type) => type.id) : [...(me.managed_booking_types ?? []), ...(me.dashboard_booking_types ?? [])]);
  const extraCategories = (catalog?.booking_types ?? [])
    .filter((type) => managed.has(type.id))
    .map((type) => ({ id: `d${type.id}`, name: type.display_name, img: domainIconSrc(type.id), typeIds: [type.id] }));
  if (user.isPending) return <Loading rows={6} />;
  return <RequesterContent name={name} extraCategories={extraCategories} />;
}
