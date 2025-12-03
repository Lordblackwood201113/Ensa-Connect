import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile, Experience, Education } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Linkedin, MapPin, Building, GraduationCap, ArrowLeft, Briefcase, Copy, Check, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (copiedEmail) {
      const timer = setTimeout(() => setCopiedEmail(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedEmail]);

  useEffect(() => {
    if (id) {
      fetchProfileData(id);
    }
  }, [id]);

  const fetchProfileData = async (userId: string) => {
    try {
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch Experience
      const { data: expData } = await supabase
        .from('experiences')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      if (expData) setExperiences(expData);

      // Fetch Education
      const { data: eduData } = await supabase
        .from('educations')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      if (eduData) setEducations(eduData);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (!profile) return <div className="text-center py-10">Profil non trouvé</div>;

  const isOwnProfile = user?.id === profile.id;

  const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link to="/dashboard" className="inline-flex items-center text-gray-500 hover:text-brand-black mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à l'annuaire
      </Link>

      <Card className="overflow-hidden p-0 mb-6">
        <div className="h-48 bg-gray-200 w-full relative">
            {profile.cover_url ? (
                <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-brand-black/10 flex items-center justify-center text-gray-400">
                    <div className="w-full h-full bg-gradient-to-r from-brand-lime to-brand-purple opacity-20"></div>
                </div>
            )}
        </div>
        
        <div className="px-4 lg:px-8 pb-8 relative">
            <div className="absolute -top-16 left-4 lg:left-8">
                <Avatar 
                    src={profile.avatar_url || undefined} 
                    alt={`${profile.first_name} ${profile.last_name}`} 
                    size="xl" 
                    className="w-32 h-32 border-4 border-white bg-white"
                />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end pt-20 sm:pt-4 mb-4 gap-4 sm:gap-0">
                {isOwnProfile ? (
                   <Link to="/profile/edit" className="w-full sm:w-auto">
                     <Button variant="outline" className="w-full sm:w-auto">Modifier mon profil</Button>
                   </Link>
                ) : (
                   <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                     {profile.linkedin_url && (
                       <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                         <Button variant="outline" className="gap-2">
                           <Linkedin className="w-4 h-4" />
                           LinkedIn
                         </Button>
                       </a>
                     )}
                     {profile.email && (
                        <Button 
                            variant="primary" 
                            className="gap-2 min-w-[140px]"
                            onClick={() => {
                                if (profile.email) {
                                    navigator.clipboard.writeText(profile.email);
                                    setCopiedEmail(true);
                                }
                            }}
                        >
                           {copiedEmail ? (
                               <>
                                   <Check className="w-4 h-4" />
                                   Email copié !
                               </>
                           ) : (
                               <>
                                   <Copy className="w-4 h-4" />
                                   Copier l'email
                               </>
                           )}
                        </Button>
                     )}
                   </div>
                )}
            </div>

            <div className="mt-8">
                <h1 className="text-3xl font-bold text-brand-black mb-1">
                    {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                    {profile.job_title} {profile.company ? `@ ${profile.company}` : ''}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.city || 'Ville non renseignée'}
                    </div>
                    <div className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        Promo {profile.promotion || '?'}
                    </div>
                    {(profile.phone && (profile.is_phone_visible || isOwnProfile)) && (
                        <div className="flex items-center gap-1">
                             <Phone className="w-4 h-4" />
                             {profile.phone}
                        </div>
                    )}
                    {profile.study_track && (
                        <div className="flex items-center gap-1">
                             <Building className="w-4 h-4" />
                             {profile.study_track}
                        </div>
                    )}
                </div>

                <div className="border-b border-gray-200 mb-8">
                    <div className="flex gap-8">
                        <button className="pb-3 border-b-2 border-brand-black font-semibold text-brand-black">Profil</button>
                    </div>
                </div>

                <div className="grid gap-8">
                    
                    {/* Experiences */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-brand-purple" />
                            Parcours professionnel
                        </h3>
                        {experiences.length > 0 ? (
                            <div className="space-y-6 ml-2 border-l-2 border-gray-100 pl-8 relative">
                                {experiences.map((exp) => (
                                    <div key={exp.id} className="relative">
                                        <div className="absolute -left-[39px] top-1 w-5 h-5 rounded-full border-4 border-white bg-brand-purple"></div>
                                        <h4 className="font-bold text-lg">{exp.title}</h4>
                                        <p className="text-gray-700 font-medium">{exp.company}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Présent'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic">Aucune expérience ajoutée.</p>
                        )}
                    </section>

                    {/* Educations */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-brand-lime" />
                            Formation académique
                        </h3>
                        {educations.length > 0 ? (
                            <div className="space-y-6 ml-2 border-l-2 border-gray-100 pl-8 relative">
                                {educations.map((edu) => (
                                    <div key={edu.id} className="relative">
                                        <div className="absolute -left-[39px] top-1 w-5 h-5 rounded-full border-4 border-white bg-brand-lime"></div>
                                        <h4 className="font-bold text-lg">{edu.school}</h4>
                                        <p className="text-gray-700">{edu.degree} {edu.field_of_study ? `• ${edu.field_of_study}` : ''}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {edu.start_date ? `${edu.start_date} - ` : ''}{edu.end_date || 'Présent'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic">Aucune formation ajoutée.</p>
                        )}
                    </section>

                </div>
            </div>
        </div>
      </Card>
    </div>
  );
}
