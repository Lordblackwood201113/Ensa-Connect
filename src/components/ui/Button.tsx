import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl active:scale-[0.97] transition-all duration-200',
      secondary: 'bg-brand-lime text-brand-black hover:brightness-95 shadow-md hover:shadow-lg active:scale-[0.97] transition-all duration-200',
      outline: 'border border-gray-200 text-brand-black hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all duration-200',
      ghost: 'text-gray-500 hover:text-brand-black hover:bg-gray-100 active:bg-gray-200 transition-all duration-200',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md active:scale-[0.97] transition-all duration-200',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-5 py-2.5 text-base min-h-[44px] sm:px-6 sm:min-h-[42px]',
      lg: 'px-6 py-3 text-lg min-h-[52px] sm:px-8 sm:min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'rounded-full font-medium flex items-center justify-center gap-2',
          // Touch optimization
          'touch-manipulation select-none',
          // Cursor and disabled states
          'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100',
          // Variants and sizes
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
