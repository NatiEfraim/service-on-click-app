'use client';

import { useMutation } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { orgApi } from '@/lib/api/endpoints';
import type { OrgUnit } from '@/lib/api/types';
import { useToast } from '@/providers/UiProvider';
import { cleanCode, CODE_MAX, isUnnamed, NAME_MAX, validateUnit, type UnitErrors } from './rules';
import { useAfterOrgChange } from './useAfterOrgChange';
import './org.css';

/**
 * Add a unit or rename one. The letter is what the mobile app knows, so it is fixed once the unit exists (an edit sends the same letter);
 * only the name people see here changes. Refusals of the server (422, 409, 403) are shown in the dialog as they come.
 */
export function UnitDialog({ unit, units, onClose, onSaved }: { unit: OrgUnit | null; units: readonly OrgUnit[]; onClose: () => void; onSaved: (id: number) => void }) {
  const toast = useToast();
  const afterChange = useAfterOrgChange();
  const formId = useId();

  const [code, setCode] = useState(unit?.code ?? '');
  const [name, setName] = useState(unit && !isUnnamed(unit) ? unit.name : '');
  const [errors, setErrors] = useState<UnitErrors>({});
  const [formError, setFormError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: { code: string; name: string }) => (unit ? orgApi.updateUnit(unit.id, { code: unit.code, name: input.name }) : orgApi.createUnit(input)),
    onSuccess: async (result) => {
      toast(result.message || 'היחידה נשמרה.', 'ok');
      onSaved(result.data.id);
      onClose();
      await afterChange();
    },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : 'השמירה נכשלה.'),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    const others = units.filter((other) => other.id !== unit?.id);
    const found = validateUnit({ code, name }, others);
    setErrors(found);
    if (Object.keys(found).length) return;
    mutation.mutate({ code: code.trim().toUpperCase(), name: name.trim() });
  }

  return (
    <Modal
      title={unit ? `עריכת היחידה ${unit.code}` : 'יחידה חדשה'}
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button type="submit" form={formId} variant="primary" loading={mutation.isPending}>
            שמירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div className="cols2">
          <div>
            <label className="field">
              <span>אות (מוצגת באפליקציה)</span>
              <input
                className="input org-code"
                dir="ltr"
                style={{ textAlign: 'start' }}
                value={code}
                maxLength={CODE_MAX}
                readOnly={unit !== null}
                autoComplete="off"
                aria-invalid={errors.code ? true : undefined}
                aria-describedby={`${formId}-code-error`}
                onChange={(event) => setCode(cleanCode(event.target.value))}
              />
            </label>
            <div id={`${formId}-code-error`} className="err" aria-live="polite">
              {errors.code}
            </div>
          </div>
          <div>
            <label className="field">
              <span>שם היחידה (פנימי)</span>
              <input
                className="input"
                value={name}
                maxLength={NAME_MAX}
                autoComplete="off"
                placeholder="למשל: כנף צפון"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={`${formId}-name-error`}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div id={`${formId}-name-error`} className="err" aria-live="polite">
              {errors.name}
            </div>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {unit ? 'שינוי השם נשאר במערכת הפנימית. האות אינה ניתנת לשינוי, כי האפליקציה מזהה את היחידה לפיה.' : 'לאפליקציה תישלח רק האות. השם נשאר כאן, והאות לא ניתנת לשינוי אחרי היצירה.'}
        </p>
        {formError ? (
          <div className="err" role="alert">
            {formError}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
