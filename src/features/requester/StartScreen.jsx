'use client';

import { Loading } from '@/components/ui/Feedback';
import { domainIconSrc } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { RequesterContent } from './RequesterContent';
import { accessibleBookingTypeIds } from './requesterData';
import { useRequesterUser } from './RequesterHome';

/**
 * Every management role's home (`/`): the same requester screen a regular user sees - open a request (managers: ביטחון
 * מידע and תקשוב), the counters and "הקריאות שלי" - inside the app's frame, with the management screens in its menu.
 */
export function StartScreen() {
  const { user, name } = useRequesterUser();
  const { me, catalog } = useSession();
  // every type the user has access to is a category of "הקריאות שלי", even with no request of theirs in it yet
  const accessible = new Set(accessibleBookingTypeIds(me, (catalog?.booking_types ?? []).map((type) => type.id)));
  const extraCategories = (catalog?.booking_types ?? [])
    .filter((type) => accessible.has(type.id))
    .map((type) => ({ id: `d${type.id}`, name: type.display_name, img: domainIconSrc(type.id), typeIds: [type.id] }));
  if (user.isPending) return <Loading rows={6} />;
  return <RequesterContent name={name} extraCategories={extraCategories} />;
}
