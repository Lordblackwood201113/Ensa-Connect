import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DiscussionCard } from '../components/discussions/DiscussionCard';
import { CreateDiscussionModal } from '../components/discussions/CreateDiscussionModal';
import { DiscussionDetailModal } from '../components/discussions/DiscussionDetailModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Search, MessageCircle } from 'lucide-react';
import type { Discussion } from '../types';

export default function Discussions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  // Ouvrir automatiquement une discussion si l'URL contient ?open=discussionId
  useEffect(() => {
    const openDiscussionId = searchParams.get('open');
    if (openDiscussionId && discussions.length > 0) {
      const discussionToOpen = discussions.find(d => d.id === openDiscussionId);
      if (discussionToOpen) {
        setSelectedDiscussion(discussionToOpen);
        setIsDetailModalOpen(true);
        // Nettoyer l'URL
        setSearchParams({});
      }
    }
  }, [searchParams, discussions]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // Fetch discussions with author and replies count
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, promotion),
          replies(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the replies count
      const discussionsWithCount = (data || []).map(d => ({
        ...d,
        replies_count: d.replies?.[0]?.count || 0
      }));

      setDiscussions(discussionsWithCount);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscussionClick = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setIsDetailModalOpen(true);
  };

  // Filter and search discussions
  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch = 
      discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discussion.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filter === 'all' ||
      (filter === 'open' && !discussion.is_closed) ||
      (filter === 'closed' && discussion.is_closed);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Discussions</h1>
          <p className="text-gray-500 mt-1">Posez vos questions et entraidez-vous</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle discussion
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Rechercher une discussion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
            className="text-sm"
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'open' ? 'primary' : 'outline'}
            onClick={() => setFilter('open')}
            className="text-sm"
          >
            En attente
          </Button>
          <Button
            variant={filter === 'closed' ? 'primary' : 'outline'}
            onClick={() => setFilter('closed')}
            className="text-sm"
          >
            Résolues
          </Button>
        </div>
      </div>

      {/* Discussions List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucune discussion</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || filter !== 'all' 
              ? 'Aucune discussion ne correspond à vos critères'
              : 'Soyez le premier à lancer une discussion !'}
          </p>
          {!searchQuery && filter === 'all' && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer une discussion
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDiscussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              onClick={() => handleDiscussionClick(discussion)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateDiscussionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchDiscussions}
      />

      <DiscussionDetailModal
        discussion={selectedDiscussion}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDiscussion(null);
        }}
        onUpdate={fetchDiscussions}
      />
    </div>
  );
}
