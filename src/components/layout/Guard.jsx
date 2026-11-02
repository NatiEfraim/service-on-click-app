'use client';


import { Denied } from '@/components/ui/Feedback';

import { useSession } from '@/providers/SessionProvider';

/** Shows a screen only if the user's `capabilities` include it (covers typed-in addresses; the API enforces it too). */
export function Guard({ capability, children, message }) {
  const { can } = useSession();
  if (capability && !can(capability)) return <Denied>{message}</Denied>;
  return <>{children}</>;
}
