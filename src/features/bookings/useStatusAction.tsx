'use client';

import { useCallback, useState, type ReactNode } from 'react';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { ActionDialog } from './ActionDialog';

/**
 * Lets a list start a decision: `start(booking, action)` opens the comment dialog, and `dialog` must be rendered somewhere on the
 * screen. The buttons come from the booking's `actions`; the server applies the same turn-based rule when the button is pressed.
 */
export function useStatusAction(): {
  start: (booking: BookingRow, action: BookingAction) => void;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<{ booking: BookingRow; action: BookingAction } | null>(null);
  const start = useCallback((booking: BookingRow, action: BookingAction) => setPending({ booking, action }), []);
  const dialog = pending ? <ActionDialog booking={pending.booking} action={pending.action} onClose={() => setPending(null)} /> : null;
  return { start, dialog };
}
