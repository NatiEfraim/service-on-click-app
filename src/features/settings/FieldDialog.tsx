'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { settingsApi, type NewFieldBody, type UpdateFieldBody } from '@/lib/api/endpoints';
import type { FormField, Settings } from '@/lib/api/types';
import { useToast } from '@/providers/UiProvider';
import { fieldNameError, fieldTypeName, newOptionsError, parseOptionLines, retypeChoices } from './fieldRules';
import { Switch } from './Switch';
import { handleWriteError, useReloadSettings } from './useSettings';

interface FieldDialogProps {
  unitId: number;
  bookingTypeId: number;
  settings: Settings;
  /** The field to change; leave out to add a new one at the end of the form. */
  field?: FormField;
  onClose: () => void;
}

/** Add or edit a field. An edit sends only the changed values with the shown `version` (stale means 409). */
export function FieldDialog({ unitId, bookingTypeId, settings, field, onClose }: FieldDialogProps) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const isNew = !field;
  const { field_types: fieldTypes } = settings;

  const [name, setName] = useState(field?.field_display_name ?? '');
  const [typeId, setTypeId] = useState(field?.field_type_id ?? fieldTypes.find((type) => type.name === 'text')?.id ?? fieldTypes[0]?.id ?? 2);
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(field?.is_required ?? true);
  const [editable, setEditable] = useState(field?.editable ?? false);
  const [nameError, setNameError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [error, setError] = useState('');

  const currentType = fieldTypes.find((type) => type.id === typeId);
  const canEditable = currentType?.can_be_editable ?? false;
  const choices = isNew ? fieldTypes : retypeChoices(fieldTypes, fieldTypes.find((type) => type.id === field.field_type_id));
  const hasOptions = isNew && (currentType?.has_options ?? false);
  const others = settings.form_fields.filter((other) => other.id !== field?.id);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const body: NewFieldBody = { field_display_name: name.trim(), field_type_id: typeId, is_required: required, editable: editable && canEditable };
        if (hasOptions) body.options = parseOptionLines(optionsText);
        return settingsApi.createField(unitId, bookingTypeId, body);
      }
      const body: UpdateFieldBody = { version: field.version };
      if (name.trim() !== field.field_display_name) body.field_display_name = name.trim();
      if (typeId !== field.field_type_id) body.field_type_id = typeId;
      if (required !== field.is_required) body.is_required = required;
      if (editable !== field.editable) body.editable = editable;
      return settingsApi.updateField(field.id, body);
    },
    onSuccess: async () => {
      toast(isNew ? 'השדה נוסף לטופס, בסופו. קריאות קיימות לא הושפעו.' : 'השדה עודכן.', 'ok');
      await reload();
      onClose();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setError(shown.message);
      else onClose();
    },
  });

  function submit() {
    const problem = fieldNameError(name, others);
    const optionProblem = hasOptions ? newOptionsError(parseOptionLines(optionsText)) : null;
    setNameError(problem ?? '');
    setOptionsError(optionProblem ?? '');
    if (problem || optionProblem) return;

    if (!isNew && name.trim() === field.field_display_name && typeId === field.field_type_id && required === field.is_required && editable === field.editable) {
      setError('לא בוצע שינוי.');
      return;
    }
    setError('');
    mutation.mutate();
  }

  const lockedReason = isNew
    ? ''
    : !field.is_custom
      ? 'סוג של שדה שקיים באפליקציה אינו ניתן לשינוי.'
      : field.used_by > 0
        ? `לא ניתן לשנות סוג: השדה מופיע ב-${field.used_by} קריאות. אפשר להוסיף שדה חדש ולהסיר את הישן.`
        : '';

  return (
    <Modal
      title={isNew ? 'הוספת שדה לטופס' : `עריכת השדה "${field.field_display_name}"`}
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button variant="primary" loading={mutation.isPending} onClick={submit}>
            {isNew ? 'הוספה' : 'שמירה'}
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <Field label="שם השדה כפי שיוצג למבקש">
        <input
          className="input"
          maxLength={50}
          value={name}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={`${ids}-name-err`}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError('');
          }}
        />
      </Field>
      <div id={`${ids}-name-err`} className="err" aria-live="polite">
        {nameError}
      </div>

      <div className="field st-types">
        <label htmlFor={`${ids}-type`}>סוג השדה</label>
        {isNew || field.can_change_type ? (
          <select
            id={`${ids}-type`}
            className="input"
            value={typeId}
            onChange={(event) => {
              const next = Number(event.target.value);
              setTypeId(next);
              if (!fieldTypes.find((type) => type.id === next)?.can_be_editable) setEditable(false);
            }}
          >
            {choices.map((type) => (
              <option key={type.id} value={type.id}>
                {type.display_name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <div id={`${ids}-type`} className="st-locked">
              {fieldTypeName(field.field_type_id, fieldTypes)}
            </div>
            {lockedReason ? <span className="small muted">{lockedReason}</span> : null}
          </>
        )}
      </div>

      {hasOptions ? (
        <>
          <Field label="אפשרויות (שורה לכל אפשרות, לפחות אחת)">
            <textarea
              className="input"
              rows={4}
              value={optionsText}
              aria-invalid={optionsError ? true : undefined}
              aria-describedby={`${ids}-opt-err`}
              onChange={(event) => {
                setOptionsText(event.target.value);
                if (optionsError) setOptionsError('');
              }}
            />
          </Field>
          <div id={`${ids}-opt-err`} className="err" aria-live="polite">
            {optionsError}
          </div>
        </>
      ) : null}
      {!isNew && currentType?.has_options ? (
        <p className="small muted" style={{ margin: 0 }}>
          את האפשרויות עצמן עורכים ב
          <Link className="st-link" href={`?tab=options&field=${field.id}`}>
            לשונית &quot;אפשרויות בחירה&quot;
          </Link>
          .
        </p>
      ) : null}

      <div className="st-check-row">
        <Switch checked={required} onChange={setRequired}>
          שדה חובה
        </Switch>
        {canEditable ? (
          <Switch checked={editable} onChange={setEditable} hint="מאשר יכול לתקן את הערך בזמן הטיפול בקריאה (תאריך ושעה בלבד).">
            מאשר יכול לעדכן
          </Switch>
        ) : null}
      </div>

      {!isNew && field.used_by > 0 ? (
        <p className="small muted" style={{ margin: 0 }}>
          השדה מופיע ב-{field.used_by} קריאות. שינוי השם לא משנה את מה שנשמר בהן.
        </p>
      ) : null}
      <p className="small muted" style={{ margin: 0 }}>
        {isNew ? 'השדה יתווסף בסוף הטופס ויופיע גם בטופס באפליקציה. קריאות קיימות לא יושפעו.' : 'השינוי יחול גם בטופס באפליקציה, על קריאות חדשות בלבד.'}
      </p>
      <FormError>{error}</FormError>
    </Modal>
  );
}
