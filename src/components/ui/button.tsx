'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: `
          bg-gradient-to-r from-cyan-500 to-violet-500 text-white
          hover:from-cyan-400 hover:to-violet-400 
          active:scale-95
          shadow-lg shadow-cyan-500/30
          hover:shadow-cyan-500/50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        `,
        secondary: `
          border border-zinc-700 text-white
          hover:border-cyan-500/50 hover:bg-cyan-500/10
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        `,
        ghost: `
          text-zinc-400
          hover:text-cyan-400 hover:bg-zinc-900/50
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        `,
        danger: `
          border border-red-500/50 text-red-400
          hover:bg-red-500/10 hover:border-red-500
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        `,
        gradient: `
          bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-white
          hover:shadow-lg hover:shadow-fuchsia-500/50
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        `,
      },
      size: {
        xs: 'px-3 py-1.5 text-xs',
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
        xl: 'px-10 py-5 text-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      animated: {
        true: 'hover:translate-y-[-2px]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      animated: true,
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      animated,
      loading = false,
      loadingText = 'Cargando...',
      children,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const buttonClass = buttonVariants({
      variant,
      size,
      fullWidth,
      animated,
      className,
    });

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: `${buttonClass} ${children.props.className || ''}`,
        ref,
      });
    }

    return (
      <button
        className={buttonClass}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {loading ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
