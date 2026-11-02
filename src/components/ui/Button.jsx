
import { Icon } from './Icon';





const VARIANT_CLASS = {
  default: '',
  primary: 'primary',
  danger: 'danger',
  'danger-solid': 'danger solid',
  hold: 'hold',
  ghost: 'ghost',
};

export function Button({ variant = 'default', size = 'md', icon, loading = false, className = '', disabled, type = 'button', children, ...rest }) {
  const classes = ['btn', VARIANT_CLASS[variant], size === 'sm' ? 'sm' : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {icon ? (
        loading ? <span className="spin" aria-hidden="true" /> : <Icon name={icon} />
      ) : (
        // always there, so the spinner can open its room smoothly instead of the button jumping wider
        <span className="spin-slot" aria-hidden="true">
          <span className="spin" />
        </span>
      )}
      {children}
    </button>
  );
}
