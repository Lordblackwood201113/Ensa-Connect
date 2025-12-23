import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

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
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre de votre question *
          </label>
          <Input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Comment trouver un stage en data science ?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Détails *
          </label>
          <textarea
            rows={6}
            required
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none touch-manipulation"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Décrivez votre question ou demande en détail..."
          />
        </div>

        {/* Mobile: Boutons en colonne inversée, Desktop: en ligne */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
