'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { toApiError } from '@/lib/api/client';
import { settingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { FormField, Settings } from '@/lib/api/types';
import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { fieldTypeName } from './fieldRules';
import { FieldDialog } from './FieldDialog';
import { applyOrder, buildFieldTree, flattenNode, isCompleteOrder, moveItem, type FieldNode } from './fieldTree';
import { FormPreview } from './FormPreview';
import { handleWriteError, useReloadSettings } from './useSettings';

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: 'כדי להזיז שדה: לחצו על רווח או Enter להרמה, השתמשו בחצים למעלה ולמטה להזזה, ולחצו שוב על רווח או Enter להצבה. Escape מבטל.',
};

/** The field is only dragged up and down. */
const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface RowActions {
  onEdit: (field: FormField) => void;
  onRemove: (field: FormField) => void;
}

function FieldRow({
  node,
  settings,
  ordinal,
  canEdit,
  actions,
  handle,
}: {
  node: FieldNode;
  settings: Settings;
  ordinal?: number;
  canEdit: boolean;
  actions: RowActions;
  handle?: ReactNode;
}) {
  const { field } = node;
  const choiceCount = OPTION_FIELD_TYPES.includes(field.field_type_id) ? settings.options.filter((option) => option.form_field_id === field.id).length : null;
  const style = node.depth > 1 ? ({ paddingInlineStart: 46 + (node.depth - 1) * 24 } as CSSProperties) : undefined;

  return (
    <div className={`frow${node.depth > 0 ? ' child' : ''}`} style={style}>
      {handle ?? <span className="st-empty-cell" />}
      <span className="st-ord" aria-hidden={ordinal ? undefined : true}>
        {ordinal ?? ''}
      </span>
      <div>
        <div className="t1">
          <span className="st-name">{field.field_display_name}</span>
          {field.is_required ? <Chip>חובה</Chip> : null}
          {field.editable ? <Chip tone="acc">מאשר יכול לעדכן</Chip> : null}
          {field.is_custom ? <Chip tone="info">נוסף כאן</Chip> : null}
        </div>
        <div className="t2">
          {fieldTypeName(field.field_type_id, settings.field_types)}
          {choiceCount !== null ? ` · ${choiceCount} אפשרויות` : ''}
          {field.used_by > 0 ? ` · מופיע ב-${field.used_by} קריאות` : ''}
          {node.depth > 0 ? ' · חלק משדה אחר' : ''}
        </div>
      </div>
      {canEdit ? (
        <div className="st-actions">
          <Button size="sm" icon="edit" aria-label={`עריכת ${field.field_display_name}`} onClick={() => actions.onEdit(field)}>
            עריכה
          </Button>
          {field.can_remove ? (
            <Button size="sm" variant="danger" icon="trash" aria-label={`הסרת ${field.field_display_name}`} title="הסרה מהטופס" onClick={() => actions.onRemove(field)} />
          ) : null}
        </div>
      ) : (
        <span className="st-empty-cell" />
      )}
    </div>
  );
}

function SortableGroup({ node, ordinal, settings, actions, disabled }: { node: FieldNode; ordinal: number; settings: Settings; actions: RowActions; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: node.field.id,
    disabled,
    attributes: { roleDescription: 'שדה בטופס שניתן להזיז' },
  });
  const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
  const rows = flattenNode(node);

  return (
    <div ref={setNodeRef} style={style} className={`st-item${isDragging ? ' dragging' : ''}`}>
      {rows.map((row, index) => (
        <FieldRow
          key={row.field.id}
          node={row}
          settings={settings}
          ordinal={index === 0 ? ordinal : undefined}
          canEdit
          actions={actions}
          handle={
            index === 0 ? (
              <button
                type="button"
                ref={setActivatorNodeRef}
                className="grip"
                aria-label={`הזזת השדה ${node.field.field_display_name}`}
                disabled={disabled}
                {...attributes}
                {...listeners}
              >
                <Icon name="grip" />
              </button>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}

/** Form structure with preview; editing needs `can_edit_global`, only top-level fields drag. */
export function FormTab({ unitId, bookingTypeId, settings }: { unitId: number; bookingTypeId: number; settings: Settings }) {
  const client = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const { me } = useSession();
  const canEdit = me.is_super_admin && settings.can_edit_global;
  const [editing, setEditing] = useState<FormField | 'new' | null>(null);

  const { roots, orphans } = useMemo(() => buildFieldTree(settings.form_fields), [settings.form_fields]);
  const ids = useMemo(() => roots.map((node) => node.field.id), [roots]);
  const total = settings.form_fields.length;
  const queryKey = keys.settings(unitId, bookingTypeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: string | number) => settings.form_fields.find((field) => field.id === Number(id))?.field_display_name ?? '';
  const placeOf = (id: string | number) => ids.indexOf(Number(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `הרמתם את השדה ${nameOf(active.id)}. מקום נוכחי: ${placeOf(active.id)} מתוך ${ids.length}.`,
    onDragOver: ({ active, over }) => (over ? `השדה ${nameOf(active.id)} נמצא מעל המקום ${placeOf(over.id)} מתוך ${ids.length}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `השדה ${nameOf(active.id)} הוצב במקום ${placeOf(over.id)} מתוך ${ids.length}.` : `השדה ${nameOf(active.id)} חזר למקומו.`),
    onDragCancel: ({ active }) => `הגרירה בוטלה. השדה ${nameOf(active.id)} חזר למקומו.`,
  };

  const reorder = useMutation({
    mutationFn: (orderedIds: number[]) => settingsApi.reorderFields(unitId, bookingTypeId, orderedIds),
    onMutate: async (orderedIds) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<Settings>(queryKey);
      client.setQueryData<Settings>(queryKey, (old) => (old ? { ...old, form_fields: applyOrder(old.form_fields, orderedIds) } : old));
      return { previous };
    },
    onSuccess: () => toast('סדר השדות נשמר.', 'ok'),
    onError: async (e, _ids, context) => {
      // roll back the optimistic order (409: the form changed)
      if (context?.previous) client.setQueryData(queryKey, context.previous);
      const apiError = toApiError(e);
      if (apiError.stale || apiError.denied) await handleWriteError(e, toast, reload);
      else toast(apiError.message, 'bad');
    },
    onSettled: () => reload(),
  });

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = moveItem(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id)));
    if (next.join() === ids.join() || !isCompleteOrder(settings.form_fields, next)) return;
    reorder.mutate(next);
  }

  const removal = useMutation({
    mutationFn: (field: FormField) => settingsApi.removeField(field.id, field.version),
    onSuccess: async (result) => {
      toast(result.data?.mode === 'archive' ? 'השדה הוסר מהטופס. הערכים שנשמרו בקריאות קיימות נשמרו.' : 'השדה נמחק.', 'ok');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) toast(shown.message, 'bad');
    },
  });

  async function askRemove(field: FormField) {
    const used = field.used_by > 0;
    const ok = await confirm({
      title: `הסרת השדה "${field.field_display_name}"`,
      body: (
        <>
          <p style={{ margin: 0 }}>
            {used
              ? `השדה מופיע ב-${field.used_by} קריאות קיימות. הוא יוסר מהטופס, והערכים שכבר נשמרו בקריאות יישארו כפי שהם.`
              : 'השדה לא בשימוש באף קריאה ויימחק מהטופס.'}
          </p>
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            ההסרה תחול גם בטופס באפליקציה.
          </p>
        </>
      ),
      confirmLabel: 'הסרה',
      tone: 'danger',
    });
    if (ok) removal.mutate(field);
  }

  const actions: RowActions = { onEdit: setEditing, onRemove: (field) => void askRemove(field) };

  return (
    <div className="st-form">
      <div className="st-form-list">
        <div className="toolbar">
          <b>{total} שדות בטופס</b>
          <span className="grow" />
          {canEdit ? (
            <Button size="sm" variant="primary" icon="plus" onClick={() => setEditing('new')}>
              הוספת שדה
            </Button>
          ) : (
            <span className="small muted">עריכת מבנה הטופס שמורה למנהל מערכת</span>
          )}
        </div>

        {total === 0 ? (
          <EmptyState title="אין שדות בטופס" />
        ) : canEdit ? (
          <DndContext
            id={`form-fields-${unitId}-${bookingTypeId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVertical]}
            accessibility={{ announcements, screenReaderInstructions: INSTRUCTIONS }}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="fields st-fields">
                {roots.map((node, index) => (
                  <SortableGroup key={node.field.id} node={node} ordinal={index + 1} settings={settings} actions={actions} disabled={reorder.isPending} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="fields st-fields">
            {roots.map((node, index) => (
              <div key={node.field.id} className="st-item">
                {flattenNode(node).map((row, rowIndex) => (
                  <FieldRow key={row.field.id} node={row} settings={settings} ordinal={rowIndex === 0 ? index + 1 : undefined} canEdit={false} actions={actions} />
                ))}
              </div>
            ))}
          </div>
        )}
        {orphans.length ? (
          <div className="fields st-fields">
            {orphans.map((field) => (
              <FieldRow key={field.id} node={{ field, depth: 1, children: [] }} settings={settings} canEdit={false} actions={actions} />
            ))}
          </div>
        ) : null}
        {canEdit && total > 1 ? <div className="st-fields-end">אפשר לגרור שדה בעזרת הידית, או להזיז אותה במקלדת: רווח להרמה, חצים להזזה, רווח להצבה.</div> : null}
      </div>

      <FormPreview roots={roots} options={settings.options} />

      {editing ? <FieldDialog unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} field={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
