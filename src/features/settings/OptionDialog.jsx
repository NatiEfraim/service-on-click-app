'use client';

import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Seg } from '@/components/ui/Controls';
import { FormDialog } from '@/components/ui/FormDialog';
import { settingsApi } from '@/lib/api/endpoints';
import { useSaveMutation } from '@/lib/useSaveMutation';

import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { FIELD_TYPE_NUMBER, FIELD_TYPE_TEXT, INPUT_TYPES } from './constants';
import { optionNameError } from './fieldRules';
import { useReloadSettings } from './useSettings';

/** Add or edit an option: name, kind and field type; a new list-type option can bring closed-text sub-options. */
export function OptionDialog({ unitId, bookingTypeId, settings, field, target, siblings, onClose }) {
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const { option, parent } = target;

  // the settings list may not carry the type yet; the siblings endpoint does
  const known = option?.field_type_id ?? null;
  const lookup = useQuery({
    queryKey: ['option-type', option?.id],
    queryFn: ({ signal }) => settingsApi.optionSiblings(option.id, signal),
    enabled: Boolean(option) && known === null,
    staleTime: 60_000,
  });
  const loadedType = known ?? lookup.data?.siblings.find((sibling) => sibling.option_id === option?.id)?.field_type_id ?? null;

  const [name, setName] = useState(option?.name ?? '');
  const [kind, setKind] = useState(option?.is_input ? 'input' : 'choice');
  const [typeId, setTypeId] = useState(known);
  const [extras, setExtras] = useState([]);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');

  // once the looked-up type arrives, take it (adjusted during render)
  const [seenType, setSeenType] = useState(loadedType);
  if (loadedType !== seenType) {
    setSeenType(loadedType);
    if (typeId === null && loadedType !== null) {
      setTypeId(loadedType);
      // a number is only ever a typed value
      if (loadedType === FIELD_TYPE_NUMBER) setKind('input');
    }
  }

  const types = settings.field_types.filter((type) => (kind === 'input' ? INPUT_TYPES.includes(type.id) : type.id !== FIELD_TYPE_NUMBER));
  const chosen = typeId !== null && types.some((type) => type.id === typeId) ? typeId : (types.find((type) => type.id === FIELD_TYPE_TEXT)?.id ?? types[0]?.id ?? null);
  const isList = chosen !== null && OPTION_FIELD_TYPES.includes(chosen);
  const offerExtras = !option && kind === 'choice' && isList;

  const mutation = useSaveMutation({
    mutationFn: async () => {
      const saved = await settingsApi.saveOption(field.id, {
        ...(option ? { option_id: option.id } : {}),
        option_name: name.trim(),
        parent_option_id: parent?.id ?? option?.parent_id ?? null,
        has_category: isList || Boolean(option?.has_category),
        field_type_id: chosen,
        is_input: kind === 'input',
      });
      const savedId = saved.data?.option_id;
      if (offerExtras && savedId) {
        for (const extra of extras.map((value) => value.trim()).filter(Boolean)) {
          await settingsApi.saveOption(field.id, { option_name: extra, parent_option_id: savedId, has_category: false, field_type_id: FIELD_TYPE_TEXT, is_input: false });
        }
      }
    },
    success: option ? 'האפשרות עודכנה.' : 'האפשרות נוספה.',
    reload,
    onSaved: onClose,
    onFailed: (shown) => setError(shown.status === 409 ? 'יש לטפל בתתי האפשרויות תחילה.' : shown.message),
    onHandled: onClose,
  });

  function submit() {
    const unchanged = option && name.trim() === option.name && chosen === loadedType && (kind === 'input') === Boolean(option.is_input);
    const found = unchanged ? 'לא בוצע שינוי.' : optionNameError(name, siblings) ?? extras.map((extra, index) => (extra.trim() ? optionNameError(extra, extras.filter((_, other) => other !== index)) : null)).find(Boolean) ?? null;
    setProblem(found ?? '');
    if (found) return;
    setError('');
    mutation.mutate();
  }

  const where = parent ? `בתוך "${parent.name}"` : `בשדה "${field.field_display_name}"`;

  return (
    <FormDialog
      dirty={name.trim() !== (option?.name ?? '').trim() || kind !== (option?.is_input ? 'input' : 'choice') || extras.some((extra) => extra.trim() !== '') || (typeId !== null && typeId !== loadedType)}
      title={option ? 'עריכת אפשרות' : 'אפשרות חדשה'}
      onClose={onClose}
      busy={mutation.isPending}
      submitDisabled={Boolean(option) && lookup.isPending && known === null}
      onSubmit={submit}
    >
      <p className="small muted" style={{ margin: 0 }}>{where}</p>
      <Field label="שם האפשרות">
        <input
          className="input"
          maxLength={50}
          value={name}
          autoFocus
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${ids}-err`}
          onChange={(event) => {
            setName(event.target.value);
            setProblem('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        />
      </Field>

      <div className="field">
        <span>סוג האפשרות</span>
        <Seg
          label="סוג האפשרות"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'choice', label: 'בחירה' },
            { value: 'input', label: 'הזנת ערך' },
          ]}
        />
      </div>

      <Field label="סוג שדה">
        <Select className="input" value={chosen ?? ''} onChange={(event) => setTypeId(Number(event.target.value))}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.display_name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="small muted" style={{ margin: 0 }}>
        {kind === 'input' ? 'המבקש יקליד ערך במקום לבחור.' : isList ? 'אפשרות מסוג רשימה מכילה תתי-אפשרויות משלה.' : 'אפשרות רגילה לבחירה.'}
      </p>

      {offerExtras ? (
        <div className="field st-extras">
          <span>תתי-אפשרויות (טקסט סגור)</span>
          {extras.map((extra, index) => (
            <div key={index} className="st-extra-row">
              <input
                className="input"
                maxLength={50}
                value={extra}
                aria-label={`תת-אפשרות ${index + 1}`}
                onChange={(event) => {
                  const next = [...extras];
                  next[index] = event.target.value;
                  setExtras(next);
                  setProblem('');
                }}
              />
              <Button size="sm" variant="danger" icon="trash" aria-label={`הסרת תת-אפשרות ${index + 1}`} onClick={() => setExtras(extras.filter((_, other) => other !== index))} />
            </div>
          ))}
          <Button size="sm" icon="plus" onClick={() => setExtras([...extras, ''])}>
            הוספת תת-אפשרות
          </Button>
        </div>
      ) : null}

      <div id={`${ids}-err`} className="err" aria-live="polite">
        {problem}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        השינוי נשמר מיד, נרשם בהיסטוריית השינויים ונשלח גם לאפליקציה.
      </p>
      <FormError>{error}</FormError>
    </FormDialog>
  );
}
