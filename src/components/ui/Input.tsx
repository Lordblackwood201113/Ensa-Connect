import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Base styles - Mobile first with larger touch targets
          'bg-white border border-gray-200 rounded-xl w-full transition-all',
          // Sizing - Larger on mobile for better touch
          'py-3 px-4 text-base',
          'sm:py-2.5 sm:text-sm',
          // Focus states
          'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent',
          // Touch optimization
          'touch-manipulation',
          // Prevent zoom on iOS when focusing
          'text-[16px] sm:text-sm',
          // Placeholder styling
          'placeholder:text-gray-400',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
