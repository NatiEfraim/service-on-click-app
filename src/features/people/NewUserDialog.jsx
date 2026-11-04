'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { peopleApi } from '@/lib/api/endpoints';

import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import { digitsOnly, fieldOfServerError, FULL_NAME_MAX, PERSONAL_NUMBER_MAX, PHONE_LENGTH, toNewUserBody, validateNewUser } from './newUser';
import { invalidatePeople } from './queries';

/** Adds a person. Only the super admin picks the unit; the server forces everyone else's own unit. */
export function NewUserDialog({ onClose, onCreated }) {
  const client = useQueryClient();
  const toast = useToast();
  const { me, catalog } = useSession();
  const formId = useId();
  const errorId = (field) => `${formId}-${field}-error`;

  const [fullName, setFullName] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [chosenUnit, setChosenUnit] = useState(me.user.unit_id ?? catalog.units[0]?.id ?? 0);
  const [departmentId, setDepartmentId] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const unitId = me.is_super_admin ? chosenUnit : me.user.unit_id;
  const departments = catalog.departments.filter((department) => department.unit_id === unitId && department.is_active !== false);

  const mutation = useMutation({
    mutationFn: (body) => peopleApi.createUser(body),
    onSuccess: async (result) => {
      toast(result.message || 'המשתמש נוצר.', 'ok');
      onCreated(result.data);
      onClose();
      await invalidatePeople(client);
    },
    onError: (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'יצירת המשתמש נכשלה.');
      const fromServer = {};
      for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
        const field = fieldOfServerError(key);
        if (field && messages[0] && !fromServer[field]) fromServer[field] = messages[0];
      }
      setErrors(fromServer);
      // messages tied to no field are shown once for the form
      setFormError(Object.keys(fromServer).length ? '' : apiError.message);
    },
  });

  function submit(event) {
    event.preventDefault();
    const input = { fullName, personalNumber, phone };
    const found = validateNewUser(input);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    mutation.mutate(
      toNewUserBody(input, {
        unitId: me.is_super_admin ? chosenUnit : undefined,
        departmentId: departmentId ? Number(departmentId) : null,
      }),
    );
  }

  const a11y = (name) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? errorId(name) : undefined,
  });

  const fieldError = (name) => (
    <div id={errorId(name)} className="err" aria-live="polite">
      {errors[name]}
    </div>
  );

  return (
    <Modal
      title="משתמש חדש"
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button type="submit" form={formId} variant="primary" loading={mutation.isPending}>
            יצירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div>
          <Field label="שם מלא">
            <input
              className="input"
              value={fullName}
              maxLength={FULL_NAME_MAX}
              autoComplete="off"
              required
              placeholder="אותיות בעברית בלבד"
              onChange={(event) => setFullName(event.target.value)}
              {...a11y('fullName')}
            />
          </Field>
          {fieldError('fullName')}
        </div>

        <div className="cols2">
          <div>
            <Field label="מספר אישי">
              <input
                className="input"
                value={personalNumber}
                inputMode="numeric"
                maxLength={PERSONAL_NUMBER_MAX}
                autoComplete="off"
                required
                placeholder="7 או 8 ספרות"
                onChange={(event) => setPersonalNumber(digitsOnly(event.target.value, PERSONAL_NUMBER_MAX))}
                {...a11y('personalNumber')}
              />
            </Field>
            {fieldError('personalNumber')}
          </div>
          <div>
            <Field label="טלפון נייד (רשות)">
              <input
                className="input"
                type="tel"
                value={phone}
                inputMode="numeric"
                maxLength={PHONE_LENGTH}
                autoComplete="off"
                placeholder="05XXXXXXXX"
                onChange={(event) => setPhone(digitsOnly(event.target.value, PHONE_LENGTH))}
                {...a11y('phone')}
              />
            </Field>
            {fieldError('phone')}
          </div>
        </div>

        <div className="cols2">
          {me.is_super_admin ? (
            <Field label="יחידה">
              <Select
                className="input"
                value={chosenUnit}
                onChange={(event) => {
                  setChosenUnit(Number(event.target.value));
                  setDepartmentId('');
                }}
              >
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="מחלקה (רשות)">
            <Select className="input" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">ללא מחלקה</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
