import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';

import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { SECTION_LABELS } from '@/lib/routeTypes';
import { PREVIEW_MAX_CHIPS } from './constants';


function Control({ node, options }) {
  const type = node.field.field_type_id;
  const own = options.filter((option) => option.form_field_id === node.field.id && option.parent_id === null);

  if (OPTION_FIELD_TYPES.includes(type)) {
    if (type === 5) {
      return (
        <Select className="input" disabled>
          <option>{own[0]?.name ?? 'בחירה'}</option>
        </Select>
      );
    }
    const shown = own.slice(0, PREVIEW_MAX_CHIPS);
    return (
      <div className="opts">
        {shown.map((option) => (
          <span key={option.id} className="chip">
            {type === 14 || type === 20 ? '☐ ' : '○ '}
            {option.name}
          </span>
        ))}
        {own.length > PREVIEW_MAX_CHIPS ? <span className="st-pv-more">ועוד {own.length - PREVIEW_MAX_CHIPS}</span> : null}
      </div>
    );
  }
  if (type === 6 || type === 7) return <textarea className="input" disabled rows={2} />;
  if (type === 13 || type === 23) {
    return (
      <span className="st-pv-box">
        <Icon name={type === 23 ? 'image' : 'file'} />
        {type === 23 ? 'צירוף תמונה' : 'צירוף קובץ'}
      </span>
    );
  }
  if (type === 21) return <input className="input" type="date" disabled />;
  const inputType = type === 1 || type === 22 ? 'number' : type === 3 ? 'date' : type === 4 ? 'time' : type === 9 ? 'email' : type === 10 ? 'tel' : type === 11 ? 'url' : 'text';
  return <input className="input" type={inputType} disabled />;
}

function PreviewField({ node, options, span }) {
  return (
    <div className="st-pv-field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label className="field">
        <span>
          {node.field.field_display_name}
          {node.field.is_required ? (
            <>
              {' '}
              <span className="req" aria-hidden="true">
                *
              </span>
              <span className="sr"> (חובה)</span>
            </>
          ) : null}
        </span>
        <Control node={node} options={options} />
      </label>
      {node.children.length ? (
        <div className="st-pv-group">
          <span className="st-pv-note">מופיע בהמשך ל&quot;{node.field.field_display_name}&quot;</span>
          {node.children.map((child) => (
            <PreviewField key={child.field.id} node={child} options={options} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Preview of the form as the requester sees it; nested fields are indented under their parent. A form designed on a
 * 4-column grid (a route form, lib/routeTypes: a field wider than a quarter of the row, or a section the handlers
 * fill) is drawn on that grid, its two sections under their names.
 */
export function FormPreview({ roots, options, sections = [] }) {
  const routeForm = roots.some((node) => node.field.section === 'handler' || Number(node.field.col_span) > 1);
  const label = (id) => sections.find((section) => section.id === id)?.label ?? SECTION_LABELS[id] ?? id;
  const groups = routeForm
    ? ['requester', 'handler'].map((id) => ({ id, label: label(id), nodes: roots.filter((node) => (node.field.section ?? 'requester') === id) })).filter((group) => group.nodes.length)
    : [{ id: 'all', label: null, nodes: roots }];

  return (
    <div className="st-form-preview">
      <h3 id="st-preview-title">כך הטופס ייראה למבקש</h3>
      {groups.map((group) => (
        <div key={group.id} className="st-pv-section">
          {group.label ? (
            <h4 className="st-pv-section-title">
              {group.label}
              {group.id === 'handler' ? <span className="small muted"> · ממולא במהלך הטיפול, לא בהגשה</span> : null}
            </h4>
          ) : null}
          <div className="preview-form" role="group" aria-labelledby="st-preview-title" style={routeForm ? { '--pv-cols': 4 } : undefined}>
            {group.nodes.map((node) => (
              <PreviewField key={node.field.id} node={node} options={options} span={routeForm ? Math.min(Math.max(Number(node.field.col_span) || 1, 1), 4) : 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
