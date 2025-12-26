import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Autocomplete from "react-google-autocomplete";

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    promotion: '',
    city: '',
    study_track: '',
    company: '',
    job_title: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // On utilise upsert pour gérer les deux cas (création ou mise à jour)
      // car selon la méthode de connexion, le profil peut ne pas exister
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          completion_score: 50,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Force le rafraîchissement du profil dans le contexte
      await refreshProfile();
      
      // Redirection explicite
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Une erreur est survenue lors de la mise à jour du profil: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Bienvenue !</h1>
          <p className="text-gray-600">Complétez votre profil pour accéder à l'annuaire.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Numéro de Promotion * (1-70)</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ENSA</span>
                <input
                  type="number"
                  required
                  min="1"
                  max="70"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-16 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
            <p className="text-xs text-gray-500 mt-1">Entrez un numéro entre 1 et 70.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Filière *</label>
            <select
              required
              className="w-full bg-white border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-[16px] touch-manipulation appearance-none leading-tight"
              value={formData.study_track}
              onChange={(e) => setFormData({ ...formData, study_track: e.target.value })}
            >
              <option value="">Sélectionner...</option>
              <option value="Agroéconomie">Agroéconomie</option>
              <option value="Agribusiness">Agribusiness</option>
              <option value="Agroalimentaire">Agroalimentaire</option>
              <option value="Production végétale">Production végétale</option>
              <option value="Défense des cultures">Défense des cultures</option>
              <option value="Zootechnie">Zootechnie</option>
              <option value="Eaux et forêts">Eaux et forêts</option>
              <option value="Génie rural">Génie rural</option>
              <option value="Pédologie">Pédologie</option>
              <option value="Changement climatique & développement durable">Changement climatique & développement durable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ville Actuelle *</label>
            <Autocomplete
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              onPlaceSelected={(place) => {
                if (place.formatted_address) {
                  setFormData({ ...formData, city: place.formatted_address });
                }
              }}
              options={{
                types: ["(cities)"],
              }}
              placeholder="Rechercher une ville..."
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              defaultValue={formData.city}
              onChange={(e: any) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium mb-2">Entreprise</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Ex: Google"
                />
             </div>
             <div>
                <label className="block text-sm font-medium mb-2">Poste</label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Ex: Product Manager"
                />
             </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Accéder au Dashboard'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

