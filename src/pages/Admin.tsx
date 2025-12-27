import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messages';
import { useAuth, pauseAuthListener, resumeAuthListener } from '../context/AuthContext';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { MentionInput } from '../components/admin/MentionInput';
import { cn } from '../lib/utils';
import type { JoinRequest, Profile, Job, Discussion } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Briefcase,
  ChatTeardropDots,
  EnvelopeSimple,
  Check,
  X,
  Trash,
  Crown,
  MagnifyingGlass,
  Warning,
  PaperPlaneTilt,
  Eye,
  Desktop,
  DeviceMobile
} from '@phosphor-icons/react';

type AdminTab = 'requests' | 'users' | 'jobs' | 'discussions' | 'messages';

export default function Admin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [loading, setLoading] = useState(true);

  // Data states
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [massMessageData, setMassMessageData] = useState({ subject: '', content: '', targetText: '' });
  const [messageTargets, setMessageTargets] = useState<{ type: 'all' | 'promotion'; value: string }[]>([]);

  // Check if user is super user
  useEffect(() => {
    if (profile && !profile.is_super_user) {
      navigate('/home');
    }
  }, [profile, navigate]);

  // Load data based on active tab
  useEffect(() => {
    if (profile?.is_super_user) {
      loadData();
    }
  }, [activeTab, profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'requests':
          await loadJoinRequests();
          break;
        case 'users':
          await loadUsers();
          break;
        case 'jobs':
          await loadJobs();
          break;
        case 'discussions':
          await loadDiscussions();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    const { data } = await supabase
      .from('join_requests')
      .select('*, reviewer:profiles!reviewed_by(*)')
      .order('created_at', { ascending: false });
    setJoinRequests(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('last_name', { ascending: true });
    setUsers(data || []);
  };

  const loadJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*, poster:profiles(*)')
      .order('created_at', { ascending: false });
    setJobs(data || []);
  };

  const loadDiscussions = async () => {
    const { data } = await supabase
      .from('discussions')
      .select('*, author:profiles(*)')
      .order('created_at', { ascending: false });
    setDiscussions(data || []);
  };

  // ===== JOIN REQUEST ACTIONS =====
  const handleApproveRequest = async (request: JoinRequest) => {
    if (!user) return;

    try {
      // IMPORTANT: Save the admin's current session BEFORE signUp
      // Because signUp() automatically logs in the new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      if (!adminSession) {
        throw new Error('Session admin expirée, veuillez vous reconnecter');
      }

      // Generate a secure random password (user won't know it - they'll reset it)
      const tempPassword = crypto.randomUUID() + 'Aa1!';

      // PAUSE the auth listener to prevent UI from switching to new user
      pauseAuthListener();

      // Step 1: Create the user account with signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: request.email,
        password: tempPassword,
        options: {
          data: {
            full_name: request.full_name,
            first_name: request.full_name.split(' ')[0],
            last_name: request.full_name.split(' ').slice(1).join(' ') || request.full_name.split(' ')[0],
          },
          emailRedirectTo: `${window.location.origin}/set-password`,
        },
      });

      // IMMEDIATELY restore admin session after signUp
      // This prevents the admin from being logged out
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (sessionError) {
        console.error('Session restore error:', sessionError);
        resumeAuthListener(); // Resume before throwing
        throw new Error('Erreur lors de la restauration de la session admin');
      }

      // Verify session was restored correctly
      const { data: verifySession } = await supabase.auth.getUser();
      if (verifySession.user?.id !== user.id) {
        console.error('Session mismatch:', verifySession.user?.id, 'vs', user.id);
        resumeAuthListener(); // Resume before throwing
        throw new Error('La session admin n\'a pas pu être restaurée correctement');
      }

      // RESUME the auth listener now that we're back to admin session
      resumeAuthListener();

      if (signUpError) {
        // Check for existing user
        if (signUpError.message?.includes('already registered')) {
          throw new Error('Cet email est déjà enregistré dans le système');
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Step 2: Create the profile
      const nameParts = request.full_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: request.email,
        promotion: request.promotion,
        city: request.city,
        linkedin_url: request.linkedin_url,
        onboarding_completed: false,
        must_change_password: true,
        completion_score: 30,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway - profile can be created later
      }

      // Step 3: Send password reset email so user can set their own password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        request.email,
        {
          redirectTo: `${window.location.origin}/set-password`,
        }
      );

      if (resetError) {
        console.warn('Could not send reset email:', resetError);
        // Continue anyway - user received confirmation email from signUp
      }

      // Step 4: Send custom approval email via Resend
      try {
        const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            to: request.email,
            fullName: request.full_name,
            temporaryPassword: tempPassword,
          },
        });

        if (emailError) {
          console.warn('Could not send approval email:', emailError);
          // Continue anyway - the account is created
        }
      } catch (emailErr) {
        console.warn('Email function error:', emailErr);
        // Continue anyway
      }

      // Step 5: Update request status - THIS MUST SUCCEED
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Status update error:', updateError);
        throw new Error(`Compte créé mais erreur lors de la mise à jour du statut: ${updateError.message}`);
      }

      alert(`Compte créé pour ${request.email} !\n\nL'utilisateur recevra un email pour confirmer son compte et définir son mot de passe.`);

      loadJoinRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      resumeAuthListener(); // Ensure listener is resumed on error
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleRejectRequest = async () => {
    if (!user || !selectedRequest) return;

    try {
      await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectReason || null
        })
        .eq('id', selectedRequest.id);

      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadJoinRequests();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // ===== USER ACTIONS =====
  const handleToggleSuperUser = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) {
      alert('Vous ne pouvez pas modifier votre propre statut');
      return;
    }

    const newStatus = !targetUser.is_super_user;
    const confirmMsg = newStatus
      ? `Promouvoir ${targetUser.first_name} ${targetUser.last_name} en super utilisateur ?`
      : `Rétrograder ${targetUser.first_name} ${targetUser.last_name} en utilisateur simple ?`;

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_super_user: newStatus })
        .eq('id', targetUser.id);

      if (error) throw error;

      // Update local state immediately for responsive UI
      setUsers(users.map(u =>
        u.id === targetUser.id ? { ...u, is_super_user: newStatus } : u
      ));

      alert(newStatus
        ? `${targetUser.first_name} ${targetUser.last_name} est maintenant super utilisateur !`
        : `${targetUser.first_name} ${targetUser.last_name} n'est plus super utilisateur.`
      );
    } catch (error: any) {
      console.error('Toggle super user error:', error);
      alert(`Erreur lors de la modification: ${error.message}`);
    }
  };

  // Navigate to start a conversation with a user
  const handleDirectMessage = (targetUser: Profile) => {
    navigate(`/messages?new=${targetUser.id}`);
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) {
      alert('Vous ne pouvez pas vous supprimer vous-même');
      return;
    }

    if (!confirm(`Supprimer le profil de ${targetUser.first_name} ${targetUser.last_name} ?\n\nNote: Le compte d'authentification devra être supprimé manuellement depuis le dashboard Supabase.`)) {
      return;
    }

    try {
      // Delete the profile (the auth user will remain but won't have access)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUser.id);

      if (error) throw error;

      loadUsers();
      alert(`Profil de ${targetUser.first_name} ${targetUser.last_name} supprimé.\n\nPour supprimer complètement le compte, allez dans:\nSupabase Dashboard → Authentication → Users`);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // ===== JOB/DISCUSSION ACTIONS =====
  const handleDeleteJob = async (job: Job) => {
    if (!confirm(`Supprimer l'offre "${job.title}" ?`)) return;

    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      loadJobs();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteDiscussion = async (discussion: Discussion) => {
    if (!confirm(`Supprimer la discussion "${discussion.title}" ?`)) return;

    try {
      await supabase.from('discussions').delete().eq('id', discussion.id);
      loadDiscussions();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // ===== MASS MESSAGING =====
  const handleSendMassMessage = async () => {
    if (!massMessageData.subject || !massMessageData.content) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (messageTargets.length === 0) {
      alert('Veuillez mentionner au moins une cible (@tous ou @ensaX)');
      return;
    }

    if (!user) {
      alert('Session expirée, veuillez vous reconnecter');
      return;
    }

    try {
      // Build query based on targets
      let targetUserIds: string[] = [];

      // Check if @tous is in targets
      const hasAll = messageTargets.some(t => t.type === 'all');

      if (hasAll) {
        // Get all users except current user
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', user.id);
        if (allUsers) {
          targetUserIds = allUsers.map(u => u.id);
        }
      } else {
        // Get users from specific promotions
        const promotions = messageTargets
          .filter(t => t.type === 'promotion')
          .map(t => t.value);

        if (promotions.length > 0) {
          const { data: promoUsers } = await supabase
            .from('profiles')
            .select('id')
            .in('promotion', promotions)
            .neq('id', user.id);

          if (promoUsers) {
            targetUserIds = promoUsers.map(u => u.id);
          }
        }
      }

      // Remove duplicates
      targetUserIds = [...new Set(targetUserIds)];

      if (targetUserIds.length === 0) {
        alert('Aucun utilisateur trouvé pour les cibles spécifiées');
        return;
      }

      // Format the message with subject
      const fullMessage = `📢 **${massMessageData.subject}**\n\n${massMessageData.content}`;

      // Track success/failure
      let successCount = 0;
      let failCount = 0;

      // Send actual messages to each user
      for (const targetUserId of targetUserIds) {
        try {
          // Get or create conversation with this user
          const { data: conversation, error: convError } = await messageService.getOrCreateConversation(
            user.id,
            targetUserId
          );

          if (convError || !conversation) {
            console.error(`Failed to create conversation with ${targetUserId}:`, convError);
            failCount++;
            continue;
          }

          // Send the message
          const { error: msgError } = await messageService.sendMessage(
            conversation.id,
            user.id,
            fullMessage
          );

          if (msgError) {
            console.error(`Failed to send message to ${targetUserId}:`, msgError);
            failCount++;
            continue;
          }

          successCount++;
        } catch (err) {
          console.error(`Error sending to ${targetUserId}:`, err);
          failCount++;
        }
      }

      // Also create notifications for visibility
      const notifications = targetUserIds.map((userId) => ({
        user_id: userId,
        type: 'admin_message' as const,
        title: massMessageData.subject,
        message: massMessageData.content.substring(0, 200),
        link: '/messages',
        is_read: false,
        triggered_by_id: user.id
      }));

      await supabase.from('notifications').insert(notifications);

      // Show target summary
      const targetSummary = hasAll
        ? 'tous les utilisateurs'
        : messageTargets.filter(t => t.type === 'promotion').map(t => t.value).join(', ');

      if (failCount > 0) {
        alert(`Message envoyé à ${successCount}/${targetUserIds.length} utilisateur(s) (${targetSummary})\n\n${failCount} échec(s)`);
      } else {
        alert(`Message envoyé à ${successCount} utilisateur(s) (${targetSummary})`);
      }

      setMassMessageData({ subject: '', content: '', targetText: '' });
      setMessageTargets([]);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  // Filter functions
  const filteredRequests = joinRequests.filter((r) => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.promotion.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.promotion?.toLowerCase().includes(search)
    );
  });

  const filteredJobs = jobs.filter((j) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      j.title.toLowerCase().includes(search) ||
      j.company.toLowerCase().includes(search)
    );
  });

  const filteredDiscussions = discussions.filter((d) => {
    if (!searchTerm) return true;
    return d.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Tab config
  const tabs = [
    { id: 'requests' as const, label: 'Demandes', icon: UserPlus, count: joinRequests.filter(r => r.status === 'pending').length },
    { id: 'users' as const, label: 'Utilisateurs', icon: Users, count: users.length },
    { id: 'jobs' as const, label: 'Emplois', icon: Briefcase, count: jobs.length },
    { id: 'discussions' as const, label: 'Discussions', icon: ChatTeardropDots, count: discussions.length },
    { id: 'messages' as const, label: 'Messages', icon: EnvelopeSimple },
  ];

  // État pour afficher/masquer la recherche sur mobile
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  if (!profile?.is_super_user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  // Message pour les utilisateurs mobiles
  const MobileRestrictionMessage = () => (
    <div className="sm:hidden flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 rounded-3xl flex items-center justify-center mb-6">
        <Desktop size={40} weight="duotone" className="text-brand-primary" />
      </div>
      <h2 className="text-xl font-bold text-brand-black mb-2">
        Accès réservé aux ordinateurs
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        La section d'administration nécessite un écran plus grand pour une gestion optimale.
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 px-4 py-2 rounded-full">
        <DeviceMobile size={14} />
        <span>Veuillez utiliser un ordinateur</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Message de restriction mobile */}
      <MobileRestrictionMessage />

      {/* Contenu Admin - Visible uniquement sur desktop */}
      <div className="hidden sm:block min-h-screen bg-gray-50/50 -m-4 sm:-m-6 p-3 sm:p-6 pb-24">
      {/* Header Compact */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck size={18} weight="fill" className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-brand-black leading-tight">Admin</h1>
            <p className="text-[11px] text-gray-400 hidden xs:block">Gestion ENSA Connect</p>
          </div>
        </div>

        {/* Bouton recherche mobile */}
        {activeTab !== 'messages' && (
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className={cn(
              "sm:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              showMobileSearch ? "bg-brand-primary text-white" : "bg-white text-gray-500 border border-gray-200"
            )}
          >
            <MagnifyingGlass size={18} weight="bold" />
          </button>
        )}
      </div>

      {/* Navigation Tabs - Style Pills Moderne */}
      <div className="bg-white rounded-2xl p-1 mb-3 shadow-sm border border-gray-100">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setShowMobileSearch(false); }}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 rounded-xl font-medium text-xs transition-all touch-manipulation relative",
                activeTab === tab.id
                  ? "bg-brand-black text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <tab.icon size={16} weight={activeTab === tab.id ? "fill" : "regular"} className="shrink-0" />
              <span className="hidden xs:inline truncate">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 xs:static xs:ml-1 text-[10px] w-4 h-4 xs:w-auto xs:h-auto xs:px-1.5 xs:py-0.5 rounded-full font-bold flex items-center justify-center",
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-brand-primary/10 text-brand-primary"
                )}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Barre de recherche - Expansible sur mobile */}
      {activeTab !== 'messages' && (
        <div className={cn(
          "overflow-hidden transition-all duration-200 mb-3",
          showMobileSearch ? "max-h-32 opacity-100" : "max-h-0 opacity-0 sm:max-h-32 sm:opacity-100"
        )}>
          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            {activeTab === 'requests' && (
              <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setRequestFilter(filter)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 touch-manipulation",
                      requestFilter === filter
                        ? "bg-brand-primary text-white"
                        : "bg-gray-100 text-gray-500 active:bg-gray-200"
                    )}
                  >
                    {filter === 'all' ? 'Toutes' : filter === 'pending' ? 'En attente' : filter === 'approved' ? 'Approuvées' : 'Rejetées'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3 animate-pulse border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Join Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-2">
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <UserPlus size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Aucune demande</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    {/* En-tête avec nom et statut */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-brand-black text-sm truncate">{request.full_name}</h3>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0",
                            request.status === 'pending' ? "bg-amber-50 text-amber-600" :
                              request.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                                "bg-red-50 text-red-500"
                          )}>
                            {request.status === 'pending' ? 'Attente' : request.status === 'approved' ? 'OK' : 'Rejeté'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{request.email}</p>
                      </div>
                    </div>

                    {/* Tags inline */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-md font-medium">
                        {request.promotion}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                        {request.city}
                      </span>
                      {request.linkedin_url && (
                        <a
                          href={request.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 font-medium"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {new Date(request.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleApproveRequest(request)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-primary text-white rounded-xl text-xs font-medium active:scale-[0.98] transition-transform touch-manipulation"
                        >
                          <Check size={14} weight="bold" />
                          <span>Approuver</span>
                        </button>
                        <button
                          onClick={() => { setSelectedRequest(request); setIsRejectModalOpen(true); }}
                          className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl active:scale-[0.98] transition-transform touch-manipulation"
                        >
                          <X size={16} weight="bold" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      {/* Avatar compact */}
                      <div className="relative shrink-0">
                        <Avatar src={u.avatar_url || undefined} alt={u.last_name || ''} size="sm" />
                        {u.is_super_user && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white">
                            <Crown size={8} weight="fill" className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-brand-black text-sm truncate">
                          {u.first_name} {u.last_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded font-medium">
                            {u.promotion || 'N/A'}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate">{u.email}</span>
                        </div>
                      </div>

                      {/* Actions compactes */}
                      <div className="flex gap-1.5 shrink-0">
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDirectMessage(u)}
                            className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
                          >
                            <EnvelopeSimple size={14} weight="bold" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleSuperUser(u)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation",
                            u.is_super_user
                              ? "bg-amber-100 text-amber-600"
                              : "bg-gray-100 text-gray-400"
                          )}
                        >
                          <Crown size={14} weight={u.is_super_user ? "fill" : "regular"} />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-2">
              {filteredJobs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Briefcase size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Aucune offre d'emploi</p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <Briefcase size={16} className="text-blue-500" weight="duotone" />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-brand-black text-sm truncate">{job.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{job.company} · {job.location}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            {job.poster?.first_name} {job.poster?.last_name}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(job.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleDeleteJob(job)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center active:scale-95 transition-transform touch-manipulation shrink-0"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div className="space-y-2">
              {filteredDiscussions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChatTeardropDots size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Aucune discussion</p>
                </div>
              ) : (
                filteredDiscussions.map((discussion) => (
                  <div key={discussion.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                        <ChatTeardropDots size={16} className="text-purple-500" weight="duotone" />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-brand-black text-sm truncate">{discussion.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{discussion.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            {discussion.author?.first_name} {discussion.author?.last_name}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(discussion.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleDeleteDiscussion(discussion)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center active:scale-95 transition-transform touch-manipulation shrink-0"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-3">
              {/* Message en masse */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                    <PaperPlaneTilt size={16} weight="duotone" className="text-brand-primary" />
                  </div>
                  <h3 className="font-semibold text-brand-black text-sm">Message en masse</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Destinataires
                    </label>
                    <MentionInput
                      value={massMessageData.targetText}
                      onChange={(value) => setMassMessageData({ ...massMessageData, targetText: value })}
                      onTargetChange={setMessageTargets}
                      placeholder="@tous ou @ensa53..."
                    />
                    {messageTargets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {messageTargets.map((target, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-medium rounded-md"
                          >
                            {target.type === 'all' ? 'Tous' : target.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Sujet
                    </label>
                    <input
                      type="text"
                      placeholder="Sujet du message"
                      value={massMessageData.subject}
                      onChange={(e) => setMassMessageData({ ...massMessageData, subject: e.target.value })}
                      className="w-full bg-gray-50 border-0 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Contenu
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-gray-50 border-0 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none"
                      placeholder="Votre message..."
                      value={massMessageData.content}
                      onChange={(e) => setMassMessageData({ ...massMessageData, content: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={handleSendMassMessage}
                    disabled={messageTargets.length === 0}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] touch-manipulation",
                      messageTargets.length === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-brand-primary text-white"
                    )}
                  >
                    <PaperPlaneTilt size={16} weight="bold" />
                    <span>Envoyer</span>
                  </button>
                </div>
              </div>

              {/* Messagerie directe */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <EnvelopeSimple size={18} weight="duotone" className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-black text-sm">Messagerie directe</h3>
                    <p className="text-[11px] text-gray-400 line-clamp-1">
                      Envoyer un message à n'importe quel utilisateur
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/messages')}
                    className="w-9 h-9 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center active:scale-95 transition-transform touch-manipulation shrink-0"
                  >
                    <Eye size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => { setIsRejectModalOpen(false); setSelectedRequest(null); setRejectReason(''); }}
        title="Rejeter la demande"
        size="sm"
      >
        <div className="p-4 space-y-4">
          {/* Alerte */}
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <Warning size={16} weight="fill" className="text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-red-700 text-sm truncate">
                Rejeter {selectedRequest?.full_name} ?
              </p>
              <p className="text-[11px] text-red-500 mt-0.5">
                Notification par email envoyée
              </p>
            </div>
          </div>

          {/* Raison */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Raison (optionnel)
            </label>
            <textarea
              rows={2}
              className="w-full bg-gray-50 border-0 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              placeholder="Expliquez la raison du rejet..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 active:scale-[0.98] transition-transform touch-manipulation"
            >
              Annuler
            </button>
            <button
              onClick={handleRejectRequest}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 active:scale-[0.98] transition-transform touch-manipulation"
            >
              Rejeter
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  );
}
