import { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'bull' | 'bear' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', children, className = '', style, ...rest }: BadgeProps) {
  const variantClass = `badge-${variant}`;
  return (
    <span className={`badge ${variantClass} ${className}`} style={style} {...rest}>
      {children}
    </span>
  );
}
