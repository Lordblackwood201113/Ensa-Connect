import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile, Experience, Education } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConnectionButton } from '../components/connections/ConnectionButton';
import { Linkedin, MapPin, Building, GraduationCap, ArrowLeft, Briefcase, Copy, Check, Phone, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { connectionService } from '../lib/connections';
import { messageService } from '../lib/messages';

export default function ProfileView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'connected'>('none');

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

      // Fetch connections count
      const { count } = await connectionService.getConnectionsCount(userId);
      setConnectionsCount(count);

      // Fetch connection status with current user
      if (user && user.id !== userId) {
        const { status } = await connectionService.getConnectionStatus(user.id, userId);
        setConnectionStatus(status);
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className="animate-pulse">
        <div className="h-32 sm:h-48 bg-gray-200 rounded-t-2xl" />
        <div className="bg-white rounded-b-2xl p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 -mt-16 sm:-mt-20 border-4 border-white" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (!profile) return (
    <div className="text-center py-10 px-4">
      <p className="text-gray-500">Profil non trouvé</p>
      <Link to="/dashboard" className="text-brand-primary mt-2 inline-block">
        Retour à l'annuaire
      </Link>
    </div>
  );

  const isOwnProfile = user?.id === profile.id;

  const handleStartConversation = async () => {
    if (!user || !profile) return;

    const { data, error } = await messageService.getOrCreateConversation(user.id, profile.id);
    if (data) {
      navigate(`/messages/${data.id}`);
    } else if (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 px-4 sm:px-0">
      {/* Mobile: bouton retour flottant, Desktop: lien classique */}
      <Link
        to="/dashboard"
        className="hidden sm:inline-flex items-center text-gray-500 hover:text-brand-black mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à l'annuaire
      </Link>

      <Card className="overflow-hidden p-0 mb-6">
        {/* Cover image - plus petite sur mobile */}
        <div className="h-32 sm:h-48 bg-gray-200 w-full relative">
            {profile.cover_url ? (
                <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-brand-black/10 flex items-center justify-center text-gray-400">
                    <div className="w-full h-full bg-gradient-to-r from-brand-primary to-brand-secondary opacity-20"></div>
                </div>
            )}
            {/* Mobile back button over cover */}
            <Link
              to="/dashboard"
              className="sm:hidden absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
        </div>

        <div className="px-4 sm:px-8 pb-6 sm:pb-8 relative">
            {/* Avatar - plus petit sur mobile */}
            <div className="absolute -top-12 sm:-top-16 left-4 sm:left-8">
                <Avatar
                    src={profile.avatar_url || undefined}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    size="xl"
                    className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white bg-white"
                />
            </div>

            {/* Actions - positionnées à droite */}
            <div className="flex justify-end pt-14 sm:pt-4 mb-4">
                {isOwnProfile ? (
                   <Link to="/profile/edit">
                     <Button variant="outline">Modifier mon profil</Button>
                   </Link>
                ) : (
                   <div className="flex items-center gap-2">
                     {/* Bouton de connexion - icône seule, discret */}
                     <ConnectionButton targetUserId={profile.id} size="md" showLabel={false} />

                     {/* Bouton Message - visible uniquement si connecté */}
                     {connectionStatus === 'connected' && (
                       <button
                         onClick={handleStartConversation}
                         className="p-2.5 rounded-full border border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all touch-manipulation active:scale-95"
                         title="Envoyer un message"
                       >
                         <MessageCircle className="w-5 h-5" />
                       </button>
                     )}

                     {/* LinkedIn */}
                     {profile.linkedin_url && (
                       <a
                         href={profile.linkedin_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="p-2.5 rounded-full border border-gray-200 text-gray-500 hover:text-[#0A66C2] hover:border-[#0A66C2] hover:bg-[#0A66C2]/5 transition-all touch-manipulation active:scale-95"
                         title="Voir le profil LinkedIn"
                       >
                         <Linkedin className="w-5 h-5" />
                       </a>
                     )}

                     {/* Copier email */}
                     {profile.email && (
                        <button
                            onClick={() => {
                                if (profile.email) {
                                    navigator.clipboard.writeText(profile.email);
                                    setCopiedEmail(true);
                                }
                            }}
                            className="p-2.5 rounded-full border border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all touch-manipulation active:scale-95"
                            title={copiedEmail ? "Email copié !" : "Copier l'email"}
                        >
                           {copiedEmail ? (
                               <Check className="w-5 h-5 text-green-500" />
                           ) : (
                               <Copy className="w-5 h-5" />
                           )}
                        </button>
                     )}
                   </div>
                )}
            </div>

            <div className="mt-4 sm:mt-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-black mb-1">
                    {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">
                    {profile.job_title} {profile.company ? `@ ${profile.company}` : ''}
                </p>

                {/* Info chips - scrollable on mobile */}
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0 rounded-full">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="truncate max-w-[100px] sm:max-w-none">{profile.city || 'Ville ?'}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0 rounded-full">
                        <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {profile.promotion || 'Promo ?'}
                    </div>
                    {(profile.phone && (profile.is_phone_visible || isOwnProfile)) && (
                        <a
                            href={`tel:${profile.phone}`}
                            className="flex items-center gap-1 bg-gray-50 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0 rounded-full hover:text-brand-primary"
                        >
                             <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                             {profile.phone}
                        </a>
                    )}
                    {profile.study_track && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0 rounded-full">
                             <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                             <span className="truncate max-w-[120px] sm:max-w-none">{profile.study_track}</span>
                        </div>
                    )}
                </div>

                {/* Compteur de connexions */}
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{connectionsCount}</span>
                    <span className="text-gray-500">connexion{connectionsCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="border-b border-gray-200 mb-6 sm:mb-8">
                    <div className="flex gap-8">
                        <button className="pb-3 border-b-2 border-brand-black font-semibold text-brand-black text-sm sm:text-base">Profil</button>
                    </div>
                </div>

                <div className="grid gap-6 sm:gap-8">

                    {/* Experiences */}
                    <section>
                        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-brand-secondary" />
                            Parcours professionnel
                        </h3>
                        {experiences.length > 0 ? (
                            <div className="space-y-4 sm:space-y-6 ml-1 sm:ml-2 border-l-2 border-gray-100 pl-4 sm:pl-8 relative">
                                {experiences.map((exp) => (
                                    <div key={exp.id} className="relative">
                                        <div className="absolute -left-[21px] sm:-left-[39px] top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-white bg-brand-secondary"></div>
                                        <h4 className="font-bold text-base sm:text-lg">{exp.title}</h4>
                                        <p className="text-gray-700 font-medium text-sm sm:text-base">{exp.company}</p>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                            {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Présent'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic text-sm sm:text-base">Aucune expérience ajoutée.</p>
                        )}
                    </section>

                    {/* Educations */}
                    <section>
                        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />
                            Formation académique
                        </h3>
                        {educations.length > 0 ? (
                            <div className="space-y-4 sm:space-y-6 ml-1 sm:ml-2 border-l-2 border-gray-100 pl-4 sm:pl-8 relative">
                                {educations.map((edu) => (
                                    <div key={edu.id} className="relative">
                                        <div className="absolute -left-[21px] sm:-left-[39px] top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-white bg-brand-primary"></div>
                                        <h4 className="font-bold text-base sm:text-lg">{edu.school}</h4>
                                        <p className="text-gray-700 text-sm sm:text-base">{edu.degree} {edu.field_of_study ? `• ${edu.field_of_study}` : ''}</p>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                            {edu.start_date ? `${edu.start_date} - ` : ''}{edu.end_date || 'Présent'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic text-sm sm:text-base">Aucune formation ajoutée.</p>
                        )}
                    </section>

                </div>
            </div>
        </div>
      </Card>
    </div>
  );
}
