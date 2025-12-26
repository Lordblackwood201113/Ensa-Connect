import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
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
  CaretDown,
  Warning,
  PaperPlaneTilt,
  Eye
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
  const [isMassMessageModalOpen, setIsMassMessageModalOpen] = useState(false);
  const [massMessageData, setMassMessageData] = useState({ subject: '', content: '', targetPromotion: '' });

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
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Create auth user using admin API (requires edge function or service role)
      // For now, we'll use the sign up method which requires email confirmation
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Split full name into first and last name
        const nameParts = request.full_name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || nameParts[0];

        // Create profile
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: request.email,
          promotion: request.promotion,
          city: request.city,
          linkedin_url: request.linkedin_url,
          onboarding_completed: true,
          must_change_password: true,
          completion_score: 30
        });

        // Update request status
        await supabase
          .from('join_requests')
          .update({
            status: 'approved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', request.id);

        // TODO: Send email with credentials (requires edge function)
        alert(`Utilisateur créé ! Mot de passe temporaire: ${tempPassword}\n\nNote: L'utilisateur devra changer son mot de passe à la première connexion.`);

        loadJoinRequests();
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
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
      await supabase
        .from('profiles')
        .update({ is_super_user: newStatus })
        .eq('id', targetUser.id);

      loadUsers();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) {
      alert('Vous ne pouvez pas vous supprimer vous-même');
      return;
    }

    if (!confirm(`Supprimer définitivement ${targetUser.first_name} ${targetUser.last_name} ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      // Delete from auth (requires admin API)
      const { error } = await supabase.auth.admin.deleteUser(targetUser.id);
      if (error) throw error;

      loadUsers();
      alert('Utilisateur supprimé');
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

    try {
      // Get target users
      let query = supabase.from('profiles').select('id');
      if (massMessageData.targetPromotion) {
        query = query.eq('promotion', massMessageData.targetPromotion);
      }

      const { data: targetUsers } = await query;

      if (!targetUsers || targetUsers.length === 0) {
        alert('Aucun utilisateur trouvé');
        return;
      }

      // Create notifications for all users
      const notifications = targetUsers.map((u) => ({
        user_id: u.id,
        type: 'new_message' as const,
        title: massMessageData.subject,
        message: massMessageData.content.substring(0, 200),
        link: '/messages',
        is_read: false,
        triggered_by_id: user?.id
      }));

      await supabase.from('notifications').insert(notifications);

      alert(`Message envoyé à ${targetUsers.length} utilisateur(s)`);
      setIsMassMessageModalOpen(false);
      setMassMessageData({ subject: '', content: '', targetPromotion: '' });
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

  if (!profile?.is_super_user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-primary/70 rounded-xl flex items-center justify-center">
          <ShieldCheck size={24} weight="fill" className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Administration</h1>
          <p className="text-sm text-gray-500">Gérez le réseau ENSA Connect</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all touch-manipulation",
              activeTab === tab.id
                ? "bg-brand-black text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            )}
          >
            <tab.icon size={18} weight={activeTab === tab.id ? "fill" : "regular"} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeTab !== 'messages' && (
        <Card className="p-3">
          <div className="relative">
            <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {activeTab === 'requests' && (
            <div className="flex gap-2 mt-3">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRequestFilter(filter)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    requestFilter === filter
                      ? "bg-brand-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {filter === 'all' ? 'Toutes' : filter === 'pending' ? 'En attente' : filter === 'approved' ? 'Approuvées' : 'Rejetées'}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-16 bg-gray-100 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Join Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <Card className="p-8 text-center">
                  <UserPlus size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune demande</p>
                </Card>
              ) : (
                filteredRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-brand-black truncate">{request.full_name}</h3>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            request.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                              request.status === 'approved' ? "bg-green-100 text-green-700" :
                                "bg-red-100 text-red-700"
                          )}>
                            {request.status === 'pending' ? 'En attente' : request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{request.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-lg">{request.promotion}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded-lg">{request.city}</span>
                          {request.linkedin_url && (
                            <a
                              href={request.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Demandé le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request)}
                            className="gap-1"
                          >
                            <Check size={16} weight="bold" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedRequest(request); setIsRejectModalOpen(true); }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X size={16} weight="bold" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar src={u.avatar_url || undefined} alt={u.last_name || ''} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-brand-black truncate">
                          {u.first_name} {u.last_name}
                        </h3>
                        {u.is_super_user && (
                          <Crown size={16} weight="fill" className="text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400">{u.promotion}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleSuperUser(u)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          u.is_super_user
                            ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                        title={u.is_super_user ? "Rétrograder" : "Promouvoir admin"}
                      >
                        <Crown size={18} weight={u.is_super_user ? "fill" : "regular"} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Supprimer"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-brand-black">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.company} - {job.location}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Par {job.poster?.first_name} {job.poster?.last_name} • {new Date(job.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(job)}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div className="space-y-3">
              {filteredDiscussions.map((discussion) => (
                <Card key={discussion.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-brand-black">{discussion.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{discussion.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Par {discussion.author?.first_name} {discussion.author?.last_name} • {new Date(discussion.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDiscussion(discussion)}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-bold text-lg text-brand-black mb-4 flex items-center gap-2">
                  <PaperPlaneTilt size={20} weight="duotone" />
                  Envoyer un message en masse
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Promotion cible (optionnel)
                    </label>
                    <Input
                      placeholder="Ex: ENSA 53 (laisser vide pour tous)"
                      value={massMessageData.targetPromotion}
                      onChange={(e) => setMassMessageData({ ...massMessageData, targetPromotion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sujet
                    </label>
                    <Input
                      required
                      placeholder="Sujet du message"
                      value={massMessageData.subject}
                      onChange={(e) => setMassMessageData({ ...massMessageData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Contenu
                    </label>
                    <textarea
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                      placeholder="Votre message..."
                      value={massMessageData.content}
                      onChange={(e) => setMassMessageData({ ...massMessageData, content: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSendMassMessage} className="gap-2">
                    <PaperPlaneTilt size={18} weight="bold" />
                    Envoyer à tous
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-lg text-brand-black mb-2 flex items-center gap-2">
                  <EnvelopeSimple size={20} weight="duotone" />
                  Messagerie directe
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  En tant qu'administrateur, vous pouvez envoyer des messages à n'importe quel utilisateur,
                  même sans connexion préalable.
                </p>
                <Button variant="outline" onClick={() => navigate('/messages')} className="gap-2">
                  <Eye size={18} />
                  Accéder à la messagerie
                </Button>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => { setIsRejectModalOpen(false); setSelectedRequest(null); setRejectReason(''); }}
        title="Rejeter la demande"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <Warning size={24} weight="fill" className="text-red-500 shrink-0" />
            <div>
              <p className="font-medium text-red-700">
                Rejeter la demande de {selectedRequest?.full_name} ?
              </p>
              <p className="text-sm text-red-600 mt-1">
                Cette personne sera notifiée par email.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Raison du rejet (optionnel)
            </label>
            <textarea
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="Expliquez la raison du rejet..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRejectRequest} className="bg-red-600 hover:bg-red-700">
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
