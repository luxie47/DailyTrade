import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'bull' | 'bear' | 'ghost' | 'primary' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    children,
    className = '',
    style,
    disabled,
    ...rest
  },
  ref
) {
  const variantClass = `btn-${variant}`;
  const sizeStyles = {
    sm: { padding: '4px 8px', fontSize: '11px' },
    md: { padding: '8px 14px', fontSize: '13px' },
    lg: { padding: '12px 20px', fontSize: '14px', fontWeight: 700 },
  }[size];

  return (
    <button
      ref={ref}
      className={`btn ${variantClass} ${className}`}
      style={{ ...sizeStyles, ...style }}
      disabled={disabled}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
});
