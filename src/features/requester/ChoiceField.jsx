'use client';

import { DatePicker } from '@/components/ui/DateRangePicker';
import { Select } from '@/components/ui/Select';
import { TimePicker } from '@/components/ui/TimePicker';
import { choicePath } from './requesterData';

/**
 * A choice field of the request form. Its value is the id of the chosen choice; a choice that is a list opens a second
 * dropdown for its sub-choices (to any depth), and a "type in a value" choice opens a box of its own type (number, text,
 * date…) for `typed`. Each part fades in as it appears (requester.css: .rq-choice-step).
 */
export function ChoiceField({ id, field, value, typed, onChange, onTyped, invalid }) {
  const path = choicePath(field.options, value);
  const chosen = path[path.length - 1] ?? null;
  // the dropdowns: the field's own, then one more under each chosen list
  const levels = [{ options: field.options, picked: path[0] ?? null }];
  path.forEach((node, index) => {
    if (node.children.length) levels.push({ options: node.children, picked: path[index + 1] ?? null, parent: node });
  });
  const boxProps = { id: `${id}-typed`, value: typed ?? '', 'aria-invalid': invalid || undefined, 'aria-label': chosen?.name };

  return (
    <div className="rq-choice">
      {levels.map((level, index) => (
        <div key={level.parent?.id ?? 'root'} className="rq-choice-step">
          <Select
            id={index === 0 ? id : `${id}-${index}`}
            aria-label={index === 0 ? undefined : `${level.parent.name}: בחירה`}
            aria-invalid={invalid || undefined}
            value={level.picked?.id ?? ''}
            // choosing at a level drops what was chosen below it; the typed value goes with the choice it belonged to
            onChange={(event) => {
              onChange(event.target.value || (level.parent ? String(level.parent.id) : ''));
              onTyped('');
            }}
          >
            <option value="">{index === 0 ? 'בחירה…' : 'בחירת תת-אפשרות…'}</option>
            {level.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </div>
      ))}
      {chosen?.isInput ? (
        <div key={`typed-${chosen.id}`} className="rq-choice-step">
          {chosen.inputType === 'date' ? (
            <DatePicker value={typed ?? ''} onChange={(day) => onTyped(day ?? '')} label={chosen.name} />
          ) : chosen.inputType === 'time' ? (
            <TimePicker value={typed ?? ''} onChange={(time) => onTyped(time ?? '')} label={chosen.name} invalid={invalid} />
          ) : (
            <input
              className="input"
              type={chosen.inputType}
              dir={chosen.ltr ? 'ltr' : undefined}
              placeholder={`${chosen.name}: הזנת ערך`}
              {...boxProps}
              onChange={(event) => onTyped(event.target.value)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
