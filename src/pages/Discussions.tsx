import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DiscussionCard } from '../components/discussions/DiscussionCard';
import { CreateDiscussionModal } from '../components/discussions/CreateDiscussionModal';
import { DiscussionDetailModal } from '../components/discussions/DiscussionDetailModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
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

  // Auto-open discussion from URL
  useEffect(() => {
    const openDiscussionId = searchParams.get('open');
    if (openDiscussionId && discussions.length > 0) {
      const discussionToOpen = discussions.find(d => d.id === openDiscussionId);
      if (discussionToOpen) {
        setSelectedDiscussion(discussionToOpen);
        setIsDetailModalOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, discussions]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, promotion),
          replies(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const filterCounts = {
    all: discussions.length,
    open: discussions.filter(d => !d.is_closed).length,
    closed: discussions.filter(d => d.is_closed).length,
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Discussions</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Posez vos questions et entraidez-vous</p>
        </div>
        
        {/* Desktop button */}
        <Button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="hidden sm:flex gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle discussion
        </Button>
      </div>

      {/* Search */}
      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une discussion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Filter Tabs - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation",
              filter === f
                ? "bg-brand-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f === 'all' && 'Toutes'}
            {f === 'open' && 'En attente'}
            {f === 'closed' && 'Résolues'}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              filter === f 
                ? "bg-white/20" 
                : "bg-gray-200"
            )}>
              {filterCounts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Discussions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-2xl">
          <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">Aucune discussion</h3>
          <p className="text-sm text-gray-400 mb-6 px-4">
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
        <div className="space-y-3">
          {filteredDiscussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              onClick={() => handleDiscussionClick(discussion)}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-4 w-14 h-14 bg-brand-black text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform touch-manipulation"
      >
        <Plus className="w-6 h-6" />
      </button>

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
