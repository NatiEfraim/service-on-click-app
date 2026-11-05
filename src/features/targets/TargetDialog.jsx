'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { insightsApi } from '@/lib/api/endpoints';
import { invalidateWork, keys } from '@/lib/api/keys';

import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import { DEFAULT_TARGET_HOURS, DEFAULT_WARN_RATIO } from '@/lib/targets';
import { validateTargetInput, acceptsWarningInput, warningExplanation } from './validation';


/** Handling target of a booking type (opening to closing); empty removes it. Server range: 1 hour to 180 days. */
export function TargetDialog({ bookingTypeId, current, onClose }) {
  const client = useQueryClient();
  const toast = useToast();
  const { typeName } = useSession();

  // no target yet: the form starts from the default (48h), so saving makes it this domain's own
  const hours = current?.target_hours ?? DEFAULT_TARGET_HOURS;
  const inDays = hours !== null && hours % 24 === 0;
  const [value, setValue] = useState(hours === null ? '' : String(inDays ? hours / 24 : hours));
  const [unit, setUnit] = useState(hours === null || inDays ? 'd' : 'h');
  const [warnPercent, setWarnPercent] = useState(String(Math.round((current?.warn_ratio ?? DEFAULT_WARN_RATIO) * 10000) / 100));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (targetHours) => insightsApi.setTarget({ booking_type_id: bookingTypeId, target_hours: targetHours, warn_ratio: Number(warnPercent) / 100 }),
    onSuccess: async () => {
      toast('יעד הטיפול נשמר ונרשם בהיסטוריית השינויים.', 'ok');
      await Promise.all([invalidateWork(client), client.invalidateQueries({ queryKey: keys.targets }), client.invalidateQueries({ queryKey: keys.settingsAll })]);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'השמירה נכשלה.'),
  });

  function submit() {
    const trimmed = value.trim();
    if (trimmed === '') {
      setError('');
      mutation.mutate(null);
      return;
    }
    const problem = validateTargetInput(trimmed, unit, warnPercent);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    mutation.mutate(Number(trimmed) * (unit === 'd' ? 24 : 1));
  }

  return (
    <Modal
      title={`יעד טיפול: ${typeName(bookingTypeId)}`}
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
      <div className="target-dialog-body">
      <p className="muted" style={{ margin: 0 }}>
        הזמן שבו קריאה בתחום צריכה להיסגר, מרגע פתיחתה. קריאה שעוברת אותו מסומנת כחורגת, בכל שלב שבו היא נמצאת.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <Field label="יעד">
          <input className="input" type="text" inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} style={{ width: 110 }} value={value} onChange={(event) => { if (/^\d{0,3}$/.test(event.target.value)) setValue(event.target.value); }} />
        </Field>
        <Field label="יחידה">
          <Select autoWidth className="input" fadeOnChange value={unit} onChange={(event) => setUnit(event.target.value)}>
            <option value="d">ימים</option>
            <option value="h">שעות</option>
          </Select>
        </Field>
        <Field label="התראה מוקדמת">
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input className="input" type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} style={{ width: 110 }} value={warnPercent} aria-label="אחוז מהיעד להתראה מוקדמת" onChange={(event) => { if (acceptsWarningInput(event.target.value)) setWarnPercent(event.target.value); }} /><span aria-hidden="true">%</span></div>
        </Field>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        עד 999 שעות או 180 ימים. השארת היעד ריק מסירה אותו. ההתראה מופעלת באחוז שנבחר מתוך זמן היעד, מספר שלם בין 1 ל־99.
      </p>
      {warningExplanation(value, unit, warnPercent) ? <p className="small" style={{ margin: 0 }} aria-live="polite">{warningExplanation(value, unit, warnPercent)}</p> : null}
      <FormError>{error}</FormError>
      </div>
    </Modal>
  );
}
