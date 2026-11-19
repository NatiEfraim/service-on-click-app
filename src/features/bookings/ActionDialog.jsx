'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FieldInput } from '@/components/booking/FieldInput';
import { FieldError, FormError, Loading, Notice } from '@/components/ui/Feedback';
import { FormDialog } from '@/components/ui/FormDialog';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork, keys } from '@/lib/api/keys';

import { newKey } from '@/lib/id';
import { notifyBookingDecision } from '@/lib/booking-decisions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { fieldKind, fieldRules, validateValue } from '@/lib/form-fields';
import { actionTone, COMMENT_MAX, commentError } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import { handleWriteError } from '@/lib/useSaveMutation';
import { sortedHandlerFields, splitValueErrors } from './HandlerFieldsPanel';

/**
 * Confirms one decision. Sends the seen `version` (stale = 409) and an `Idempotency-Key` per decision.
 * A route type's move (lib/routeTypes) may need the handler fields it fills (`required_fields`: the interview's place,
 * date and time) - they are asked for here and sent as `values` - and may warn about the fields it clears (`clears_fields`).
 */
export function ActionDialog({ booking, action, onClose, onDone, onDecided }) {
  const client = useQueryClient();
  const toast = useToast();
  const { statusLabel } = useSession();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const attempt = useRef({ key: newKey(), fingerprint: '' });

  const requiredIds = (action.required_fields ?? []).map(Number);
  const clearedIds = (action.clears_fields ?? []).map(Number);
  const needsFields = requiredIds.length > 0;
  // the handler fields with their stored values come with the booking's detail; a list row has none, so it is read here
  // (the same cache entry the side panel holds, when it is open)
  const detail = useQuery({
    queryKey: keys.bookingDetail(booking.uuid ?? String(booking.serial_number)),
    queryFn: ({ signal }) => bookingsApi.get(booking.uuid ?? booking.serial_number, signal),
    enabled: (needsFields || clearedIds.length > 0) && !Array.isArray(booking.handler_fields),
    staleTime: 5_000,
  });
  const allHandlerFields = sortedHandlerFields(Array.isArray(booking.handler_fields) ? booking.handler_fields : detail.data?.handler_fields);
  const handlerFields = allHandlerFields.filter((field) => requiredIds.includes(Number(field.form_field_id)));
  const clearedNames = allHandlerFields.filter((field) => clearedIds.includes(Number(field.form_field_id))).map((field) => field.field_display_name);
  const waitingForFields = needsFields && handlerFields.length === 0 && detail.isPending;
  const [typed, setTyped] = useState({});
  const [valueErrors, setValueErrors] = useState({});
  const valueOf = (field) => typed[field.form_field_id] ?? (field.value == null ? '' : String(field.value));
  // the API refuses an interview moment that already passed
  const [todayIso] = useState(() => new Date().toLocaleDateString('sv-SE'));

  const mutation = useMutation({
    mutationFn: async () => {
      const text = comment.trim();
      const body = { status_id: action.status_id, version: booking.version, comment: text || null };
      if (needsFields) body.values = Object.fromEntries(handlerFields.map((field) => [String(field.form_field_id), valueOf(field)]));
      // Reuse the key on retry (the first try may have arrived); a changed decision needs a new one.
      const fingerprint = JSON.stringify(body);
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { key: newKey(), fingerprint };
      return bookingsApi.changeStatus(booking.uuid ?? booking.serial_number, body, attempt.current.key);
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

      // booking changed or no longer ours: the message once, reload and close (the console's one write-error handling)
      const shown = await handleWriteError(apiError, toast, async () => {
        await invalidateWork(client);
        onClose();
      });
      if (!shown) return;
      // a 422 of a handler field lands under that field; any other message under the form
      const { byField, message } = splitValueErrors(shown);
      setValueErrors(byField);
      setError(message);
    },
  });

  const nextLabel = statusLabel(action.status_id);
  const tone = actionTone(action);

  function submit() {
    const problem = commentError(comment, action.comment_required);
    setFieldError(problem ?? '');
    const problems = {};
    for (const field of handlerFields) {
      const found = validateValue(fieldRules(field.validations), valueOf(field), { required: true, kind: fieldKind(field.field_type?.name).inputType });
      if (found) problems[field.form_field_id] = found;
    }
    setValueErrors(problems);
    if (problem || Object.keys(problems).length) return;
    setError('');
    mutation.mutate();
  }

  return (
    <FormDialog
      dirty={comment.trim() !== '' || Object.keys(typed).length > 0}
      title={action.label}
      onClose={onClose}
      busy={mutation.isPending}
      submitLabel={action.label}
      submitVariant={tone === 'danger' ? 'danger-solid' : 'primary'}
      submitDisabled={waitingForFields}
      onSubmit={submit}
    >
      <p style={{ margin: 0 }}>
        קריאה <span className="serial">{booking.serial_number}</span> ({booking.booking_type_label}) תעבור מ&quot;{booking.status_label}&quot; ל&quot;{nextLabel}&quot;.
      </p>
      {isHoldStatus(action.status_id) ? <p className="small muted">{booking.stage?.startsWith('supplier') ? 'סיבת ההמתנה תשתנה; ההמתנה הקודמת נשארת באחריות מפקד התחום.' : 'זו השהיה בלבד. הקריאה נשארת באותו שלב: ' + booking.stage_label + '. הסטטוס יועבר לאפליקציה בסבב הסנכרון הבא.'}</p> : null}
      {clearedIds.length ? (
        <Notice tone="warn">
          {clearedNames.length ? `הפרטים שמילאו הגורמים המטפלים יימחקו: ${clearedNames.join(', ')}.` : 'פרטי התחקיר (מקום, תאריך ושעה) יימחקו.'} המטפל נשאר.
        </Notice>
      ) : null}
      {needsFields ? (
        waitingForFields ? (
          <Loading rows={2} />
        ) : (
          <div className="handler-fields">
            {handlerFields.map((field) => {
              const id = `act-${field.form_field_id}`;
              const problem = valueErrors[field.form_field_id];
              return (
                // a div, not a <label>: a click on the open calendar must not be forwarded to its button
                <div key={field.form_field_id} className="field" style={{ gridColumn: `span ${Math.min(Math.max(Number(field.col_span) || 1, 1), 4)}` }}>
                  <span>
                    {field.field_display_name}
                    <span className="req" aria-hidden> *</span>
                  </span>
                  <FieldInput
                    id={id}
                    typeName={field.field_type?.name}
                    value={valueOf(field)}
                    onChange={(value) => {
                      setTyped((current) => ({ ...current, [field.form_field_id]: value }));
                      setValueErrors((current) => (current[field.form_field_id] ? { ...current, [field.form_field_id]: undefined } : current));
                    }}
                    label={field.field_display_name}
                    invalid={Boolean(problem)}
                    required
                    min={todayIso}
                  />
                  {problem ? <span className="err">{problem}</span> : null}
                </div>
              );
            })}
          </div>
        )
      ) : null}
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
            const typedText = event.target.value;
            const clean = typedText.replace(/[^א-ת ]/gu, '');
            setComment(clean);
            setFieldError(clean === typedText ? '' : 'ניתן להקליד אותיות בעברית ורווחים בלבד');
          }}
        />
      </label>
      <FieldError id="action-comment-error">
        {fieldError}
      </FieldError>
      <FormError>{error}</FormError>
    </FormDialog>
  );
}
