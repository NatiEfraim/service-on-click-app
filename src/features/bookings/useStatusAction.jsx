'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { subscribeBookingDecisions } from '@/lib/booking-decisions';
import { invalidateWork } from '@/lib/api/keys';

import { ROW_LEAVE_MS } from '@/lib/motion';
import { ActionDialog } from './ActionDialog';

/**
 * Starts a decision from a list: `start(booking, action)` opens the dialog; render `dialog` on the screen.
 * With `animateOut`, a decided row is first stamped and slid out (`outcomes` feeds each `Ticket`), then the list reloads.
 */
export function useStatusAction({ animateOut = false, onDone } = {}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const start = useCallback((booking, action) => setPending({ booking, action }), []);

  const onDecided = useCallback(
    (serial, outcome) => {
      setOutcomes((prev) => ({ ...prev, [serial]: outcome }));
      window.setTimeout(async () => {
        await invalidateWork(client);
        setOutcomes(({ [serial]: _gone, ...rest }) => rest);
      }, ROW_LEAVE_MS);
    },
    [client],
  );

  useEffect(() => {
    if (!animateOut) return;
    return subscribeBookingDecisions(onDecided);
  }, [animateOut, onDecided]);

  const dialog = pending ? (
    <ActionDialog
      booking={pending.booking}
      action={pending.action}
      onClose={() => setPending(null)}
      onDone={onDone}
      onDecided={animateOut ? (outcome) => onDecided(pending.booking.serial_number, outcome) : undefined}
    />
  ) : null;
  return { start, dialog, outcomes };
}
