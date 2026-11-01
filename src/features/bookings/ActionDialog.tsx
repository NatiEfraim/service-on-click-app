'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { newKey } from '@/lib/id';
import { actionTone, COMMENT_MAX, commentError } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';

type Target = Pick<BookingRow, 'serial_number' | 'booking_type_label' | 'status_label' | 'version'>;

interface ActionDialogProps {
  booking: Target;
  action: BookingAction;
  onClose: () => void;
  /** Called after the server accepted the decision. */
  onDone?: () => void;
}

/**
 * Confirm one decision (approve, reject, cancel, ...) with an optional / required comment.
 * - Sends the `version` the user saw; a stale one comes back 409.
 * - Sends one `Idempotency-Key` per decision: a double click or a retry after a lost answer returns the first result instead of acting twice.
 */
export function ActionDialog({ booking, action, onClose, onDone }: ActionDialogProps) {
  const client = useQueryClient();
  const toast = useToast();
  const { statusLabel } = useSession();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const attempt = useRef({ key: newKey(), fingerprint: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      const text = comment.trim();
      const body = { status_id: action.status_id, version: booking.version, comment: text || null };
      // the same decision may be re-sent with the same key (we do not know whether the first try arrived); a changed one needs a new key
      const fingerprint = JSON.stringify(body);
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { key: newKey(), fingerprint };
      return bookingsApi.changeStatus(booking.serial_number, body, attempt.current.key);
    },
    onSuccess: async (result) => {
      toast(result.message || 'הקריאה עודכנה.', 'ok');
      await invalidateWork(client);
      onDone?.();
      onClose();
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'הפעולה נכשלה.');
      // an answer (not a lost connection) ends this attempt: the next one is a new action
      if (!apiError.offline && apiError.status < 500) attempt.current = { key: newKey(), fingerprint: '' };

      if (apiError.stale || apiError.denied) {
        // changed under us / not ours to decide any more: show the message once, reload, and let the user look again
        toast(apiError.message, 'bad');
        await invalidateWork(client);
        onClose();
        return;
      }
      setError(apiError.message);
    },
  });

  const nextLabel = statusLabel(action.status_id);
  const tone = actionTone(action);

  function submit() {
    const problem = commentError(comment, action.comment_required);
    setFieldError(problem ?? '');
    if (problem) return;
    setError('');
    mutation.mutate();
  }

  return (
    <Modal
      title={action.label}
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button variant={tone === 'danger' ? 'danger-solid' : 'primary'} loading={mutation.isPending} onClick={submit}>
            {action.label}
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        קריאה <span className="serial">{booking.serial_number}</span> ({booking.booking_type_label}) תעבור מ&quot;{booking.status_label}&quot; ל&quot;{nextLabel}&quot;.
      </p>
      <label className="field">
        <span>הערה{action.comment_required ? ' (חובה)' : ' (רשות)'}</span>
        <textarea
          className="input"
          value={comment}
          maxLength={COMMENT_MAX}
          placeholder={`אותיות בעברית ורווחים בלבד, עד ${COMMENT_MAX} תווים`}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby="action-comment-error"
          onChange={(event) => {
            setComment(event.target.value);
            if (fieldError) setFieldError('');
          }}
        />
      </label>
      <div id="action-comment-error" className="err" aria-live="polite">
        {fieldError}
      </div>
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
