import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ImageUpload } from '../components/ui/ImageUpload';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Experience, Education } from '../types';
import Autocomplete from "react-google-autocomplete";

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  
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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <Button 
        variant="ghost" 
        className="mb-4 pl-0 hover:bg-transparent" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au profil
      </Button>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Images Section */}
        <Card className="p-0 overflow-hidden">
            <div className="relative h-48 bg-gray-100 group">
                {formData.cover_url ? (
                     <img src={formData.cover_url} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Ajouter une bannière
                    </div>
                )}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <ImageUpload 
                        url={formData.cover_url} 
                        onUpload={(url) => setFormData(prev => ({ ...prev, cover_url: url }))}
                        aspectRatio="video"
                        label="Modifier la bannière"
                        className="absolute inset-0 opacity-0 hover:opacity-100"
                     />
                </div>
            </div>
            <div className="px-8 relative">
                 <div className="absolute -top-16 left-8">
                     <div className="relative">
                        <ImageUpload 
                            url={formData.avatar_url} 
                            onUpload={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            aspectRatio="square"
                            className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden"
                        />
                     </div>
                 </div>
                    <div className="pt-20 pb-8">
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
                                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-16 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
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
                                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
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
                                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
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


        <div className="sticky bottom-6 mx-auto max-w-md bg-white/90 backdrop-blur-md p-2 border border-gray-200 shadow-2xl rounded-full flex justify-center gap-2 mt-12 z-20">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="rounded-full px-6 hover:bg-gray-100 cursor-pointer text-gray-600"
            >
                Annuler
            </Button>
            <Button 
                type="submit" 
                disabled={loading}
                className="rounded-full px-8 bg-brand-black text-white hover:bg-gray-800 cursor-pointer shadow-none"
            >
                {loading ? '...' : 'Enregistrer tout'}
            </Button>
        </div>
      </form>
    </div>
  );
}
