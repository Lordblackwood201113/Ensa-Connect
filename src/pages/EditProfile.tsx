import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ImageUpload } from '../components/ui/ImageUpload';
import { ArrowLeft, Plus, Trash2, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import type { Experience, Education } from '../types';
import Autocomplete from "react-google-autocomplete";

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile Data State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    promotion: '',
    city: '',
    study_track: '',
    company: '',
    job_title: '',
    avatar_url: '',
    cover_url: '',
    email: '',
    linkedin_url: '',
    phone: '',
    is_phone_visible: false
  });

  useEffect(() => {
    if (profile && user) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        promotion: profile.promotion || '',
        city: profile.city || '',
        study_track: profile.study_track || '',
        company: profile.company || '',
        job_title: profile.job_title || '',
        avatar_url: profile.avatar_url || '',
        cover_url: profile.cover_url || '',
        email: profile.email || '',
        linkedin_url: profile.linkedin_url || '',
        phone: profile.phone || '',
        is_phone_visible: profile.is_phone_visible || false
      });
      fetchTimeline();
    }
  }, [profile, user]);

  const fetchTimeline = async () => {
    if (!user) return;
    
    const { data: expData } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });
    
    if (expData) setExperiences(expData);

    const { data: eduData } = await supabase
      .from('educations')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });
      
    if (eduData) setEducations(eduData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await refreshProfile();
      navigate(`/member/${user.id}`);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExperience = async () => {
     if (!user) return;
     const { error } = await supabase.from('experiences').insert({
        user_id: user.id,
        title: '',
        company: '',
        is_current: false
     });
     if (!error) fetchTimeline();
  };

  const deleteExperience = async (id: string) => {
     await supabase.from('experiences').delete().eq('id', id);
     fetchTimeline();
  };

  const updateExperience = async (id: string, updates: Partial<Experience>) => {
      await supabase.from('experiences').update(updates).eq('id', id);
      // Optimistic update
      setExperiences(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addEducation = async () => {
    if (!user) return;
    const { error } = await supabase.from('educations').insert({
       user_id: user.id,
       school: '',
       degree: ''
    });
    if (!error) fetchTimeline();
 };

 const deleteEducation = async (id: string) => {
    await supabase.from('educations').delete().eq('id', id);
    fetchTimeline();
 };

 const updateEducation = async (id: string, updates: Partial<Education>) => {
     await supabase.from('educations').update(updates).eq('id', id);
     setEducations(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
 };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validation
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Veuillez remplir tous les champs.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès !' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la modification du mot de passe.' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-20 px-4 sm:px-0">
      {/* Desktop back button */}
      <Button
        variant="ghost"
        className="hidden sm:flex mb-4 pl-0 hover:bg-transparent"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au profil
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

        {/* Images Section */}
        <Card className="p-0 overflow-hidden">
            <div className="relative h-32 sm:h-48 bg-gray-100 group">
                {formData.cover_url ? (
                     <img src={formData.cover_url} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm sm:text-base">
                        Ajouter une bannière
                    </div>
                )}
                {/* Mobile back button */}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="sm:hidden absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:transition-opacity">
                     <ImageUpload
                        url={formData.cover_url}
                        onUpload={(url) => setFormData(prev => ({ ...prev, cover_url: url }))}
                        aspectRatio="video"
                        label="Modifier la bannière"
                        className="absolute inset-0 opacity-0 hover:opacity-100"
                     />
                </div>
            </div>
            <div className="px-4 sm:px-8 relative">
                 <div className="absolute -top-12 sm:-top-16 left-4 sm:left-8">
                     <div className="relative">
                        <ImageUpload
                            url={formData.avatar_url}
                            onUpload={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            aspectRatio="square"
                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md overflow-hidden"
                        />
                     </div>
                 </div>
                    <div className="pt-14 sm:pt-20 pb-6 sm:pb-8">
                     <h2 className="text-xl font-bold mb-4">Informations personnelles</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Prénom</label>
                            <Input
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Nom</label>
                            <Input
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Promotion (1-70)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ENSA</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="70"
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 sm:py-2.5 pl-16 pr-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple touch-manipulation"
                                    placeholder="53"
                                    value={formData.promotion ? formData.promotion.replace('ENSA ', '') : ''}
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
                        <div>
                            <label className="block text-sm font-medium mb-2">Filière</label>
                            <select
                                className="w-full bg-white border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2.5 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple touch-manipulation appearance-none leading-tight"
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
                    </div>
                    <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Ville</label>
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
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 sm:py-2.5 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple touch-manipulation"
                                defaultValue={formData.city}
                                onChange={(e: any) => setFormData({ ...formData, city: e.target.value })}
                            />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Poste actuel</label>
                            <Input
                            value={formData.job_title}
                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Entreprise actuelle</label>
                            <Input
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email de contact</label>
                            <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="contact@exemple.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Profil LinkedIn</label>
                            <Input
                            value={formData.linkedin_url}
                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Téléphone</label>
                            <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+212 6..."
                            />
                        </div>
                        <div className="flex items-center pt-8">
                             <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={formData.is_phone_visible}
                                    onChange={(e) => setFormData({ ...formData, is_phone_visible: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                                />
                                <span className="text-sm font-medium text-gray-700">Visible par les autres membres</span>
                             </label>
                        </div>
                    </div>
                 </div>
            </div>
        </Card>

        {/* Experience Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Expérience Professionnelle</h3>
                <Button type="button" variant="secondary" size="sm" onClick={addExperience}>
                    <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
            </div>
            
            {experiences.map((exp) => (
                <Card key={exp.id} className="relative">
                    <button 
                        type="button"
                        onClick={() => deleteExperience(exp.id)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Poste</label>
                            <Input 
                                value={exp.title} 
                                placeholder="Ex: Chef de projet"
                                onChange={(e) => updateExperience(exp.id, { title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Entreprise</label>
                            <Input 
                                value={exp.company} 
                                placeholder="Ex: Société Générale"
                                onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Date de début</label>
                            <Input 
                                type="date"
                                value={exp.start_date || ''} 
                                onChange={(e) => updateExperience(exp.id, { start_date: e.target.value || null })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Date de fin</label>
                            <Input 
                                type="date"
                                value={exp.end_date || ''} 
                                onChange={(e) => updateExperience(exp.id, { end_date: e.target.value || null })}
                            />
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        {/* Education Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Formation Académique</h3>
                <Button type="button" variant="secondary" size="sm" onClick={addEducation}>
                    <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
            </div>
            
            {educations.map((edu) => (
                <Card key={edu.id} className="relative">
                    <button 
                        type="button"
                        onClick={() => deleteEducation(edu.id)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">École</label>
                            <Input 
                                value={edu.school} 
                                placeholder="Ex: École Nationale Supérieure d'Agriculture"
                                onChange={(e) => updateEducation(edu.id, { school: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Diplôme</label>
                            <Input 
                                value={edu.degree || ''} 
                                placeholder="Ex: Ingénieur d'état"
                                onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Domaine d'étude</label>
                            <Input 
                                value={edu.field_of_study || ''} 
                                placeholder="Ex: Agronomie"
                                onChange={(e) => updateEducation(edu.id, { field_of_study: e.target.value })}
                            />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Année de début</label>
                            <Input 
                                type="number"
                                min="1900"
                                max="2099"
                                placeholder="AAAA"
                                value={edu.start_date || ''} 
                                onChange={(e) => updateEducation(edu.id, { start_date: e.target.value ? parseInt(e.target.value) : null })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Année de fin</label>
                            <Input 
                                type="number"
                                min="1900"
                                max="2099"
                                placeholder="AAAA"
                                value={edu.end_date || ''} 
                                onChange={(e) => updateEducation(edu.id, { end_date: e.target.value ? parseInt(e.target.value) : null })}
                            />
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        {/* Password Change Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Modifier le mot de passe</h3>
              <p className="text-sm text-gray-500">Sécurisez votre compte avec un nouveau mot de passe</p>
            </div>
          </div>

          {passwordMessage && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              passwordMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {passwordMessage.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmer le nouveau mot de passe</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Retapez le mot de passe"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full sm:w-auto"
            >
              {passwordLoading ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </div>
        </Card>


        {/* Sticky action bar - full width on mobile */}
        <div className="fixed sm:sticky bottom-0 sm:bottom-6 left-0 right-0 sm:left-auto sm:right-auto sm:mx-auto sm:max-w-md bg-white/95 sm:bg-white/90 backdrop-blur-md p-3 sm:p-2 border-t sm:border border-gray-200 sm:shadow-2xl sm:rounded-full flex justify-center gap-2 sm:mt-12 z-20 safe-area-bottom">
            <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                className="flex-1 sm:flex-initial sm:rounded-full sm:px-6 hover:bg-gray-100 cursor-pointer text-gray-600"
            >
                Annuler
            </Button>
            <Button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial sm:rounded-full sm:px-8 bg-brand-black text-white hover:bg-gray-800 cursor-pointer shadow-none"
            >
                {loading ? '...' : 'Enregistrer'}
            </Button>
        </div>
      </form>
    </div>
  );
}
