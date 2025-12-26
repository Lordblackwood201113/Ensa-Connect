import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import Autocomplete from "react-google-autocomplete";
import type { Job } from '../../types';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobToEdit?: Job | null;
}

export function CreateJobModal({ isOpen, onClose, onSuccess, jobToEdit }: CreateJobModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    contract_type: 'CDI',
    description: '',
    requirements: '',
    apply_link: ''
  });

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title,
        company: jobToEdit.company,
        location: jobToEdit.location,
        contract_type: jobToEdit.contract_type,
        description: jobToEdit.description,
        requirements: jobToEdit.requirements || '',
        apply_link: jobToEdit.apply_link || ''
      });
    } else {
      setFormData({
        title: '',
        company: '',
        location: '',
        contract_type: 'CDI',
        description: '',
        requirements: '',
        apply_link: ''
      });
    }
  }, [jobToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (jobToEdit) {
        const { error } = await supabase
          .from('jobs')
          .update(formData)
          .eq('id', jobToEdit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jobs')
          .insert({
            ...formData,
            poster_id: user.id
          });

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Erreur lors de l\'enregistrement de l\'offre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={jobToEdit ? 'Modifier l\'offre' : 'Publier une offre'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intitulé du poste *
          </label>
          <Input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Ingénieur Full Stack"
          />
        </div>

        {/* Company & Contract Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entreprise *
            </label>
            <Input
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Ex: Tech Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de contrat *
            </label>
            <select
              required
              className="w-full bg-white border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-base sm:text-sm touch-manipulation appearance-none leading-tight"
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
              <option value="Alternance">Alternance</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lieu *
          </label>
          <Autocomplete
            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onPlaceSelected={(place) => {
              if (place.formatted_address) {
                setFormData({ ...formData, location: place.formatted_address });
              }
            }}
            options={{
              types: ["(cities)"],
            }}
            placeholder="Ville, Pays..."
            className="w-full bg-white border border-gray-200 rounded-xl py-3 sm:py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-base sm:text-sm touch-manipulation"
            defaultValue={formData.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description du poste *
          </label>
          <textarea
            rows={4}
            required
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none text-base sm:text-sm touch-manipulation"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Missions, responsabilités..."
          />
        </div>
        
        {/* Apply Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lien pour postuler (Optionnel)
          </label>
          <Input
            type="url"
            value={formData.apply_link}
            onChange={(e) => setFormData({ ...formData, apply_link: e.target.value })}
            placeholder="https://..."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Enregistrement...' : (jobToEdit ? 'Mettre à jour' : 'Publier l\'offre')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
