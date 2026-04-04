'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-full px-3 py-1 text-xs transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/20',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20',
        warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/50 hover:bg-yellow-500/20',
        danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20',
        violet: 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-500/20',
        fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/20',
        outline: 'border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400',
        secondary: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:border-zinc-500/50 hover:bg-zinc-500/20',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      animated: {
        true: 'hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/30',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      animated: true,
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      animated,
      icon,
      dot = false,
      children,
      ...props
    },
    ref
  ) => (
    <div
      className={badgeVariants({
        variant,
        size,
        animated,
        className,
      })}
      ref={ref}
      {...props}
    >
      {dot && (
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
