import type { ComponentProps } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'danger-solid' | 'hold' | 'ghost';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: IconName;
  loading?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: '',
  primary: 'primary',
  danger: 'danger',
  'danger-solid': 'danger solid',
  hold: 'hold',
  ghost: 'ghost',
};

export function Button({ variant = 'default', size = 'md', icon, loading = false, className = '', disabled, type = 'button', children, ...rest }: ButtonProps) {
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
