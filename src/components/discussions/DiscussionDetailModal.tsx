import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, CheckCircle2, Clock, Lock, Trash2, MessageCircle, MoreVertical } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import type { Discussion, Reply } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface DiscussionDetailModalProps {
  discussion: Discussion | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function DiscussionDetailModal({ discussion, isOpen, onClose, onUpdate }: DiscussionDetailModalProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (discussion && isOpen) {
      fetchReplies();
    }
  }, [discussion, isOpen]);

  // Scroll to bottom when new replies are added
  useEffect(() => {
    if (replies.length > 0) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies.length]);

  // Handle keyboard on mobile - scroll input into view
  useEffect(() => {
    if (isInputFocused && contentRef.current) {
      // Small delay to let keyboard appear
      const timer = setTimeout(() => {
        contentRef.current?.scrollTo({
          top: contentRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInputFocused]);

  // Close actions menu when clicking outside
  useEffect(() => {
    if (showActionsMenu) {
      const handleClick = () => setShowActionsMenu(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showActionsMenu]);

  const fetchReplies = async () => {
    if (!discussion) return;
    
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from('replies')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, promotion)
        `)
        .eq('discussion_id', discussion.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !discussion || !newReply.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('replies')
        .insert({
          content: newReply.trim(),
          discussion_id: discussion.id,
          author_id: user.id
        });

      if (error) throw error;

      await createNotificationsForParticipants();

      setNewReply('');
      fetchReplies();
      onUpdate();
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setLoading(false);
    }
  };

  const createNotificationsForParticipants = async () => {
    if (!user || !discussion) return;

    try {
      const { data: existingReplies } = await supabase
        .from('replies')
        .select('author_id')
        .eq('discussion_id', discussion.id);

      const participantIds = new Set<string>();
      participantIds.add(discussion.author_id);
      existingReplies?.forEach(reply => {
        participantIds.add(reply.author_id);
      });
      participantIds.delete(user.id);

      const notifications = Array.from(participantIds).map(userId => ({
        user_id: userId,
        type: 'discussion_reply',
        title: 'Nouvelle réponse',
        message: `${user.user_metadata?.first_name || 'Quelqu\'un'} a répondu à la discussion "${discussion.title.substring(0, 50)}${discussion.title.length > 50 ? '...' : ''}"`,
        link: `/discussions?open=${discussion.id}`,
        is_read: false,
        discussion_id: discussion.id,
        triggered_by_id: user.id
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  const handleCloseDiscussion = async () => {
    if (!discussion) return;

    try {
      const { error } = await supabase
        .from('discussions')
        .update({ is_closed: true })
        .eq('id', discussion.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error closing discussion:', error);
      alert('Erreur lors de la fermeture de la discussion');
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!discussion) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette discussion ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussion.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting discussion:', error);
      alert('Erreur lors de la suppression de la discussion');
    }
  };

  if (!discussion) return null;

  const isAuthor = user?.id === discussion.author_id;
  const timeAgo = formatDistanceToNow(new Date(discussion.created_at));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discussion" size="lg">
      <div className="flex flex-col h-full">
        {/* Main Content - Scrollable */}
        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* Question Header - Mobile optimized with actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {discussion.is_closed ? (
                <Badge variant="success" className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden xs:inline">Résolu</span>
                </Badge>
              ) : (
                <Badge variant="neutral" className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  <span className="hidden xs:inline">En attente</span>
                </Badge>
              )}
              <span className="text-xs text-gray-400">{timeAgo}</span>
            </div>

            {/* Mobile actions menu */}
            {isAuthor && (
              <div className="relative sm:hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionsMenu(!showActionsMenu);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                >
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 min-w-[160px]">
                    {!discussion.is_closed && (
                      <button
                        onClick={handleCloseDiscussion}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marquer résolu
                      </button>
                    )}
                    <button
                      onClick={handleDeleteDiscussion}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-brand-black mb-4 leading-tight">
            {discussion.title}
          </h2>

          {/* Original Question - Compact on mobile */}
          <div className="bg-gray-50 rounded-xl p-3.5 sm:p-5 mb-5 sm:mb-6">
            <Link
              to={`/member/${discussion.author?.id}`}
              onClick={onClose}
              className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 hover:opacity-80 transition-opacity"
            >
              <Avatar
                src={discussion.author?.avatar_url || undefined}
                alt={discussion.author?.first_name || 'Auteur'}
                size="sm"
                className="w-8 h-8 sm:w-10 sm:h-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold text-brand-black text-sm sm:text-base truncate">
                  {discussion.author?.first_name} {discussion.author?.last_name}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500">
                  {discussion.author?.promotion || 'Membre ENSA'}
                </p>
              </div>
            </Link>
            <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">
              {discussion.content}
            </p>
          </div>

          {/* Replies Section */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <MessageCircle className="w-4 h-4" />
              {replies.length} réponse{replies.length !== 1 ? 's' : ''}
            </h3>

            {loadingReplies ? (
              <div className="space-y-2.5 sm:space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl p-3 sm:p-4 animate-pulse h-20 sm:h-24" />
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-400">
                <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">Aucune réponse pour le moment</p>
                <p className="text-xs sm:text-sm">Soyez le premier à répondre !</p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 active:bg-gray-50 transition-colors"
                  >
                    <Link
                      to={`/member/${reply.author?.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 sm:gap-3 mb-2 hover:opacity-80 transition-opacity"
                    >
                      <Avatar
                        src={reply.author?.avatar_url || undefined}
                        alt={reply.author?.first_name || 'Auteur'}
                        size="sm"
                        className="w-6 h-6 sm:w-8 sm:h-8 shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <p className="font-medium text-brand-black text-sm truncate">
                          {reply.author?.first_name} {reply.author?.last_name}
                        </p>
                        <span className="text-[10px] sm:text-xs text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(reply.created_at))}
                        </span>
                      </div>
                    </Link>
                    <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed ml-8 sm:ml-11">
                      {reply.content}
                    </p>
                  </div>
                ))}
                <div ref={repliesEndRef} />
              </div>
            )}
          </div>

          {/* Spacer for mobile keyboard */}
          <div className={`sm:hidden transition-all duration-200 ${isInputFocused ? 'h-8' : 'h-0'}`} />
        </div>

        {/* Footer - Reply Form or Closed Message */}
        <div className="border-t border-gray-100 p-3 sm:p-4 bg-white shrink-0 safe-area-inset-bottom">
          {discussion.is_closed ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Cette discussion est fermée</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitReply} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Écrire une réponse..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 sm:py-3 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all touch-manipulation"
                  autoComplete="off"
                  enterKeyHint="send"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newReply.trim()}
                className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-brand-black text-white rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </form>
          )}

          {/* Author Actions - Desktop only (mobile uses menu) */}
          {isAuthor && (
            <div className="hidden sm:flex mt-3 pt-3 border-t border-gray-200 gap-2">
              {!discussion.is_closed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-green-600 hover:bg-green-50"
                  onClick={handleCloseDiscussion}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span className="text-sm">Marquer résolu</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`${discussion.is_closed ? 'flex-1' : ''} text-red-600 hover:bg-red-50`}
                onClick={handleDeleteDiscussion}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span className="text-sm">Supprimer</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
