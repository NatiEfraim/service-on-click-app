import type { InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void;
  /** Width of the box in px. */
  width?: number;
}

/** The search box with its magnifier icon. */
export function SearchField({ onChange, width, className = '', ...input }: SearchFieldProps) {
  return (
    <label className={['search', className].filter(Boolean).join(' ')} style={width ? { width } : undefined}>
      <Icon name="search" />
      <input type="search" {...input} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
