'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { syncApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';
import type { BookingDetail, ConflictResolution } from '@/lib/api/types';
import { useToast } from '@/providers/UiProvider';

/** Super admin settles a sync conflict: `keep_internal` or `accept_external`; a reason goes to the audit log. */
export function ResolveConflictDialog({ booking, resolution, onClose }: { booking: BookingDetail; resolution: ConflictResolution; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const conflict = booking.sync.open_conflict;
  const keep = resolution === 'keep_internal';

  const mutation = useMutation({
    mutationFn: () => syncApi.resolveConflict(conflict!.id, { resolution, reason: reason.trim() }),
    onSuccess: async () => {
      toast('ההכרעה נשמרה ונרשמה בהיסטוריית השינויים.', 'ok');
      await invalidateWork(client);
      onClose();
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'ההכרעה נכשלה.');
      if (apiError.stale) {
        toast(apiError.message, 'bad');
        await invalidateWork(client);
        onClose();
        return;
      }
      setError(apiError.message);
    },
  });

  if (!conflict) return null;

  return (
    <Modal
      title={keep ? 'לשמור את ההחלטה כאן' : 'לקבל את המצב באפליקציה'}
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => {
              if (!reason.trim()) {
                setError('יש לכתוב נימוק.');
                return;
              }
              setError('');
              mutation.mutate();
            }}
          >
            אישור
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        {keep
          ? `הקריאה תישאר "${booking.status_label}", וההחלטה תישלח גם לאפליקציה.`
          : `הקריאה תעבור ל"${booking.sync.ext_status_label ?? 'המצב באפליקציה'}", וההחלטה שהתקבלה כאן תבוטל.`}
      </p>
      <label className="field">
        <span>נימוק (חובה)</span>
        <input className="input" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
      </label>
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
