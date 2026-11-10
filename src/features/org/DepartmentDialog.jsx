'use client';

import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { ApiError } from '@/lib/api/client';
import { orgApi } from '@/lib/api/endpoints';

import { useToast } from '@/providers/UiProvider';
import { NAME_MAX, validateDepartment } from './rules';
import { useAfterOrgChange } from './useAfterOrgChange';

/** Add or rename a department of a unit. */
export function DepartmentDialog({ unit, department, onClose }) {
  const toast = useToast();
  const afterChange = useAfterOrgChange();
  const formId = useId();

  const [name, setName] = useState(department?.name ?? '');
  const [start] = useState({ name }); // the values the dialog opened with
  const [problem, setProblem] = useState('');
  const [formError, setFormError] = useState('');

  const mutation = useMutation({
    mutationFn: (clean) => (department ? orgApi.updateDepartment(department.id, { name: clean }) : orgApi.createDepartment(unit.id, { name: clean })),
    onSuccess: async (result) => {
      toast(result.message || 'המחלקה נשמרה.', 'ok');
      onClose();
      await afterChange();
    },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : 'השמירה נכשלה.'),
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
          <div id={`${formId}-error`} className="err" aria-live="polite">
            {problem}
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          שם המחלקה פנימי בלבד ולא מועבר לאפליקציה.
        </p>
        <FormError>{formError}</FormError>
      </form>
    </FormDialog>
  );
}
