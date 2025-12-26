import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { Profile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  connections: Profile[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

interface MentionSuggestion {
  profile: Profile;
  displayName: string;
  searchName: string;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  connections,
  placeholder = 'Écrire une réponse...',
  disabled = false,
  loading = false,
  className,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Préparer la liste des connexions avec noms de recherche
  const connectionSuggestions: MentionSuggestion[] = connections.map((profile) => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
    const searchName = displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return { profile, displayName, searchName };
  });

  // Filtrer les suggestions basées sur la query
  const filterSuggestions = useCallback((query: string) => {
    if (!query) {
      setSuggestions(connectionSuggestions.slice(0, 5));
      return;
    }

    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtered = connectionSuggestions
      .filter((s) => s.searchName.includes(normalizedQuery))
      .slice(0, 5);

    setSuggestions(filtered);
    setSelectedIndex(0);
  }, [connectionSuggestions]);

  // Détecter les mentions pendant la frappe
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onChange(newValue);

    // Ajuster la hauteur du textarea automatiquement
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }

    // Chercher le @ le plus récent avant le curseur
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Vérifier si @ est au début ou précédé d'un espace ou d'un saut de ligne
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';

      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);

        // Vérifier qu'il n'y a pas d'espace ou de saut de ligne dans la query (mention terminée)
        if (!query.includes(' ') && !query.includes('\n')) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(query);
          filterSuggestions(query);
          setShowSuggestions(true);
          return;
        }
      }
    }

    // Pas de mention en cours
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  // Sélectionner une suggestion
  const selectSuggestion = (suggestion: MentionSuggestion) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = value.slice(0, mentionStartIndex);
    const afterMention = value.slice(mentionStartIndex + 1 + mentionQuery.length);

    // Remplacer par @Prénom_Nom (avec underscore pour éviter les espaces)
    const mentionText = `@${suggestion.displayName.replace(/ /g, '_')} `;
    const newValue = beforeMention + mentionText + afterMention;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Repositionner le curseur après la mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Gérer les touches clavier
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Tab':
        case 'Enter':
          if (showSuggestions) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey && value.trim() && !disabled && !loading) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Fermer les suggestions si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll la suggestion sélectionnée dans la vue
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  // Réinitialiser la hauteur du textarea quand la valeur est vidée
  useEffect(() => {
    if (!value && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-48 overflow-y-auto z-50"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.profile.id}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                index === selectedIndex ? 'bg-brand-primary/20' : 'hover:bg-gray-50'
              )}
            >
              <Avatar
                src={suggestion.profile.avatar_url || undefined}
                alt={suggestion.displayName}
                size="sm"
                className="w-8 h-8 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {suggestion.displayName}
                </p>
                {suggestion.profile.promotion && (
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.profile.promotion}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hint quand on tape @ */}
      {showSuggestions && suggestions.length === 0 && mentionQuery && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50">
          <p className="text-sm text-gray-500 text-center">
            Aucune connexion trouvée pour "{mentionQuery}"
          </p>
        </div>
      )}

      {/* Input Container */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent min-h-[44px] max-h-32 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          {/* Hint pour les mentions */}
          {isInputFocused && !value && connections.length > 0 && (
            <div className="absolute right-4 top-3 text-xs text-gray-400 hidden sm:block">
              Tapez @ pour mentionner
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !value.trim() || disabled}
          className={cn(
            'rounded-full h-11 w-11 shrink-0 flex items-center justify-center transition-colors',
            value.trim() && !loading && !disabled
              ? 'bg-brand-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Extrait les mentions d'un texte
 * Retourne un tableau des noms mentionnés (sans le @)
 */
export function extractMentions(content: string): string[] {
  // Pattern: @Prénom_Nom ou @Prénom
  const mentionRegex = /@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:_[A-Za-zÀ-ÖØ-öø-ÿ]+)*)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Remplacer les underscores par des espaces pour obtenir le nom complet
    mentions.push(match[1].replace(/_/g, ' '));
  }

  return [...new Set(mentions)]; // Retirer les doublons
}

/**
 * Transforme le texte pour afficher les mentions en surbrillance
 */
export function renderContentWithMentions(content: string): React.ReactNode {
  const mentionRegex = /@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:_[A-Za-zÀ-ÖØ-öø-ÿ]+)*)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Ajouter le texte avant la mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Ajouter la mention stylisée (en vert lime)
    const displayName = match[1].replace(/_/g, ' ');
    parts.push(
      <span
        key={`mention-${keyIndex++}`}
        className="text-brand-primary font-medium"
      >
        @{displayName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Ajouter le texte restant
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}
