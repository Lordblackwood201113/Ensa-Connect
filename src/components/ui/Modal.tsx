import { type ReactNode, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showBackButton = true
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - Only visible on desktop */}
      <div
        className="hidden sm:block absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="h-full sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className={cn(
            // Mobile: Full screen
            "bg-white w-full h-full overflow-hidden flex flex-col",
            // Desktop: Centered modal with max height
            "sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:shadow-xl sm:relative",
            sizes[size]
          )}
        >
          {/* Header - Sticky */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 sm:p-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile back button */}
              {showBackButton && (
                <button
                  onClick={onClose}
                  className="sm:hidden p-1.5 -ml-1.5 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {title && (
                <h3 className="font-semibold text-brand-black text-base sm:text-lg">
                  {title}
                </h3>
              )}
            </div>

            {/* Desktop close button */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
