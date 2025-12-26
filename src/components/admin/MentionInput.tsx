import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { At, Users, GraduationCap } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface MentionSuggestion {
  type: 'all' | 'promotion';
  value: string;
  label: string;
  count?: number;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onTargetChange: (targets: { type: 'all' | 'promotion'; value: string }[]) => void;
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onTargetChange,
  placeholder = "Tapez @ pour mentionner...",
  className
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load promotions for suggestions
  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('promotion')
      .not('promotion', 'is', null);

    if (data) {
      // Count users per promotion
      const promotionCounts: Record<string, number> = {};
      data.forEach(p => {
        if (p.promotion) {
          promotionCounts[p.promotion] = (promotionCounts[p.promotion] || 0) + 1;
        }
      });

      // Create suggestions
      const promoSuggestions: MentionSuggestion[] = Object.entries(promotionCounts)
        .map(([promo, count]) => ({
          type: 'promotion' as const,
          value: promo,
          label: promo,
          count
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

      // Add @tous option
      const allSuggestion: MentionSuggestion = {
        type: 'all',
        value: 'tous',
        label: 'Tous les utilisateurs',
        count: data.length
      };

      setSuggestions([allSuggestion, ...promoSuggestions]);
    }
  };

  // Extract mentions from text
  const extractMentions = (text: string): { type: 'all' | 'promotion'; value: string }[] => {
    const mentions: { type: 'all' | 'promotion'; value: string }[] = [];
    const mentionRegex = /@(\w+(?:\s+\d+)?)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionText = match[1].toLowerCase();

      if (mentionText === 'tous') {
        mentions.push({ type: 'all', value: 'tous' });
      } else {
        // Check if it matches a promotion
        const matchedPromo = suggestions.find(s =>
          s.type === 'promotion' &&
          s.value.toLowerCase().replace(/\s+/g, '').includes(mentionText.replace(/\s+/g, ''))
        );
        if (matchedPromo) {
          mentions.push({ type: 'promotion', value: matchedPromo.value });
        }
      }
    }

    return mentions;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(cursor);

    // Check if we're typing a mention
    const textBeforeCursor = newValue.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();

      // Filter suggestions
      const filtered = suggestions.filter(s => {
        const searchText = s.type === 'all' ? 'tous' : s.value.toLowerCase();
        return searchText.includes(query) || s.label.toLowerCase().includes(query);
      });

      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }

    // Update targets
    const mentions = extractMentions(newValue);
    onTargetChange(mentions);
  };

  // Insert mention
  const insertMention = (suggestion: MentionSuggestion) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);

    // Find the @ position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = value.slice(0, mentionStart);

    // Create the mention text
    const mentionText = suggestion.type === 'all'
      ? '@tous'
      : `@${suggestion.value.replace(/\s+/g, '')}`;

    const newValue = beforeMention + mentionText + ' ' + textAfterCursor;
    onChange(newValue);

    // Update targets
    const mentions = extractMentions(newValue);
    onTargetChange(mentions);

    setShowSuggestions(false);

    // Focus and set cursor after mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursor = mentionStart + mentionText.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredSuggestions[selectedIndex]);
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedEl = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative">
      <div className="relative">
        <At size={20} className="absolute left-4 top-3 text-gray-400" />
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className={cn(
            "w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl",
            "focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50",
            "resize-none text-sm",
            className
          )}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.value}
              onClick={() => insertMention(suggestion)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                index === selectedIndex
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                suggestion.type === 'all'
                  ? "bg-brand-primary/20 text-brand-primary"
                  : "bg-gray-100 text-gray-600"
              )}>
                {suggestion.type === 'all' ? (
                  <Users size={16} weight="bold" />
                ) : (
                  <GraduationCap size={16} weight="bold" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {suggestion.type === 'all' ? '@tous' : `@${suggestion.value.replace(/\s+/g, '')}`}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.label}
                </div>
              </div>
              {suggestion.count !== undefined && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {suggestion.count} utilisateur{suggestion.count > 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-400 mt-2 ml-1">
        Tapez <span className="font-mono bg-gray-100 px-1 rounded">@tous</span> pour tous ou{' '}
        <span className="font-mono bg-gray-100 px-1 rounded">@ensa53</span> pour une promotion
      </p>
    </div>
  );
}
