import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (jobToEdit) {
        const { error } = await supabase
            .from('jobs')
            .update({
                ...formData,
                // requirements et apply_link sont gérés
            })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-brand-black">
            {jobToEdit ? 'Modifier l\'offre' : 'Publier une offre'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Intitulé du poste *</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Ingénieur Full Stack"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise *</label>
              <Input
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Ex: Tech Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de contrat *</label>
              <select
                required
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
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

            <div className="col-span-full">
               <label className="block text-sm font-medium text-gray-700 mb-2">Lieu *</label>
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
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    defaultValue={formData.location}
                    onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                />
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description du poste *</label>
              <textarea
                rows={5}
                required
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Missions, responsabilités..."
              />
            </div>
            
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lien pour postuler (Optionnel)</label>
              <Input
                type="url"
                value={formData.apply_link}
                onChange={(e) => setFormData({ ...formData, apply_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : (jobToEdit ? 'Mettre à jour' : 'Publier l\'offre')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


