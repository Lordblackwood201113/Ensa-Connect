import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'neutral';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants = {
      success: 'bg-brand-lime text-brand-black',
      neutral: 'bg-gray-100 text-gray-600',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'rounded-pill px-2 py-0.5 text-xs font-bold inline-block',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };

