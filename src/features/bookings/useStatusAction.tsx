'use client';

import { useCallback, useState, type ReactNode } from 'react';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { ActionDialog } from './ActionDialog';

/** Starts a decision from a list: `start(booking, action)` opens the dialog; render `dialog` on the screen. */
export function useStatusAction(): {
  start: (booking: BookingRow, action: BookingAction) => void;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<{ booking: BookingRow; action: BookingAction } | null>(null);
  const start = useCallback((booking: BookingRow, action: BookingAction) => setPending({ booking, action }), []);
  const dialog = pending ? <ActionDialog booking={pending.booking} action={pending.action} onClose={() => setPending(null)} /> : null;
  return { start, dialog };
}
