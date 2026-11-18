'use client';


import { Denied } from '@/components/ui/Feedback';

import { canOpenDomains } from '@/lib/nav';
import { useSession } from '@/providers/SessionProvider';

/**
 * Shows a screen only if the user's `capabilities` include it, with `superAdmin` only to the super admin, or with
 * `domains` to whoever may open the service domains screens (the super admin, or the owner of a route type - lib/nav)
 * (covers typed-in addresses; the API enforces it too).
 */
export function Guard({ capability, superAdmin = false, domains = false, children, message }) {
  const { can, me } = useSession();
  if (capability && !can(capability)) return <Denied>{message}</Denied>;
  if (superAdmin && !me.is_super_admin) return <Denied>{message}</Denied>;
  if (domains && !canOpenDomains(me)) return <Denied>{message}</Denied>;
  return <>{children}</>;
}
