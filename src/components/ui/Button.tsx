import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200',
      secondary: 'bg-brand-lime text-brand-black hover:brightness-95 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200',
      outline: 'border border-gray-200 text-brand-black hover:bg-gray-50 hover:border-gray-300 transition-all duration-200',
      ghost: 'text-gray-400 hover:text-brand-black hover:bg-gray-50 transition-all duration-200',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-full font-medium flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
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

