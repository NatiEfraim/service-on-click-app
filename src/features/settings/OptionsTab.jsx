'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SideNav } from '@/components/ui/SideNav';

import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { buildOptionTree, choiceFields, countOptions } from './options';
import { FieldOptionsEditor } from './FieldOptionsEditor';

/**
 * The choices of each field. `editable` (the system admin, on a website-only form - ביטחון מידע / תקשוב): add, rename
 * and remove choices at any depth (OptionDialog); a removed choice that requests already used is archived, not deleted.
 * Otherwise view only (the mobile app's forms, until mobile synchronization is available).
 */
export function OptionsTab({ unitId, bookingTypeId, settings, editable = false }) {
  const canEdit = editable && Boolean(settings.can_edit_global);
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

  if (!current) return <EmptyState title="אין שדות בחירה בטופס זה" />;

  const select = (id) => setParams({ field: String(id) });

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
        ) : (
          <FieldOptionsEditor key={shown.id} unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} field={shown} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}
