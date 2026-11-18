'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FieldInput } from '@/components/booking/FieldInput';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';
import { fieldKind, fieldRules, validateValue } from '@/lib/form-fields';
import { fmtDate } from '@/lib/format';
import { handleWriteError } from '@/lib/useSaveMutation';
import { useToast } from '@/providers/UiProvider';

/** The messages of a 422 by field id (`values.<id>`), and - when none is tied to a field - the answer's one message. */
export function splitValueErrors(apiError) {
  const byField = {};
  for (const [key, messages] of Object.entries(apiError?.fieldErrors ?? {})) {
    const match = /^values\.(\d+)/.exec(key);
    if (match && messages[0]) byField[match[1]] = messages[0];
  }
  return { byField, message: Object.keys(byField).length ? '' : apiError?.message ?? '' };
}

/** A stored handler value as text: a date as the app shows dates, anything else as it came. */
export function handlerValueText(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  return fieldKind(field.field_type?.name).inputType === 'date' ? fmtDate(String(value)) : String(value);
}

/** The handler fields in form order. */
export const sortedHandlerFields = (fields) => [...(fields ?? [])].sort((a, b) => a.position - b.position || a.form_field_id - b.form_field_id);

/**
 * The handler section of a route-type request (lib/routeTypes: "למילוי על ידי גורמים רלוונטיים" - the interview's
 * place, date and time). Inputs while this user may write them (`can_edit`: a route role, at the first two steps),
 * saved with "שמירה" through PUT …/values - the changed fields only, with the seen version; read-only rows otherwise.
 * A 422 shows under its field; 409 / 403 reload the booking (the console's one write-error handling).
 */
export function HandlerFieldsPanel({ booking, title, hint }) {
  const client = useQueryClient();
  const toast = useToast();
  const fields = sortedHandlerFields(booking.handler_fields);
  const editable = fields.some((field) => field.can_edit);
  const initial = Object.fromEntries(fields.map((field) => [field.form_field_id, field.value == null ? '' : String(field.value)]));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  // the API refuses an interview moment that already passed
  const [todayIso] = useState(() => new Date().toLocaleDateString('sv-SE'));

  const mutation = useMutation({
    mutationFn: (changed) => bookingsApi.updateValues(booking.uuid ?? booking.serial_number, { values: changed, version: booking.version, reason: null }),
    onSuccess: async (result) => {
      toast(result.data?.message || result.message || 'פרטי הטיפול עודכנו', 'ok');
      await invalidateWork(client);
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'העדכון נכשל.');
      const shown = await handleWriteError(apiError, toast, () => invalidateWork(client));
      if (!shown) return;
      const { byField, message } = splitValueErrors(shown);
      setErrors(byField);
      setError(message);
    },
  });

  const set = (id, value) => {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    setError('');
  };

  const submit = () => {
    const changed = {};
    const problems = {};
    for (const field of fields) {
      if (!field.can_edit) continue;
      const next = values[field.form_field_id] ?? '';
      // the format only: whether all three are needed now is the server's rule (at the second step they must stay complete)
      const problem = validateValue(fieldRules(field.validations), next, { required: false, kind: fieldKind(field.field_type?.name).inputType });
      if (problem) problems[field.form_field_id] = problem;
      if (next !== initial[field.form_field_id]) changed[String(field.form_field_id)] = next;
    }
    setErrors(problems);
    if (Object.keys(problems).length) return;
    if (!Object.keys(changed).length) {
      setError('לא בוצע שינוי.');
      return;
    }
    setError('');
    mutation.mutate(changed);
  };

  if (!fields.length) return null;

  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {hint ? <span className="hint">{hint}</span> : null}
      </header>
      <div className="body">
        <div className="handler-fields">
          {fields.map((field) => {
            const id = `hf-${field.form_field_id}`;
            const span = Math.min(Math.max(Number(field.col_span) || 1, 1), 4);
            const problem = errors[field.form_field_id];
            return (
              // a div, not a <label>: a click on the open calendar must not be forwarded to its button
              <div key={field.form_field_id} className="field" style={{ gridColumn: `span ${span}` }}>
                <span>
                  {field.field_display_name}
                  {field.is_required && field.can_edit ? <span className="req" aria-hidden> *</span> : null}
                </span>
                {field.can_edit ? (
                  <FieldInput id={id} typeName={field.field_type?.name} value={values[field.form_field_id] ?? ''} onChange={(value) => set(field.form_field_id, value)} label={field.field_display_name} invalid={Boolean(problem)} required={field.is_required} min={todayIso} />
                ) : (
                  <div className="handler-value">{handlerValueText(field, field.value)}</div>
                )}
                {problem ? <span className="err">{problem}</span> : null}
              </div>
            );
          })}
        </div>
        {editable ? (
          <div className="handler-save">
            <Button variant="primary" icon="check" loading={mutation.isPending} onClick={submit}>
              שמירה
            </Button>
            <span className="small muted">נשמרים רק השדות ששונו; שלב הקריאה והמטפל אינם משתנים.</span>
            <FormError>{error}</FormError>
          </div>
        ) : null}
      </div>
    </section>
  );
}
