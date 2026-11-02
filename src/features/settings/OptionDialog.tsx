'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { Modal } from '@/components/ui/Modal';
import { settingsApi } from '@/lib/api/endpoints';
import type { FormField, OptionRow, Settings } from '@/lib/api/types';
import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { useToast } from '@/providers/UiProvider';
import { optionNameError } from './fieldRules';
import { handleWriteError, useReloadSettings } from './useSettings';

/** As in the mobile app: "הזנת ערך" is a number or closed text; a choice may be any type but a number. */
const FIELD_TYPE_NUMBER = 1;
export const FIELD_TYPE_TEXT = 2;
const INPUT_TYPES = [FIELD_TYPE_NUMBER, FIELD_TYPE_TEXT];

type Kind = 'choice' | 'input';

export interface OptionTarget {
  /** Missing for a new option. */
  option?: OptionRow;
  parent: OptionRow | null;
}

/** Add or edit an option: name, kind and field type; a new list-type option can bring closed-text sub-options. */
export function OptionDialog({ unitId, bookingTypeId, settings, field, target, siblings, onClose }: {
  unitId: number;
  bookingTypeId: number;
  settings: Settings;
  field: FormField;
  target: OptionTarget;
  siblings: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const { option, parent } = target;

  // the settings list may not carry the type yet; the siblings endpoint does
  const known = option?.field_type_id ?? null;
  const lookup = useQuery({
    queryKey: ['option-type', option?.id],
    queryFn: ({ signal }) => settingsApi.optionSiblings(option!.id, signal),
    enabled: Boolean(option) && known === null,
    staleTime: 60_000,
  });
  const loadedType = known ?? lookup.data?.siblings.find((sibling) => sibling.option_id === option?.id)?.field_type_id ?? null;

  const [name, setName] = useState(option?.name ?? '');
  const [kind, setKind] = useState<Kind>(option?.is_input ? 'input' : 'choice');
  const [typeId, setTypeId] = useState<number | null>(known);
  const [extras, setExtras] = useState<string[]>([]);
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

  const mutation = useMutation({
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
    onSuccess: async () => {
      toast(option ? 'האפשרות עודכנה.' : 'האפשרות נוספה.', 'ok');
      await reload();
      onClose();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setError(shown.status === 409 ? 'יש לטפל בתתי האפשרויות תחילה.' : shown.message);
      else onClose();
    },
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
    <Modal
      title={option ? 'עריכת אפשרות' : 'אפשרות חדשה'}
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button variant="primary" loading={mutation.isPending} disabled={Boolean(option) && lookup.isPending && known === null} onClick={submit}>
            שמירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <p className="small muted" style={{ margin: 0 }}>{where}</p>
      <label className="field">
        <span>שם האפשרות</span>
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
      </label>

      <div className="field">
        <span>סוג האפשרות</span>
        <Seg<Kind>
          label="סוג האפשרות"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'choice', label: 'בחירה' },
            { value: 'input', label: 'הזנת ערך' },
          ]}
        />
      </div>

      <label className="field">
        <span>סוג שדה</span>
        <select className="input" value={chosen ?? ''} onChange={(event) => setTypeId(Number(event.target.value))}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.display_name}
            </option>
          ))}
        </select>
      </label>
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
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
