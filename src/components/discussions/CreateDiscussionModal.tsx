import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { cn, MODAL_FOOTER_CLASSES } from '../../lib/utils';

interface CreateDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDiscussionModal({ isOpen, onClose, onSuccess }: CreateDiscussionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on open
  useEffect(() => {
    if (isOpen) {
      // Small delay for modal animation
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('discussions')
        .insert({
          title: formData.title,
          content: formData.content,
          author_id: user.id,
          is_closed: false
        });

      if (error) throw error;

      setFormData({ title: '', content: '' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating discussion:', error);
      alert('Erreur lors de la création de la discussion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle discussion" size="lg">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            Titre de votre question <span className="text-red-500">*</span>
          </label>
          <input
            ref={titleInputRef}
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Comment trouver un stage en data science ?"
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all touch-manipulation"
            autoComplete="off"
            enterKeyHint="next"
          />
          <p className="text-[11px] text-gray-400 mt-1.5 sm:hidden">
            Soyez précis pour obtenir de meilleures réponses
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            Détails <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            required
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none touch-manipulation transition-all"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Décrivez votre question ou demande en détail..."
            enterKeyHint="done"
          />
          <p className="text-[11px] text-gray-400 mt-1 flex justify-between">
            <span className="hidden sm:inline">Décrivez le contexte de votre question</span>
            <span className={formData.content.length > 500 ? 'text-orange-500' : ''}>
              {formData.content.length}/1000
            </span>
          </p>
        </div>

        {/* Mobile: Sticky footer with safe area */}
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4", MODAL_FOOTER_CLASSES)}>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto py-3 sm:py-2"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.title.trim() || !formData.content.trim()}
            className="w-full sm:w-auto py-3 sm:py-2"
          >
            {loading ? 'Publication...' : 'Publier la discussion'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
