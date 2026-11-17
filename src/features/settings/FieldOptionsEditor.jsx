'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { OptionDialog } from './OptionDialog';
import { buildOptionTree } from './options';
import { OptionRows } from './OptionRows';
import { handleWriteError, useReloadSettings } from './useSettings';

/**
 * One choice field's options, at any depth. With `canEdit`: add a choice, add a sub-choice under a list-type one, rename
 * and remove (OptionDialog; a removed choice that requests already used is archived, not deleted). Used by the options
 * tab and by the field's own dialog in the form editor, so the choices are edited the same way in both.
 */
export function FieldOptionsEditor({ unitId, bookingTypeId, settings, field, canEdit = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  // the option the dialog adds / edits: { option?, parent? }
  const [target, setTarget] = useState(null);
  const tree = useMemo(() => buildOptionTree(settings.options ?? [], field.id), [settings.options, field.id]);

  const removal = useMutation({
    mutationFn: (option) => settingsApi.removeOption(option.form_field_id, option.id),
    onSuccess: async () => {
      toast('האפשרות הוסרה מהטופס. אם נבחרה בקריאות קיימות, היא נשמרת בהן.', 'ok');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) toast(shown.message, 'bad');
    },
  });

  async function askRemove(node) {
    const ok = await confirm({
      title: 'הסרת אפשרות',
      body: `להסיר את "${node.option.name}"? אם היא נבחרה בקריאות קיימות היא תוסר מהטופס בלבד והערכים שנשמרו יישארו; אחרת היא תימחק.`,
      confirmLabel: 'הסרה',
      tone: 'danger',
    });
    if (ok) removal.mutate(node.option);
  }

  // names already used at the level the dialog writes to
  const siblingsFor = ({ option, parent }) => {
    const parentId = parent?.id ?? option?.parent_id ?? null;
    return (settings.options ?? []).filter((other) => other.form_field_id === field.id && other.parent_id === parentId && other.id !== option?.id).map((other) => other.name);
  };

  return (
    <div className="st-field-options">
      {canEdit ? (
        <div className="st-field-options-bar">
          <Button size="sm" variant="primary" icon="plus" onClick={() => setTarget({ parent: null })}>
            הוספת אפשרות
          </Button>
        </div>
      ) : null}
      {/* only the list scrolls (in the field dialog); the add button above it stays put */}
      <div className="st-field-options-list">
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
          removingId={removal.isPending ? removal.variables?.id ?? null : null}
        />
      ) : (
        <EmptyState title="אין אפשרויות בשדה זה">{canEdit ? 'הוסיפו אפשרות ראשונה.' : null}</EmptyState>
      )}
      </div>
      {target ? (
        <OptionDialog
          key={`${target.option?.id ?? 'new'}-${target.parent?.id ?? 'root'}`}
          unitId={unitId}
          bookingTypeId={bookingTypeId}
          settings={settings}
          field={field}
          target={target}
          siblings={siblingsFor(target)}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </div>
  );
}
