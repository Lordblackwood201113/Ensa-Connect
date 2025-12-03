import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ImageUpload } from '../ui/ImageUpload';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventToEdit?: Event | null;
}

export function CreateEventModal({ isOpen, onClose, onSuccess, eventToEdit }: CreateEventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    image_url: ''
  });

  useEffect(() => {
    if (eventToEdit) {
      // Formater la date pour l'input datetime-local (YYYY-MM-DDThh:mm)
      const date = new Date(eventToEdit.event_date);
      const formattedDate = date.toISOString().slice(0, 16);

      setFormData({
        title: eventToEdit.title,
        description: eventToEdit.description,
        event_date: formattedDate,
        location: eventToEdit.location,
        image_url: eventToEdit.image_url || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        event_date: '',
        location: '',
        image_url: ''
      });
    }
  }, [eventToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (eventToEdit) {
        const { error } = await supabase
            .from('events')
            .update({
                ...formData,
                // Pas besoin de mettre à jour organizer_id
            })
            .eq('id', eventToEdit.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
            .from('events')
            .insert({
            ...formData,
            organizer_id: user.id
            });

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Erreur lors de l\'enregistrement de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-brand-black">
            {eventToEdit ? 'Modifier l\'événement' : 'Créer un événement'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-center mb-6">
              <div className="w-full h-48 bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 relative group">
                 <ImageUpload
                    url={formData.image_url}
                    onUpload={(url) => setFormData({ ...formData, image_url: url })}
                    aspectRatio="video"
                    label="Ajouter une image de couverture"
                    className="w-full h-full"
                 />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'événement *</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Afterwork Alumni 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date et Heure *</label>
              <Input
                type="datetime-local"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lieu *</label>
              <Input
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Salle de conférence, Paris"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails de l'événement..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : (eventToEdit ? 'Mettre à jour' : 'Publier l\'événement')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


