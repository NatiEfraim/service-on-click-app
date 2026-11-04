import { Icon } from './Icon';

/** The search box with its magnifier icon. */
export function SearchField({ onChange, width, className = '', ...input }) {
  return (
    <label className={['search', className].filter(Boolean).join(' ')} style={width ? { width } : undefined}>
      <Icon name="search" />
      <input type="search" {...input} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
