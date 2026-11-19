'use client';

import { useId, useState } from 'react';
import { FieldError, FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { orgApi } from '@/lib/api/endpoints';
import { useSaveMutation } from '@/lib/useSaveMutation';
import { cleanCode, CODE_MAX, isUnnamed, NAME_MAX, validateUnit } from './rules';
import { useAfterOrgChange } from './useAfterOrgChange';
import './org.css';

/** Add or rename a unit. The letter is fixed once created (the mobile app relies on it); edits resend it. */
export function UnitDialog({ unit, units, onClose, onSaved }) {
  const afterChange = useAfterOrgChange();
  const formId = useId();

  const [code, setCode] = useState(unit?.code ?? '');
  const [name, setName] = useState(unit && !isUnnamed(unit) ? unit.name : '');
  const [start] = useState({ code, name }); // the values the dialog opened with
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const mutation = useSaveMutation({
    mutationFn: (input) => (unit ? orgApi.updateUnit(unit.id, { code: unit.code, name: input.name }) : orgApi.createUnit(input)),
    success: (result) => result.message || 'היחידה נשמרה.',
    reload: afterChange,
    onSaved: (result) => {
      onSaved(result.data.id);
      onClose();
    },
    onFailed: (error) => setFormError(error.message || 'השמירה נכשלה.'),
    onHandled: onClose,
  });

  function submit(event) {
    event.preventDefault();
    setFormError('');
    const others = units.filter((other) => other.id !== unit?.id);
    const found = validateUnit({ code, name }, others);
    setErrors(found);
    if (Object.keys(found).length) return;
    mutation.mutate({ code: code.trim().toUpperCase(), name: name.trim() });
  }

  return (
    <FormDialog
      dirty={code !== start.code || name !== start.name}
      title={unit ? `עריכת היחידה ${unit.code}` : 'יחידה חדשה'}
      onClose={onClose}
      busy={mutation.isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div className="cols2">
          <div>
            <Field label="אות (מוצגת באפליקציה)">
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
            </Field>
            <FieldError id={`${formId}-code-error`}>
              {errors.code}
            </FieldError>
          </div>
          <div>
            <Field label="שם היחידה (פנימי)">
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
            </Field>
            <FieldError id={`${formId}-name-error`}>
              {errors.name}
            </FieldError>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {unit ? 'שינוי השם נשאר במערכת הפנימית. האות אינה ניתנת לשינוי, כי האפליקציה מזהה את היחידה לפיה.' : 'לאפליקציה תישלח רק האות. השם נשאר כאן, והאות לא ניתנת לשינוי אחרי היצירה.'}
        </p>
        <FormError>{formError}</FormError>
      </form>
    </FormDialog>
  );
}
