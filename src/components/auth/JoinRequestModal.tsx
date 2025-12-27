import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { cn, MODAL_FOOTER_CLASSES } from '../../lib/utils';
import { CheckCircle, UserPlus, LinkedinLogo, MapPin, GraduationCap, EnvelopeSimple, User } from '@phosphor-icons/react';
import Autocomplete from 'react-google-autocomplete';
import { getErrorMessage } from '../../lib/logger';

interface JoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRequestModal({ isOpen, onClose }: JoinRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    promotion: '',
    city: '',
    linkedin_url: ''
  });

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && !success) {
      const timer = setTimeout(() => {
        fullNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, success]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData({
          full_name: '',
          email: '',
          promotion: '',
          city: '',
          linkedin_url: ''
        });
        setSuccess(false);
        setError(null);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate promotion format
      const promoNumber = parseInt(formData.promotion.replace('ENSA ', ''));
      if (isNaN(promoNumber) || promoNumber < 1 || promoNumber > 70) {
        throw new Error('Le numéro de promotion doit être entre 1 et 70');
      }

      const { error: insertError } = await supabase
        .from('join_requests')
        .insert({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          promotion: formData.promotion,
          city: formData.city,
          linkedin_url: formData.linkedin_url.trim() || null
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          throw new Error('Une demande avec cet email existe déjà');
        }
        throw insertError;
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Success state
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Demande envoyée" size="md">
        <div className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} weight="fill" className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-brand-black mb-2">
            Demande envoyée avec succès !
          </h3>
          <p className="text-gray-600 mb-6">
            Votre demande d'adhésion a été soumise. Un administrateur l'examinera prochainement.
            Vous recevrez un email à <strong>{formData.email}</strong> une fois votre demande traitée.
          </p>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rejoindre ENSA Connect" size="lg">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4 mb-2">
          <div className="flex items-start gap-3">
            <UserPlus size={24} weight="duotone" className="text-brand-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-brand-black text-sm">
                Bienvenue dans la communauté ENSA !
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Remplissez ce formulaire pour demander à rejoindre le réseau des alumni.
                Votre demande sera examinée par un administrateur.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <User size={14} className="inline mr-1.5 text-gray-400" />
            Nom et prénom complet <span className="text-red-500">*</span>
          </label>
          <Input
            ref={fullNameRef}
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Ex: Mohamed Amine Benali"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <EnvelopeSimple size={14} className="inline mr-1.5 text-gray-400" />
            Adresse email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="votre.email@exemple.com"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Vous recevrez vos identifiants de connexion à cette adresse
          </p>
        </div>

        {/* Promotion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <GraduationCap size={14} className="inline mr-1.5 text-gray-400" />
            Promotion <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ENSA</span>
            <input
              type="number"
              required
              min="1"
              max="70"
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-16 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-[16px] touch-manipulation"
              placeholder="53"
              value={formData.promotion.replace('ENSA ', '')}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 70) {
                  setFormData({ ...formData, promotion: `ENSA ${val}` });
                } else if (e.target.value === '') {
                  setFormData({ ...formData, promotion: '' });
                }
              }}
            />
          </div>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <MapPin size={14} className="inline mr-1.5 text-gray-400" />
            Ville actuelle <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onPlaceSelected={(place) => {
              if (place.formatted_address) {
                setFormData({ ...formData, city: place.formatted_address });
              }
            }}
            options={{
              types: ['(cities)'],
            }}
            placeholder="Rechercher une ville..."
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-[16px] touch-manipulation"
            defaultValue={formData.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, city: e.target.value })
            }
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <LinkedinLogo size={14} className="inline mr-1.5 text-gray-400" />
            Profil LinkedIn <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <Input
            type="url"
            value={formData.linkedin_url}
            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
            placeholder="https://linkedin.com/in/votre-profil"
          />
        </div>

        {/* Actions */}
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
            disabled={loading || !formData.full_name || !formData.email || !formData.promotion || !formData.city}
            className="w-full sm:w-auto py-3 sm:py-2 gap-2"
          >
            {loading ? 'Envoi...' : (
              <>
                <UserPlus size={18} weight="bold" />
                Soumettre ma demande
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
