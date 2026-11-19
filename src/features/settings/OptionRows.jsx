'use client';

import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { OPTION_FIELD_TYPES } from '@/lib/labels';
import { fieldTypeName } from './fieldRules';
import { FIELD_TYPE_TEXT } from './constants';

/** Sub-options hang under a list-type option; a typed value or closed text has none (as in the mobile app). */
function canHoldChildren(option) {
  if (option.is_input) return false;
  if (option.field_type_id != null) return OPTION_FIELD_TYPES.includes(option.field_type_id);
  return option.has_category;
}

export function OptionRows({ nodes, depth, canEdit, fieldTypes, onEdit, onAddChild, onRemove, lastRoot, removingId = null }) {
  return (
    <>
      {nodes.map((node, index) => {
        const { option } = node;
        const isCategory = node.children.length > 0;
        // a choice keeps at least one option; a category must be emptied first
        const blocked = isCategory ? 'יש להסיר קודם את תתי האפשרויות' : lastRoot && depth === 0 ? 'שדה בחירה חייב לכלול לפחות אפשרות אחת' : '';
        const typed = option.field_type_id != null && option.field_type_id !== FIELD_TYPE_TEXT;
        return (
          <div key={option.id}>
            <div className={`st-opt${isCategory ? ' cat' : ''}${removingId === option.id ? ' leaving' : ''}`} style={{ '--depth': depth, '--i': Math.min(index, 12) }}>
              <span className="name"><AnimatedText>{option.name}</AnimatedText></span>
              {option.code ? <Chip tone="info" title="הקוד הקבוע של האפשרות"><span className="ltr">{option.code}</span></Chip> : null}
              {option.is_input ? <Chip tone="acc">הזנת ערך</Chip> : null}
              {typed ? <Chip>{fieldTypeName(option.field_type_id, fieldTypes)}</Chip> : null}
              {isCategory ? <Chip>{node.children.length} תתי-אפשרויות</Chip> : null}
              {canEdit ? (
                <span className="st-actions">
                  {canHoldChildren(option) ? (
                    <Button size="sm" icon="plus" aria-label={`הוספת תת-אפשרות ל${option.name}`} data-tip="הוספת תת-אפשרות" onClick={() => onAddChild(option)} />
                  ) : null}
                  <Button size="sm" icon="edit" data-tip="עריכה" aria-label={`עריכת האפשרות ${option.name}`} onClick={() => onEdit(option)} />
                  <Button size="sm" variant="danger" icon="trash" aria-label={`הסרת האפשרות ${option.name}`} data-tip={blocked || 'הסרה מהטופס'} disabled={Boolean(blocked)} onClick={() => onRemove(node)} />
                </span>
              ) : null}
            </div>
            {isCategory ? (
              <OptionRows nodes={node.children} depth={depth + 1} canEdit={canEdit} fieldTypes={fieldTypes} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} lastRoot={false} removingId={removingId} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
