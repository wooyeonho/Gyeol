import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-black';

    const variants = {
      primary: 'bg-white text-black hover:bg-neutral-200 focus-visible:ring-white',
      secondary: 'bg-neutral-800 text-white hover:bg-neutral-700 focus-visible:ring-neutral-400',
      outline:
        'border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 focus-visible:ring-neutral-500',
      ghost: 'bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:ring-neutral-500',
      danger: 'bg-red-900 text-red-100 hover:bg-red-800 focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-8 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
