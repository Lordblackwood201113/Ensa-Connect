import { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, Clock, Lock, Trash2, MessageCircle } from 'lucide-react';
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
  const repliesEndRef = useRef<HTMLDivElement>(null);

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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Question Header */}
          <div className="flex items-center gap-2 mb-3">
            {discussion.is_closed ? (
              <Badge variant="success" className="flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Résolu
              </Badge>
            ) : (
              <Badge variant="neutral" className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                En attente
              </Badge>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-brand-black mb-4">
            {discussion.title}
          </h2>

          {/* Original Question */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-6">
            <Link 
              to={`/member/${discussion.author?.id}`}
              onClick={onClose}
              className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
            >
              <Avatar 
                src={discussion.author?.avatar_url || undefined} 
                alt={discussion.author?.first_name || 'Auteur'} 
                size="sm"
                className="w-9 h-9 sm:w-10 sm:h-10"
              />
              <div>
                <p className="font-semibold text-brand-black text-sm sm:text-base">
                  {discussion.author?.first_name} {discussion.author?.last_name}
                </p>
                <p className="text-xs text-gray-500">{timeAgo}</p>
              </div>
            </Link>
            <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">
              {discussion.content}
            </p>
          </div>

          {/* Replies Section */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {replies.length} réponse{replies.length !== 1 ? 's' : ''}
            </h3>

            {loadingReplies ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse h-24" />
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune réponse pour le moment</p>
                <p className="text-sm">Soyez le premier à répondre !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
                    <Link 
                      to={`/member/${reply.author?.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 sm:gap-3 mb-2 hover:opacity-80 transition-opacity"
                    >
                      <Avatar 
                        src={reply.author?.avatar_url || undefined} 
                        alt={reply.author?.first_name || 'Auteur'} 
                        size="sm"
                        className="w-7 h-7 sm:w-8 sm:h-8"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-black text-sm truncate">
                          {reply.author?.first_name} {reply.author?.last_name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {formatDistanceToNow(new Date(reply.created_at))}
                        </p>
                      </div>
                    </Link>
                    <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed ml-9 sm:ml-11">
                      {reply.content}
                    </p>
                  </div>
                ))}
                <div ref={repliesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Footer - Reply Form or Closed Message */}
        <div className="border-t border-gray-100 p-3 sm:p-4 bg-white shrink-0">
          {discussion.is_closed ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Cette discussion est fermée</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitReply} className="flex gap-2 sm:gap-3">
              <Input
                type="text"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Écrire une réponse..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={loading || !newReply.trim()}
                className="shrink-0 px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Author Actions */}
          {isAuthor && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
              {!discussion.is_closed && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex-1 text-green-600 hover:bg-green-50"
                  onClick={handleCloseDiscussion}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span className="text-xs sm:text-sm">Marquer résolu</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className={`${discussion.is_closed ? 'flex-1' : ''} text-red-600 hover:bg-red-50`}
                onClick={handleDeleteDiscussion}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span className="text-xs sm:text-sm">Supprimer</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
