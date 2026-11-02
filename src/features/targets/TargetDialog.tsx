'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { insightsApi } from '@/lib/api/endpoints';
import { invalidateWork, keys } from '@/lib/api/keys';
import type { SlaTarget } from '@/lib/api/types';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import { WARN_RATIOS } from './constants';


/** Handling target of a booking type (opening to closing); empty removes it. Server range: 1 hour to 180 days. */
export function TargetDialog({ bookingTypeId, current, onClose }: { bookingTypeId: number; current: SlaTarget | null; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const { typeName } = useSession();

  const hours = current?.target_hours ?? null;
  const inDays = hours !== null && hours % 24 === 0;
  const [value, setValue] = useState(hours === null ? '' : String(inDays ? hours / 24 : hours));
  const [unit, setUnit] = useState<'d' | 'h'>(hours === null || inDays ? 'd' : 'h');
  const [warn, setWarn] = useState(current?.warn_ratio ?? 0.8);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (targetHours: number | null) => insightsApi.setTarget({ booking_type_id: bookingTypeId, target_hours: targetHours, warn_ratio: warn }),
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
    const number = Number(trimmed);
    if (!Number.isFinite(number) || number <= 0) {
      setError('יש להזין מספר גדול מאפס.');
      return;
    }
    setError('');
    mutation.mutate(number * (unit === 'd' ? 24 : 1));
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
      <p className="muted" style={{ margin: 0 }}>
        הזמן שבו קריאה בתחום צריכה להיסגר, מרגע פתיחתה. קריאה שעוברת אותו מסומנת כחורגת, בכל שלב שבו היא נמצאת.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <Field label="יעד">
          <input className="input" type="number" min={1} style={{ width: 110 }} value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="יחידה">
          <select className="input" value={unit} onChange={(event) => setUnit(event.target.value as 'd' | 'h')}>
            <option value="d">ימים</option>
            <option value="h">שעות</option>
          </select>
        </Field>
        <Field label="התראה מוקדמת">
          <select className="input" value={warn} onChange={(event) => setWarn(Number(event.target.value))}>
            {WARN_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                ב-{Math.round(ratio * 100)}% מהיעד
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        השארת השדה ריק מסירה את היעד.
      </p>
      <FormError>{error}</FormError>
    </Modal>
  );
}
