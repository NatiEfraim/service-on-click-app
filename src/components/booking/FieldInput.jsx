'use client';

import { DatePicker } from '@/components/ui/DateRangePicker';
import { Select } from '@/components/ui/Select';
import { TimePicker } from '@/components/ui/TimePicker';
import { fieldKind } from '@/lib/form-fields';

/**
 * One form field's input, by its server type, the same wherever a field is written outside the request form (the
 * handler section of a route request, a move's dialog): a date opens the app's calendar (value `YYYY-MM-DD`), a time the
 * app's time picker (`HH:MM`), a long text a text area, a choice a Select of `options` ([{ id, name }], the value is the
 * option id), anything else a plain input (phones, e-mails and numbers read left to right).
 */
export function FieldInput({ id, typeName, value, onChange, label, invalid = false, required = false, disabled = false, min, options = [] }) {
  const { kind, inputType, ltr } = fieldKind(typeName);
  const common = { id, 'aria-label': label, 'aria-invalid': invalid || undefined, 'aria-required': required || undefined, disabled };

  if (inputType === 'date') return <DatePicker value={value ?? ''} onChange={(day) => onChange(day ?? '')} label={label} min={min} />;
  if (inputType === 'time') return <TimePicker value={value ?? ''} onChange={(time) => onChange(time ?? '')} label={label} invalid={invalid} disabled={disabled} />;
  if (kind === 'select') {
    return (
      <Select {...common} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">בחירה…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </Select>
    );
  }
  if (kind === 'textarea') return <textarea {...common} className="input" rows={3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
  return <input {...common} className="input" type={inputType} dir={ltr ? 'ltr' : undefined} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}
