import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DiscussionCard } from '../components/discussions/DiscussionCard';
import { CreateDiscussionModal } from '../components/discussions/CreateDiscussionModal';
import { DiscussionDetailModal } from '../components/discussions/DiscussionDetailModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Plus, Search, MessageCircle, Grid3x3, Clock, CheckCircle2 } from 'lucide-react';
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

  const filterIcons = {
    all: Grid3x3,
    open: Clock,
    closed: CheckCircle2,
  };

  return (
    <div className="space-y-3 xs:space-y-4 sm:space-y-6 pb-20 sm:pb-10 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 xs:gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-brand-black truncate">Discussions</h1>
          <p className="text-xs xs:text-sm text-gray-500 hidden sm:block">Posez vos questions et entraidez-vous</p>
        </div>
        
        {/* Desktop button */}
        <Button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="hidden sm:flex gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvelle discussion
        </Button>
      </div>

      {/* Search */}
      <Card className="p-2.5 xs:p-3 sm:p-4 w-full max-w-full">
        <div className="relative">
          <Search className="absolute left-2.5 xs:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 xs:w-4 xs:h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une discussion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 xs:pl-10 text-sm xs:text-base"
          />
        </div>
      </Card>

      {/* Filter Tabs - Icons only on mobile */}
      <div className="flex gap-1.5 xs:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {(['all', 'open', 'closed'] as const).map((f) => {
          const Icon = filterIcons[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 xs:gap-2 px-2.5 xs:px-3 sm:px-4 py-1.5 xs:py-2 rounded-full text-xs xs:text-sm font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 shrink-0",
                filter === f
                  ? "bg-brand-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
              )}
              title={f === 'all' ? 'Toutes' : f === 'open' ? 'En attente' : 'Résolues'}
            >
              <Icon className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
              <span className="hidden sm:inline">
                {f === 'all' && 'Toutes'}
                {f === 'open' && 'En attente'}
                {f === 'closed' && 'Résolues'}
              </span>
              <span className={cn(
                "text-[10px] xs:text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0",
                filter === f 
                  ? "bg-white/20" 
                  : "bg-gray-200"
              )}>
                {filterCounts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Discussions List */}
      {loading ? (
        <div className="space-y-2.5 xs:space-y-3 w-full max-w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-card shadow-sm p-3 xs:p-4 animate-pulse w-full max-w-full">
              <div className="flex items-start gap-2 xs:gap-3">
                <div className="w-8 h-8 xs:w-10 xs:h-10 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3.5 xs:h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="text-center py-8 xs:py-12 sm:py-16 bg-gray-50 rounded-card px-4 w-full max-w-full">
          <MessageCircle className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 xs:mb-4" />
          <h3 className="text-base xs:text-lg sm:text-xl font-semibold text-gray-600 mb-1.5 xs:mb-2">Aucune discussion</h3>
          <p className="text-xs xs:text-sm text-gray-400 mb-4 xs:mb-6 px-2">
            {searchQuery || filter !== 'all' 
              ? 'Aucune discussion ne correspond à vos critères'
              : 'Soyez le premier à lancer une discussion !'}
          </p>
          {!searchQuery && filter === 'all' && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Créer une discussion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 xs:space-y-3 w-full max-w-full">
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
