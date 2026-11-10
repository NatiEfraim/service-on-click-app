
import { Icon } from './Icon';





const VARIANT_CLASS = {
  default: '',
  primary: 'primary',
  danger: 'danger',
  'danger-solid': 'danger solid',
  hold: 'hold',
  ghost: 'ghost',
};

export function Button({ variant = 'default', size = 'md', icon, loading = false, className = '', disabled, type = 'button', children, 'data-tip': tip, ...rest }) {
  const classes = ['btn', VARIANT_CLASS[variant], size === 'sm' ? 'sm' : '', className].filter(Boolean).join(' ');
  const button = (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} data-tip={disabled ? undefined : tip} {...rest}>
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
  // a disabled button gets no pointer events, so its hint (often: why it is disabled) sits on a thin wrapper
  // (only when disabled, not while loading: swapping the wrapper in would drop the keyboard focus mid-action)
  return disabled && tip ? (
    <span className="btn-tip" data-tip={tip}>
      {button}
    </span>
  ) : (
    button
  );
}
