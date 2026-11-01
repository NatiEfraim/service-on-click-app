'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { editableInitialValue } from '@/lib/booking-values';
import { ApiError } from '@/lib/api/client';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';
import type { BookingDetail } from '@/lib/api/types';
import { FIELD_TYPE_TIME } from '@/lib/labels';
import { useToast } from '@/providers/UiProvider';

/**
 * Correct the date / time of a booking while it is the user's turn (before the final approval).
 * Only the fields in `editable_fields` are offered and only the ones that changed are sent, with the `version` that was shown.
 */
export function EditValuesDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();

  const initial = Object.fromEntries(
    booking.editable_fields.map((field) => [field.form_field_id, editableInitialValue(booking.booking_values, field.form_field_id, field.field_type_id === FIELD_TYPE_TIME ? 'time' : 'date')]),
  );
  const [values, setValues] = useState<Record<number, string>>(initial);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (changed: Record<string, string>) => bookingsApi.updateValues(booking.serial_number, { values: changed, version: booking.version, reason: reason.trim() || null }),
    onSuccess: async (result) => {
      const changed = result.data?.changed ?? [];
      toast(changed.length ? `עודכן: ${changed.join(', ')}` : 'הפרטים עודכנו.', 'ok');
      await invalidateWork(client);
      onClose();
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'העדכון נכשל.');
      if (apiError.stale || apiError.denied) {
        toast(apiError.message, 'bad');
        await invalidateWork(client);
        onClose();
        return;
      }
      setError(apiError.message);
    },
  });

  function submit() {
    const changed: Record<string, string> = {};
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
    <Modal
      title="עדכון פרטי הקריאה"
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button variant="primary" loading={mutation.isPending} onClick={submit}>
            שמירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0 }}>
        ניתן לעדכן שדות תאריך ושעה עד האישור הסופי. העדכון נשלח גם לאפליקציה.
      </p>
      {booking.editable_fields.map((field) => (
        <label key={field.form_field_id} className="field">
          <span>{field.field_display_name}</span>
          <input
            className="input"
            type={field.field_type_id === FIELD_TYPE_TIME ? 'time' : 'date'}
            value={values[field.form_field_id] ?? ''}
            onChange={(event) => setValues((current) => ({ ...current, [field.form_field_id]: event.target.value }))}
          />
        </label>
      ))}
      <label className="field">
        <span>סיבת העדכון (רשות)</span>
        <input className="input" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
