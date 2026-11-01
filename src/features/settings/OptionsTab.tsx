'use client';

import { useMutation } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { settingsApi } from '@/lib/api/endpoints';
import type { FormField, OptionRow, Settings } from '@/lib/api/types';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { optionNameError } from './fieldRules';
import { buildOptionTree, choiceFields, countOptions, fieldPath, type OptionNode } from './options';
import { handleWriteError, useReloadSettings } from './useSettings';

/**
 * Rename one option. The server rewrites every attribute a save leaves out (see SaveOptionBody), so the option's own parent, category flag
 * and field type travel with the new name; its type is read first because the settings list does not carry it.
 */
function RenameDialog({ unitId, bookingTypeId, field, option, siblings, onClose }: { unitId: number; bookingTypeId: number; field: FormField; option: OptionRow; siblings: string[]; onClose: () => void }) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const [name, setName] = useState(option.name);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const group = (await settingsApi.optionSiblings(option.id)).siblings;
      const fieldTypeId = group.find((sibling) => sibling.option_id === option.id)?.field_type_id ?? null;
      return settingsApi.saveOption(field.id, {
        option_id: option.id,
        option_name: name.trim(),
        parent_option_id: option.parent_id,
        has_category: option.has_category,
        ...(fieldTypeId !== null ? { field_type_id: fieldTypeId } : {}),
        is_input: false,
      });
    },
    onSuccess: async () => {
      toast('שם האפשרות עודכן.', 'ok');
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
    const found = name.trim() === option.name ? 'לא בוצע שינוי.' : optionNameError(name, siblings);
    setProblem(found ?? '');
    if (found) return;
    setError('');
    mutation.mutate();
  }

  return (
    <Modal
      title="שינוי שם אפשרות"
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button variant="primary" loading={mutation.isPending} onClick={submit}>
            שמירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <label className="field">
        <span>
          שם חדש לאפשרות בשדה &quot;{field.field_display_name}&quot;
        </span>
        <input
          className="input"
          maxLength={50}
          value={name}
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

function OptionRows({ nodes, depth, canEdit, onRename, onRemove, lastRoot }: { nodes: OptionNode[]; depth: number; canEdit: boolean; onRename: (option: OptionRow) => void; onRemove: (node: OptionNode) => void; lastRoot: boolean }) {
  return (
    <>
      {nodes.map((node) => {
        const { option } = node;
        const isCategory = node.children.length > 0;
        // a choice must keep at least one option; a category must lose its options first (the database would move them to the top)
        const blocked = isCategory ? 'יש להסיר קודם את האפשרויות שבתוך הקטגוריה' : lastRoot && depth === 0 ? 'שדה בחירה חייב לכלול לפחות אפשרות אחת' : '';
        return (
          <div key={option.id}>
            <div className={`st-opt${isCategory ? ' cat' : ''}`} style={{ '--depth': depth } as CSSProperties}>
              <span className="name">{option.name}</span>
              {isCategory ? <Chip>קטגוריה · {node.children.length}</Chip> : null}
              {canEdit ? (
                <span className="st-actions">
                  <Button size="sm" icon="edit" aria-label={`שינוי שם האפשרות ${option.name}`} onClick={() => onRename(option)}>
                    שינוי שם
                  </Button>
                  <Button size="sm" variant="danger" icon="trash" aria-label={`הסרת האפשרות ${option.name}`} title={blocked || 'הסרה מהטופס'} disabled={Boolean(blocked)} onClick={() => onRemove(node)} />
                </span>
              ) : null}
            </div>
            {isCategory ? <OptionRows nodes={node.children} depth={depth + 1} canEdit={canEdit} onRename={onRename} onRemove={onRemove} lastRoot={false} /> : null}
          </div>
        );
      })}
    </>
  );
}

function AddOption({ unitId, bookingTypeId, field, tree, options }: { unitId: number; bookingTypeId: number; field: FormField; tree: OptionNode[]; options: readonly OptionRow[] }) {
  const toast = useToast();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const ids = useId();
  const categories = tree.filter((node) => node.option.has_category);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [problem, setProblem] = useState('');

  const parentId = parent === '' ? null : Number(parent);
  const siblings = options.filter((option) => option.form_field_id === field.id && option.parent_id === parentId).map((option) => option.name);

  const mutation = useMutation({
    // a new option is a plain choice: not a category, not a free-input one (an omitted is_input would turn it into one in some booking types)
    mutationFn: () => settingsApi.saveOption(field.id, { option_name: name.trim(), parent_option_id: parentId, has_category: false, is_input: false }),
    onSuccess: async () => {
      toast('האפשרות נוספה.', 'ok');
      setName('');
      await reload();
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setProblem(shown.message);
    },
  });

  function submit() {
    const found = optionNameError(name, siblings);
    setProblem(found ?? '');
    if (!found) mutation.mutate();
  }

  return (
    <div className="st-opt-add">
      <div className="st-add-row">
        <label className="field">
          <span>אפשרות חדשה</span>
          <input
            className="input"
            maxLength={50}
            value={name}
            aria-invalid={problem ? true : undefined}
            aria-describedby={`${ids}-err`}
            style={{ width: 240 }}
            onChange={(event) => {
              setName(event.target.value);
              setProblem('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
          />
        </label>
        {categories.length ? (
          <label className="field">
            <span>מיקום</span>
            <select className="input" value={parent} onChange={(event) => setParent(event.target.value)}>
              <option value="">ברמה העליונה</option>
              {categories.map((node) => (
                <option key={node.option.id} value={node.option.id}>
                  בתוך {node.option.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button icon="plus" loading={mutation.isPending} onClick={submit}>
          הוספה
        </Button>
      </div>
      <div id={`${ids}-err`} className="err" aria-live="polite">
        {problem}
      </div>
    </div>
  );
}

/**
 * "אפשרויות בחירה": the options of the select / radio / checkbox / multi-select fields. Added, renamed and removed one at a time (the super
 * admin only); an option that bookings chose is archived by the server when removed, any other is deleted.
 */
export function OptionsTab({ unitId, bookingTypeId, settings }: { unitId: number; bookingTypeId: number; settings: Settings }) {
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const canEdit = settings.can_edit_global;
  const [renaming, setRenaming] = useState<OptionRow | null>(null);

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

  function select(id: number) {
    const next = new URLSearchParams(search.toString());
    next.set('field', String(id));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  async function askRemove(node: OptionNode) {
    const ok = await confirm({
      title: 'הסרת אפשרות',
      body: `להסיר את "${node.option.name}"? אם היא נבחרה בקריאות קיימות היא תוסר מהטופס בלבד והערכים שנשמרו יישארו; אחרת היא תימחק. ההסרה תחול גם באפליקציה.`,
      confirmLabel: 'הסרה',
      tone: 'danger',
    });
    if (ok) removal.mutate(node.option);
  }

  const siblingsOf = (option: OptionRow) => settings.options.filter((other) => other.form_field_id === option.form_field_id && other.parent_id === option.parent_id && other.id !== option.id).map((other) => other.name);

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
          <h3>{fieldPath(current, settings.form_fields)}</h3>
          <span className="small muted">
            {canEdit ? 'אפשרות שכבר נבחרה בקריאות מועברת לארכיון ולא נמחקת. כל שינוי נשלח גם לאפליקציה.' : 'עריכת אפשרויות בחירה שמורה למנהל מערכת.'}
          </span>
        </div>
        {canEdit ? <AddOption key={current.id} unitId={unitId} bookingTypeId={bookingTypeId} field={current} tree={tree} options={settings.options} /> : null}
        {tree.length ? (
          <OptionRows nodes={tree} depth={0} canEdit={canEdit} onRename={setRenaming} onRemove={(node) => void askRemove(node)} lastRoot={tree.length === 1} />
        ) : (
          <EmptyState title="אין אפשרויות בשדה זה" />
        )}
      </div>
      {renaming ? (
        <RenameDialog unitId={unitId} bookingTypeId={bookingTypeId} field={current} option={renaming} siblings={siblingsOf(renaming)} onClose={() => setRenaming(null)} />
      ) : null}
    </div>
  );
}
