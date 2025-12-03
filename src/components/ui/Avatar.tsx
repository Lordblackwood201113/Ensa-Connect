import { type ImgHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, size = 'md', src, alt, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24',
    };

    return (
      <img
        ref={ref}
        src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'User')}&background=random`}
        alt={alt}
        className={cn(
          'rounded-full object-cover border-2 border-white bg-gray-100',
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };

