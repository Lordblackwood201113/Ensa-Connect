import { Send, Loader2 } from 'lucide-react';
import { cn, MODAL_FOOTER_CLASSES } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function MessageInput({ value, onChange, onSend, sending }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={MODAL_FOOTER_CLASSES}>
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent min-h-[44px] max-h-32"
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || sending}
          className={cn(
            'rounded-full h-11 w-11 shrink-0 flex items-center justify-center transition-colors',
            value.trim() && !sending
              ? 'bg-brand-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
