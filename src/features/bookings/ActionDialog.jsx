'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FormError } from '@/components/ui/Feedback';
import { FormDialog } from '@/components/ui/FormDialog';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';

import { newKey } from '@/lib/id';
import { notifyBookingDecision } from '@/lib/booking-decisions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { actionTone, COMMENT_MAX, commentError } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';





/** Confirms one decision. Sends the seen `version` (stale = 409) and an `Idempotency-Key` per decision. */
export function ActionDialog({ booking, action, onClose, onDone, onDecided }) {
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
      // Reuse the key on retry (the first try may have arrived); a changed decision needs a new one.
      const fingerprint = JSON.stringify(body);
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { key: newKey(), fingerprint };
      return bookingsApi.changeStatus(booking.serial_number, body, attempt.current.key);
    },
    onSuccess: async (result) => {
      toast(result.message || 'הקריאה עודכנה.', 'ok');
      if (isHoldStatus(action.status_id)) {
        onDone?.();
        onClose();
        await invalidateWork(client);
        return;
      }
      if (onDecided) {
        onDecided(actionTone(action) === 'danger' ? 'bad' : 'ok');
        onDone?.();
        onClose();
        return;
      }
      const animated = notifyBookingDecision(booking.serial_number, actionTone(action) === 'danger' ? 'bad' : 'ok');
      onDone?.();
      onClose();
      if (!animated) await invalidateWork(client);
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'הפעולה נכשלה.');
      // A server answer (not a lost connection) ends this attempt.
      if (!apiError.offline && apiError.status < 500) attempt.current = { key: newKey(), fingerprint: '' };

      if (apiError.stale || apiError.denied) {
        // Booking changed or no longer ours: show the message once and reload.
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
    <FormDialog
      dirty={comment.trim() !== ''}
      title={action.label}
      onClose={onClose}
      busy={mutation.isPending}
      submitLabel={action.label}
      submitVariant={tone === 'danger' ? 'danger-solid' : 'primary'}
      onSubmit={submit}
    >
      <p style={{ margin: 0 }}>
        קריאה <span className="serial">{booking.serial_number}</span> ({booking.booking_type_label}) תעבור מ&quot;{booking.status_label}&quot; ל&quot;{nextLabel}&quot;.
      </p>
      {isHoldStatus(action.status_id) ? <p className="small muted">{booking.stage?.startsWith('supplier') ? 'סיבת ההמתנה תשתנה; ההמתנה הקודמת נשארת באחריות מפקד התחום.' : 'זו השהיה בלבד. הקריאה נשארת באותו שלב: ' + booking.stage_label + '. הסטטוס יועבר לאפליקציה בסבב הסנכרון הבא.'}</p> : null}
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
            // only Hebrew letters and spaces get in (the server's rule): digits, English, symbols and line breaks are dropped
            // as they are typed or pasted, and a short note says why nothing appeared
            const typed = event.target.value;
            const clean = typed.replace(/[^א-ת ]/gu, '');
            setComment(clean);
            setFieldError(clean === typed ? '' : 'ניתן להקליד אותיות בעברית ורווחים בלבד');
          }}
        />
      </label>
      <div id="action-comment-error" className="err" aria-live="polite">
        {fieldError}
      </div>
      <FormError>{error}</FormError>
    </FormDialog>
  );
}
