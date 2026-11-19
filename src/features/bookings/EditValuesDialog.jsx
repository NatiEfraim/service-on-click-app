'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DatePicker } from '@/components/ui/DateRangePicker';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { editableInitialValue } from '@/lib/booking-values';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';

import { FIELD_TYPE_TIME } from '@/lib/labels';
import { useToast } from '@/providers/UiProvider';
import { handleWriteError } from '@/lib/useSaveMutation';

/** Edits a booking's date / time: only `editable_fields`, only changed values, with the seen `version`. */
export function EditValuesDialog({ booking, onClose }) {
  const client = useQueryClient();
  const toast = useToast();

  const initial = Object.fromEntries(
    booking.editable_fields.map((field) => [field.form_field_id, editableInitialValue(booking.booking_values, field.form_field_id, field.field_type_id === FIELD_TYPE_TIME ? 'time' : 'date')]),
  );
  const [values, setValues] = useState(initial);
  const [start] = useState(() => JSON.stringify(initial)); // the values the dialog opened with
  const [todayIso] = useState(() => new Date().toLocaleDateString('sv-SE')); // 'YYYY-MM-DD' in local time
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (changed) => bookingsApi.updateValues(booking.uuid ?? booking.serial_number, { values: changed, version: booking.version, reason: reason.trim() || null }),
    onSuccess: async (result) => {
      const changed = result.data?.changed ?? [];
      toast(changed.length ? `עודכן: ${changed.join(', ')}` : 'הפרטים עודכנו.', 'ok');
      await invalidateWork(client);
      onClose();
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'העדכון נכשל.');
      // booking changed or no longer ours: the message once, reload and close (the console's one write-error handling)
      const shown = await handleWriteError(apiError, toast, async () => {
        await invalidateWork(client);
        onClose();
      });
      if (shown) setError(shown.message);
    },
  });

  function submit() {
    const changed = {};
    for (const field of booking.editable_fields) {
      const next = values[field.form_field_id] ?? '';
      if (next && next !== initial[field.form_field_id]) changed[String(field.form_field_id)] = next;
    }
    if (!Object.keys(changed).length) {
      setError('לא בוצע שינוי.');
      return;
    }
    setError('');
    mutation.mutate(changed);
  }

  return (
    <FormDialog
      dirty={reason.trim() !== '' || JSON.stringify(values) !== start}
      title="עדכון פרטי הקריאה"
      onClose={onClose}
      busy={mutation.isPending}
      onSubmit={submit}
    >
      <p className="muted" style={{ margin: 0 }}>
        ניתן לעדכן שדות תאריך ושעה עד האישור הסופי. העדכון נשלח גם לאפליקציה.
      </p>
      {booking.editable_fields.map((field) =>
        field.field_type_id === FIELD_TYPE_TIME ? (
          <label key={field.form_field_id} className="field">
            <span>{field.field_display_name}</span>
            <input
              className="input"
              type="time"
              value={values[field.form_field_id] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.form_field_id]: event.target.value }))}
            />
          </label>
        ) : (
          // a div, not a <label>: a click on the open calendar must not be forwarded to its button
          <Field key={field.form_field_id} as="div" label={field.field_display_name}>
            <DatePicker
              label=""
              clearable={false}
              // the API refuses a date that already passed
              min={todayIso}
              value={values[field.form_field_id] ?? ''}
              onChange={(day) => setValues((current) => ({ ...current, [field.form_field_id]: day }))}
            />
          </Field>
        ),
      )}
      <Field label="סיבת העדכון (רשות)">
        <input className="input" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
      <FormError>{error}</FormError>
    </FormDialog>
  );
}
