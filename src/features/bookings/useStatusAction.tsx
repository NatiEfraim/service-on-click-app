'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import { invalidateWork } from '@/lib/api/keys';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { ActionDialog } from './ActionDialog';

/** How a decided row leaves the list: approved (✓) or rejected / cancelled (✗). */
export type Outcome = 'ok' | 'bad';

/** Stamp + slide out + collapse, in ms (see `Ticket`); the list refreshes after it. */
export const LEAVE_MS = 1050;

/**
 * Starts a decision from a list: `start(booking, action)` opens the dialog; render `dialog` on the screen.
 * With `animateOut`, a decided row is first stamped and slid out (`outcomes` feeds each `Ticket`), then the list reloads.
 */
export function useStatusAction({ animateOut = false }: { animateOut?: boolean } = {}): {
  start: (booking: BookingRow, action: BookingAction) => void;
  dialog: ReactNode;
  outcomes: Record<number, Outcome>;
} {
  const client = useQueryClient();
  const [pending, setPending] = useState<{ booking: BookingRow; action: BookingAction } | null>(null);
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const start = useCallback((booking: BookingRow, action: BookingAction) => setPending({ booking, action }), []);

  const onDecided = useCallback(
    (serial: number, outcome: Outcome) => {
      setOutcomes((prev) => ({ ...prev, [serial]: outcome }));
      window.setTimeout(async () => {
        await invalidateWork(client);
        setOutcomes(({ [serial]: _gone, ...rest }) => rest);
      }, LEAVE_MS);
    },
    [client],
  );

  const dialog = pending ? (
    <ActionDialog
      booking={pending.booking}
      action={pending.action}
      onClose={() => setPending(null)}
      onDecided={animateOut ? (outcome) => onDecided(pending.booking.serial_number, outcome) : undefined}
    />
  ) : null;
  return { start, dialog, outcomes };
}
