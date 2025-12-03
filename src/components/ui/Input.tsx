import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple w-full transition-all',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

