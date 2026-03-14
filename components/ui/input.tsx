import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, type = 'text', ...props }, ref) => {
    const baseStyles =
      'flex h-10 w-full rounded-md border bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-black transition-colors';
    
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
