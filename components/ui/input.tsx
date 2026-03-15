import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, type = 'text', ...props }, ref) => {
    const baseStyles =
      'flex h-12 w-full rounded-xl border bg-neutral-900 px-4 py-3 text-base text-white placeholder:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-black transition-colors';
    
    const defaultBorder = 'border-neutral-700 focus-visible:ring-neutral-400 focus-visible:border-neutral-500';
    const errorBorder = 'border-red-900 focus-visible:ring-red-500 focus-visible:border-red-700';

    return (
      <input
        type={type}
        className={`${baseStyles} ${error ? errorBorder : defaultBorder} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
