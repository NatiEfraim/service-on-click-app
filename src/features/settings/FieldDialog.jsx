'use client';

import { useMutation } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { settingsApi } from '@/lib/api/endpoints';
import { hasOwnRoute, SECTION_LABELS } from '@/lib/routeTypes';

import { useToast } from '@/providers/UiProvider';
import { fieldNameError, fieldTypeName, newOptionsError, parseOptionLines, retypeChoices } from './fieldRules';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { FieldOptionsEditor } from './FieldOptionsEditor';
import { Switch } from './Switch';
import { handleWriteError, useReloadSettings } from './useSettings';

/** The widths a field may take on a route form's 4-column grid. */
const COL_SPANS = [
  { value: 1, label: 'רבע שורה (1 מתוך 4)' },
  { value: 2, label: 'חצי שורה (2 מתוך 4)' },
  { value: 4, label: 'שורה שלמה (4 מתוך 4)' },
];

/**
 * Add or edit a field. An edit sends only the changed values with the shown `version` (stale means 409).
 * On a form with a route of its own (lib/routeTypes) a new field also says who fills it (the requester on submission,
 * or the handlers during the route) and how wide it is on the 4-column grid; both are fixed once the field exists.
 */
export function FieldDialog({ unitId, bookingTypeId, settings, field, onClose }) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const isNew = !field;
  const { field_types: fieldTypes } = settings;
  const routeForm = hasOwnRoute(bookingTypeId);
  const sections = settings.sections?.length ? settings.sections : Object.entries(SECTION_LABELS).map(([id, label]) => ({ id, label }));
  const sectionName = (id) => sections.find((section) => section.id === id)?.label ?? SECTION_LABELS[id] ?? id;

  const [name, setName] = useState(field?.field_display_name ?? '');
  const [typeId, setTypeId] = useState(field?.field_type_id ?? fieldTypes.find((type) => type.name === 'text')?.id ?? fieldTypes[0]?.id ?? 2);
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(field?.is_required ?? true);
  const [editable, setEditable] = useState(field?.editable ?? false);
  const [section, setSection] = useState(field?.section ?? 'requester');
  const [colSpan, setColSpan] = useState(Number(field?.col_span) || 1);
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
        const body = { field_display_name: name.trim(), field_type_id: typeId, is_required: required, editable: editable && canEditable };
        if (hasOptions) body.options = parseOptionLines(optionsText);
        if (routeForm) {
          body.section = section;
          body.col_span = colSpan;
        }
        return settingsApi.createField(unitId, bookingTypeId, body);
      }
      const body = { version: field.version };
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
      // nothing of the field itself changed: just close (its choices are saved the moment each is confirmed)
      onClose();
      return;
    }
    setError('');
    mutation.mutate();
  }

  const lockedReason = isNew
    ? ''
    : !field.is_custom
      ? 'סוג של שדה שהוגדר עם הטופס אינו ניתן לשינוי.'
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
        <AnimatedText>{nameError}</AnimatedText>
      </div>

      <div className="field st-types">
        <label htmlFor={`${ids}-type`}>סוג השדה</label>
        {isNew || field.can_change_type ? (
          <Select
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
          </Select>
        ) : (
          <>
            <div id={`${ids}-type`} className="st-locked">
              {fieldTypeName(field.field_type_id, fieldTypes)}
            </div>
            {lockedReason ? <span className="small muted">{lockedReason}</span> : null}
          </>
        )}
      </div>

      {routeForm ? (
        isNew ? (
          <>
            <div className="field">
              <span>מי ממלא את השדה</span>
              <Seg label="מי ממלא את השדה" value={section} onChange={setSection} options={sections.map((candidate) => ({ value: candidate.id, label: candidate.label }))} />
              <span className="small muted">{section === 'handler' ? 'ממולא על ידי הגורמים המטפלים במהלך הטיפול; אינו מוצג למבקש בהגשה.' : 'ממולא על ידי המבקש בעת ההגשה.'}</span>
            </div>
            <Field label="רוחב השדה בטופס">
              <Select className="input" value={colSpan} onChange={(event) => setColSpan(Number(event.target.value))}>
                {COL_SPANS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            מקטע: {sectionName(field.section ?? 'requester')} · רוחב: {Number(field.col_span) || 1} מתוך 4 (נקבעים בעת יצירת השדה).
          </p>
        )
      ) : null}

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
            <AnimatedText>{optionsError}</AnimatedText>
          </div>
        </>
      ) : null}
      {!isNew && currentType?.has_options ? (
        // the field's choices, seen and edited right here (the same editor as the options tab)
        <div className="st-dialog-options">
          <span className="label">אפשרויות הבחירה</span>
          <FieldOptionsEditor unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} field={field} canEdit={Boolean(settings.can_edit_global)} />
        </div>
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
        {isNew ? 'השדה יתווסף בסוף הטופס. קריאות קיימות לא יושפעו.' : 'השינוי יחול על קריאות חדשות בלבד.'}
      </p>
      <FormError>{error}</FormError>
    </Modal>
  );
}
