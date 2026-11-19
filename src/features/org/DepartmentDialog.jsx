'use client';

import { useId, useState } from 'react';
import { FieldError, FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { orgApi } from '@/lib/api/endpoints';
import { useSaveMutation } from '@/lib/useSaveMutation';
import { NAME_MAX, validateDepartment } from './rules';
import { useAfterOrgChange } from './useAfterOrgChange';

/** Add or rename a department of a unit. */
export function DepartmentDialog({ unit, department, onClose }) {
  const afterChange = useAfterOrgChange();
  const formId = useId();

  const [name, setName] = useState(department?.name ?? '');
  const [start] = useState({ name }); // the values the dialog opened with
  const [problem, setProblem] = useState('');
  const [formError, setFormError] = useState('');

  const mutation = useSaveMutation({
    mutationFn: (clean) => (department ? orgApi.updateDepartment(department.id, { name: clean }) : orgApi.createDepartment(unit.id, { name: clean })),
    success: (result) => result.message || 'המחלקה נשמרה.',
    reload: afterChange,
    onSaved: onClose,
    onFailed: (error) => setFormError(error.message || 'השמירה נכשלה.'),
    onHandled: onClose,
  });

  function submit(event) {
    event.preventDefault();
    setFormError('');
    const siblings = unit.departments.filter((other) => other.id !== department?.id).map((other) => other.name);
    const found = validateDepartment(name, siblings);
    setProblem(found ?? '');
    if (found) return;
    mutation.mutate(name.trim());
  }

  return (
    <FormDialog
      dirty={name !== start.name}
      title={department ? 'עריכת מחלקה' : `מחלקה חדשה ביחידה ${unit.name}`}
      onClose={onClose}
      busy={mutation.isPending}
      formId={formId}
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div>
          <Field label="שם המחלקה">
            <input
              className="input"
              value={name}
              maxLength={NAME_MAX}
              autoComplete="off"
              aria-invalid={problem ? true : undefined}
              aria-describedby={`${formId}-error`}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <FieldError id={`${formId}-error`}>
            {problem}
          </FieldError>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          שם המחלקה פנימי בלבד ולא מועבר לאפליקציה.
        </p>
        <FormError>{formError}</FormError>
      </form>
    </FormDialog>
  );
}
