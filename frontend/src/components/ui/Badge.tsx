import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-heading tracking-wide uppercase border',
  {
    variants: {
      variant: {
        critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        high:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
        medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        low:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        info:     'bg-primary/10 text-primary border-primary/20',
        accent:   'bg-accent/10 text-accent border-accent/20',
        neutral:  'bg-white/5 text-text-muted border-white/8',
        healthy:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        open:       'bg-rose-500/10 text-rose-400 border-rose-500/20',
        resolved:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        investigating: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        mitigated:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

const dotColors: Record<string, string> = {
  critical:      'bg-rose-400',
  high:          'bg-amber-400',
  medium:        'bg-yellow-400',
  low:           'bg-emerald-400',
  info:          'bg-primary',
  accent:        'bg-accent',
  neutral:       'bg-text-muted',
  healthy:       'bg-emerald-400',
  degraded:      'bg-amber-400',
  open:          'bg-rose-400',
  resolved:      'bg-emerald-400',
  investigating: 'bg-blue-400',
  mitigated:     'bg-amber-400',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant, dot = true, pulse = false, children, ...props }) => {
  const dotClass = dotColors[variant as string] ?? 'bg-text-muted';

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="relative flex items-center justify-center w-1.5 h-1.5 shrink-0">
          {pulse && (
            <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', dotClass)} />
          )}
          <span className={cn('relative inline-flex rounded-full w-1.5 h-1.5', dotClass)} />
        </span>
      )}
      {children}
    </span>
  );
};
