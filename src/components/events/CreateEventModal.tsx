import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (eventToEdit) {
        const { error } = await supabase
          .from('events')
          .update(formData)
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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={eventToEdit ? 'Modifier l\'événement' : 'Créer un événement'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Image Upload */}
        <div className="w-full h-40 sm:h-48 bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200">
          <ImageUpload
            url={formData.image_url}
            onUpload={(url) => setFormData({ ...formData, image_url: url })}
            aspectRatio="video"
            label="Ajouter une image"
            className="w-full h-full"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre de l'événement *
          </label>
          <Input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Afterwork Alumni 2024"
          />
        </div>

        {/* Date & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date et Heure *
            </label>
            <Input
              type="datetime-local"
              required
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lieu *
            </label>
            <Input
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Paris, France"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            rows={4}
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none text-base sm:text-sm touch-manipulation"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Détails de l'événement..."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Enregistrement...' : (eventToEdit ? 'Mettre à jour' : 'Publier')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
