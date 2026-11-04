'use client';


import { Denied } from '@/components/ui/Feedback';

import { useSession } from '@/providers/SessionProvider';

/** Shows a screen only if the user's `capabilities` include it, or with `superAdmin` only to the super admin (covers typed-in addresses; the API enforces it too). */
export function Guard({ capability, superAdmin = false, children, message }) {
  const { can, me } = useSession();
  if (capability && !can(capability)) return <Denied>{message}</Denied>;
  if (superAdmin && !me.is_super_admin) return <Denied>{message}</Denied>;
  return <>{children}</>;
}
