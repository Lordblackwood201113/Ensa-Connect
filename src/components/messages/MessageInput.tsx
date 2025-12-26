import { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function MessageInput({ value, onChange, onSend, sending }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !sending) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !sending) {
      onSend();
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 px-3 py-2 sm:px-4 sm:py-3 safe-area-inset-bottom">
      {/* Input Container - Facebook/LinkedIn style */}
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Text Input Area */}
        <div className="flex-1 relative">
          <div className="flex items-end bg-gray-100 rounded-3xl transition-all duration-200 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-brand-primary/20">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              className={cn(
                "flex-1 bg-transparent resize-none px-4 py-2.5 text-[15px] leading-[22px]",
                "placeholder:text-gray-400 focus:outline-none",
                "min-h-[42px] max-h-[120px]",
                "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              )}
              rows={1}
            />
          </div>
        </div>

        {/* Send Button - Integrated style like Messenger */}
        <button
          onClick={handleSend}
          disabled={!value.trim() || sending}
          className={cn(
            "shrink-0 flex items-center justify-center transition-all duration-200",
            "w-10 h-10 rounded-full",
            value.trim() && !sending
              ? "bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-95"
              : "text-gray-300 cursor-default"
          )}
          aria-label="Envoyer"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className={cn(
              "w-5 h-5 transition-transform duration-200",
              value.trim() && "translate-x-0.5"
            )} />
          )}
        </button>
      </div>
    </div>
  );
}
