'use client';

import type { ReactNode } from 'react';
import { Denied } from '@/components/ui/Feedback';
import type { Capability } from '@/lib/api/types';
import { useSession } from '@/providers/SessionProvider';

/**
 * Shows a screen only when the server's `capabilities` for this user include it. The menu already hides what a user cannot open;
 * this covers a typed-in address. (The API refuses the calls anyway - this only makes the refusal readable.)
 */
export function Guard({ capability, children, message }: { capability?: Capability; children: ReactNode; message?: ReactNode }) {
  const { can } = useSession();
  if (capability && !can(capability)) return <Denied>{message}</Denied>;
  return <>{children}</>;
}
