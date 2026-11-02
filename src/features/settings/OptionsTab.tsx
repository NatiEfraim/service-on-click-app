'use client';

import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import type { FieldType, OptionRow, Settings } from '@/lib/api/types';
import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { fieldTypeName } from './fieldRules';
import { FIELD_TYPE_TEXT } from './constants';
import { OptionDialog, type OptionTarget } from './OptionDialog';
import { buildOptionTree, choiceFields, countOptions, fieldPath, type OptionNode } from './options';
import { handleWriteError, useReloadSettings } from './useSettings';

/** Sub-options hang under a list-type option; a typed value or closed text has none (as in the mobile app). */
function canHoldChildren(option: OptionRow): boolean {
  if (option.is_input) return false;
  if (option.field_type_id != null) return OPTION_FIELD_TYPES.includes(option.field_type_id);
  return option.has_category;
}

function OptionRows({ nodes, depth, canEdit, fieldTypes, onEdit, onAddChild, onRemove, lastRoot }: {
  nodes: OptionNode[];
  depth: number;
  canEdit: boolean;
  fieldTypes: readonly FieldType[];
  onEdit: (option: OptionRow) => void;
  onAddChild: (parent: OptionRow) => void;
  onRemove: (node: OptionNode) => void;
  lastRoot: boolean;
}) {
  return (
    <>
      {nodes.map((node) => {
        const { option } = node;
        const isCategory = node.children.length > 0;
        // a choice keeps at least one option; a category must be emptied first
        const blocked = isCategory ? 'יש להסיר קודם את תתי האפשרויות' : lastRoot && depth === 0 ? 'שדה בחירה חייב לכלול לפחות אפשרות אחת' : '';
        const typed = option.field_type_id != null && option.field_type_id !== FIELD_TYPE_TEXT;
        return (
          <div key={option.id}>
            <div className={`st-opt${isCategory ? ' cat' : ''}`} style={{ '--depth': depth } as CSSProperties}>
              <span className="name">{option.name}</span>
              {option.is_input ? <Chip tone="acc">הזנת ערך</Chip> : null}
              {typed ? <Chip>{fieldTypeName(option.field_type_id!, fieldTypes)}</Chip> : null}
              {isCategory ? <Chip>{node.children.length} תתי-אפשרויות</Chip> : null}
              {canEdit ? (
                <span className="st-actions">
                  {canHoldChildren(option) ? (
                    <Button size="sm" icon="plus" aria-label={`הוספת תת-אפשרות ל${option.name}`} title="הוספת תת-אפשרות" onClick={() => onAddChild(option)} />
                  ) : null}
                  <Button size="sm" icon="edit" aria-label={`עריכת האפשרות ${option.name}`} onClick={() => onEdit(option)}>
                    עריכה
                  </Button>
                  <Button size="sm" variant="danger" icon="trash" aria-label={`הסרת האפשרות ${option.name}`} title={blocked || 'הסרה מהטופס'} disabled={Boolean(blocked)} onClick={() => onRemove(node)} />
                </span>
              ) : null}
            </div>
            {isCategory ? (
              <OptionRows nodes={node.children} depth={depth + 1} canEdit={canEdit} fieldTypes={fieldTypes} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} lastRoot={false} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/** Choice options at any depth (super admin only), as in the mobile app. A removed option bookings used is archived, otherwise deleted. */
export function OptionsTab({ unitId, bookingTypeId, settings }: { unitId: number; bookingTypeId: number; settings: Settings }) {
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const canEdit = settings.can_edit_global;
  const [target, setTarget] = useState<OptionTarget | null>(null);

  const fields = useMemo(() => choiceFields(settings.form_fields).sort((a, b) => a.position - b.position || a.id - b.id), [settings.form_fields]);
  const wanted = Number(search.get('field'));
  const current = fields.find((field) => field.id === wanted) ?? fields[0];

  const tree = useMemo(() => (current ? buildOptionTree(settings.options, current.id) : []), [settings.options, current]);

  const removal = useMutation({
    mutationFn: (option: OptionRow) => settingsApi.removeOption(option.form_field_id, option.id),
    onSuccess: async () => {
      toast('האפשרות הוסרה מהטופס. אם נבחרה בקריאות קיימות, היא נשמרת בהן.', 'ok');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) toast(shown.message, 'bad');
    },
  });

  if (!current) return <EmptyState title="אין שדות בחירה בטופס זה" />;

  const select = (id: number) => setParams({ field: String(id) });

  async function askRemove(node: OptionNode) {
    const ok = await confirm({
      title: 'הסרת אפשרות',
      body: `להסיר את "${node.option.name}"? אם היא נבחרה בקריאות קיימות היא תוסר מהטופס בלבד והערכים שנשמרו יישארו; אחרת היא תימחק. ההסרה תחול גם באפליקציה.`,
      confirmLabel: 'הסרה',
      tone: 'danger',
    });
    if (ok) removal.mutate(node.option);
  }

  // names already used at the level the dialog writes to
  const siblingsFor = ({ option, parent }: OptionTarget) => {
    const parentId = parent?.id ?? option?.parent_id ?? null;
    return settings.options.filter((other) => other.form_field_id === current.id && other.parent_id === parentId && other.id !== option?.id).map((other) => other.name);
  };

  return (
    <div className="st-opt-split">
      <nav className="st-opt-nav" aria-label="שדות בחירה">
        {fields.map((field) => (
          <button key={field.id} type="button" aria-current={field.id === current.id ? 'true' : undefined} onClick={() => select(field.id)}>
            <span className="path">{fieldPath(field, settings.form_fields)}</span>
            <span className="n">{countOptions(buildOptionTree(settings.options, field.id))}</span>
          </button>
        ))}
      </nav>
      <div className="st-opt-main">
        <div className="st-opt-head">
          <div className="st-opt-title">
            <h3>{fieldPath(current, settings.form_fields)}</h3>
            {canEdit ? (
              <Button size="sm" variant="primary" icon="plus" onClick={() => setTarget({ parent: null })}>
                הוספת אפשרות
              </Button>
            ) : null}
          </div>
          <span className="small muted">
            {canEdit ? 'לכל אפשרות יש סוג: בחירה, רשימה עם תתי-אפשרויות, או הזנת ערך. אפשרות שכבר נבחרה בקריאות מועברת לארכיון ולא נמחקת.' : 'עריכת אפשרויות בחירה שמורה למנהל מערכת.'}
          </span>
        </div>
        {tree.length ? (
          <OptionRows
            nodes={tree}
            depth={0}
            canEdit={canEdit}
            fieldTypes={settings.field_types}
            onEdit={(option) => setTarget({ option, parent: null })}
            onAddChild={(parent) => setTarget({ parent })}
            onRemove={(node) => void askRemove(node)}
            lastRoot={tree.length === 1}
          />
        ) : (
          <EmptyState title="אין אפשרויות בשדה זה" />
        )}
      </div>
      {target ? (
        <OptionDialog
          key={`${target.option?.id ?? 'new'}-${target.parent?.id ?? 'root'}`}
          unitId={unitId}
          bookingTypeId={bookingTypeId}
          settings={settings}
          field={current}
          target={target}
          siblings={siblingsFor(target)}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </div>
  );
}
