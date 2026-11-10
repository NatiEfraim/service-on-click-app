'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SideNav } from '@/components/ui/SideNav';
import { settingsApi } from '@/lib/api/endpoints';
import { useSaveMutation } from '@/lib/useSaveMutation';

import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useConfirm } from '@/providers/UiProvider';
import { OptionDialog } from './OptionDialog';
import { buildOptionTree, choiceFields, countOptions } from './options';
import { useReloadSettings } from './useSettings';
import { OptionRows } from './OptionRows';

/** Choice options at any depth (super admin only), as in the mobile app. A removed option bookings used is archived, otherwise deleted. */
export function OptionsTab({ unitId, bookingTypeId, settings }) {
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const canEdit = settings.can_edit_global;
  const [target, setTarget] = useState(null);

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

  const removal = useSaveMutation({
    mutationFn: (option) => settingsApi.removeOption(option.form_field_id, option.id),
    success: 'האפשרות הוסרה מהטופס. אם נבחרה בקריאות קיימות, היא נשמרת בהן.',
    reload,
  });

  if (!current) return <EmptyState title="אין שדות בחירה בטופס זה" />;

  const select = (id) => setParams({ field: String(id) });
  const shownSubs = subFields(shown.id);
  const countLabel = (field) => {
    const subs = subFields(field.id).length;
    return subs ? `${subs} שדות` : countOptions(buildOptionTree(settings.options, field.id));
  };

  async function askRemove(node) {
    const ok = await confirm({
      title: 'הסרת אפשרות',
      body: `להסיר את "${node.option.name}"? אם היא נבחרה בקריאות קיימות היא תוסר מהטופס בלבד והערכים שנשמרו יישארו; אחרת היא תימחק. ההסרה תחול גם באפליקציה.`,
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
            {shownSubs.length ? 'בחרו שדה כדי לערוך את אפשרויות הבחירה שלו.' : canEdit ? 'לכל אפשרות יש סוג: בחירה, רשימה עם תתי-אפשרויות, או הזנת ערך. אפשרות שכבר נבחרה בקריאות מועברת לארכיון ולא נמחקת.' : 'עריכת אפשרויות בחירה שמורה למנהל מערכת.'}
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
