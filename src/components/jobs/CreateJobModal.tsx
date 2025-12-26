import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import Autocomplete from "react-google-autocomplete";
import { Image, X, CalendarBlank, EnvelopeSimple } from '@phosphor-icons/react';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    contract_type: 'CDI',
    description: '',
    requirements: '',
    apply_link: '',
    image_url: '',
    application_deadline: '',
    application_email: ''
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
        apply_link: jobToEdit.apply_link || '',
        image_url: jobToEdit.image_url || '',
        application_deadline: jobToEdit.application_deadline || '',
        application_email: jobToEdit.application_email || ''
      });
      setImagePreview(jobToEdit.image_url || null);
    } else {
      setFormData({
        title: '',
        company: '',
        location: '',
        contract_type: 'CDI',
        description: '',
        requirements: '',
        apply_link: '',
        image_url: '',
        application_deadline: '',
        application_email: ''
      });
      setImagePreview(null);
    }
  }, [jobToEdit, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `job-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            placeholder="Ex: Ingénieur Agronome, Chef de culture"
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
              placeholder="Ex: OCP, Cosumar, Domaines Agricoles"
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
            placeholder="Gestion des cultures, suivi phytosanitaire, conseil agricole..."
          />
        </div>
        
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image de l'offre (Optionnel)
          </label>
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-primary hover:bg-brand-primary/5 transition-all touch-manipulation"
              >
                {uploadingImage ? (
                  <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Image size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Ajouter</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex-1 text-xs text-gray-500">
              <p>Logo de l'entreprise ou image illustrative</p>
              <p className="mt-1">Formats: JPG, PNG, WebP (max 5 Mo)</p>
            </div>
          </div>
        </div>

        {/* Deadline & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarBlank size={16} className="inline mr-1.5 text-gray-400" />
              Date limite de candidature
            </label>
            <Input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EnvelopeSimple size={16} className="inline mr-1.5 text-gray-400" />
              Email de candidature
            </label>
            <Input
              type="email"
              value={formData.application_email}
              onChange={(e) => setFormData({ ...formData, application_email: e.target.value })}
              placeholder="rh@groupe-agricole.ma"
            />
          </div>
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
