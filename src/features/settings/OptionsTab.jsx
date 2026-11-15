'use client';

import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SideNav } from '@/components/ui/SideNav';

import { settingsApi } from '@/lib/api/endpoints';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { OptionDialog } from './OptionDialog';
import { buildOptionTree, choiceFields, countOptions } from './options';
import { OptionRows } from './OptionRows';
import { handleWriteError, useReloadSettings } from './useSettings';

/**
 * The choices of each field. `editable` (the system admin, on a website-only form - ביטחון מידע / תקשוב): add, rename
 * and remove choices at any depth (OptionDialog); a removed choice that requests already used is archived, not deleted.
 * Otherwise view only (the mobile app's forms, until mobile synchronization is available).
 */
export function OptionsTab({ unitId, bookingTypeId, settings, editable = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const canEdit = editable && Boolean(settings.can_edit_global);
  // the option the dialog adds / edits: { option?, parent? }
  const [target, setTarget] = useState(null);
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
  const search = useSearchParams();
  const setParams = useSetSearchParams();

  const fields = useMemo(() => choiceFields(settings.form_fields).sort((a, b) => a.position - b.position || a.id - b.id), [settings.form_fields]);
  const wanted = Number(search.get('field'));
  // as in the mobile app: the side list holds the top-level fields; a field with sub-fields opens them, a field without opens its options
  const roots = useMemo(() => fields.filter((field) => !fields.some((other) => other.id === field.parent_id)), [fields]);
  const subFields = (id) => fields.filter((field) => field.parent_id === id);
  const current = fields.find((field) => field.id === wanted) ?? roots[0];
  const trail = (field) => {
    const chain = [];
    for (let node = field; node; node = fields.find((other) => other.id === node.parent_id)) chain.unshift(node);
    return chain;
  };
  const rootId = current ? trail(current)[0].id : null;

  // The panel keeps showing the previous field while it fades out, then swaps and fades in.
  const [shownId, setShownId] = useState(current?.id);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!current || current.id === shownId) return undefined;
    setLeaving(true);
    const timer = setTimeout(() => {
      setShownId(current.id);
      setLeaving(false);
    }, 140);
    return () => clearTimeout(timer);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = fields.find((field) => field.id === shownId) ?? current;

  const tree = useMemo(() => (shown ? buildOptionTree(settings.options, shown.id) : []), [settings.options, shown]);

  if (!current) return <EmptyState title="אין שדות בחירה בטופס זה" />;

  const select = (id) => setParams({ field: String(id) });

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
    return settings.options.filter((other) => other.form_field_id === shown.id && other.parent_id === parentId && other.id !== option?.id).map((other) => other.name);
  };
  const shownSubs = subFields(shown.id);
  const countLabel = (field) => {
    const subs = subFields(field.id).length;
    return subs ? `${subs} שדות` : countOptions(buildOptionTree(settings.options, field.id));
  };

  return (
    <div className="st-opt-split">
      <SideNav
        className="st-opt-nav"
        label="שדות בחירה"
        items={roots.map((field) => ({ id: field.id, label: field.field_display_name, meta: countLabel(field) }))}
        currentId={rootId}
        onSelect={select}
      />
      <div key={shown.id} className={`st-opt-main st-opt-fade${leaving ? ' out' : ''}`}>
        <div className="st-opt-head">
          <div className="st-opt-title">
            <h3 className="st-crumbs">
              {trail(shown).map((node, index, chain) =>
                index < chain.length - 1 ? (
                  <span key={node.id}>
                    <button type="button" className="st-crumb" onClick={() => select(node.id)}>{node.field_display_name}</button>
                    <span className="sep" aria-hidden>›</span>
                  </span>
                ) : (
                  <span key={node.id}>{node.field_display_name}</span>
                ),
              )}
            </h3>
            {canEdit && !shownSubs.length ? (
              <Button size="sm" variant="primary" icon="plus" onClick={() => setTarget({ parent: null })}>
                הוספת אפשרות
              </Button>
            ) : null}
          </div>
          <span className="small muted">
            {shownSubs.length ? 'בחרו שדה כדי לצפות באפשרויות הבחירה שלו.' : canEdit ? 'אפשר להוסיף, לשנות שם ולהסיר אפשרויות. אפשרות שכבר נבחרה בקריאות מועברת לארכיון ולא נמחקת.' : 'אפשרויות הבחירה בשדה זה מוצגות לצפייה.'}
          </span>
        </div>
        {shownSubs.length ? (
          <div className="st-subs">
            {shownSubs.map((field) => (
              <button key={field.id} type="button" onClick={() => select(field.id)}>
                <span className="name">{field.field_display_name}</span>
                <span className="n">{countLabel(field)}</span>
                <Icon name="left" />
              </button>
            ))}
          </div>
        ) : tree.length ? (
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
          field={shown}
          target={target}
          siblings={siblingsFor(target)}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </div>
  );
}
