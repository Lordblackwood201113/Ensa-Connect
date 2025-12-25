# Workflow: Système de Connexions et Messagerie Instantanée

## Vue d'ensemble

**Projet**: ENSA Connect
**Fonctionnalités**: Connexions entre membres + Messagerie privée
**Stack**: React 19 + TypeScript + Supabase + TailwindCSS 4
**Approche**: Mobile-first, Realtime avec Supabase

---

## PHASE 1: Architecture et Schéma de Base de Données

### 1.1 Tables pour le Système de Connexions

```sql
-- Table des connexions entre membres
CREATE TABLE connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Empêcher les doublons
  UNIQUE(requester_id, receiver_id),
  -- Empêcher de se connecter à soi-même
  CHECK (requester_id != receiver_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);
```

### 1.2 Tables pour la Messagerie

```sql
-- Table des conversations
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants aux conversations
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Index pour la messagerie
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
```

### 1.3 Politiques RLS (Row Level Security)

```sql
-- Connexions: voir ses propres connexions
CREATE POLICY "Users can view own connections"
  ON connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Connexions: créer une demande
CREATE POLICY "Users can create connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Connexions: modifier (accepter/refuser)
CREATE POLICY "Users can update received requests"
  ON connections FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Messages: voir les messages de ses conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Messages: envoyer dans ses conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );
```

---

## PHASE 2: Types TypeScript

### 2.1 Fichier: src/types/index.ts (ajouts)

```typescript
// === CONNEXIONS ===
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  // Relations
  requester?: Profile;
  receiver?: Profile;
}

// === MESSAGERIE ===
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  // Relations
  participants?: ConversationParticipant[];
  messages?: Message[];
  // Computed
  last_message?: Message;
  unread_count?: number;
  other_user?: Profile;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  // Relations
  user?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  // Relations
  sender?: Profile;
}
```

---

## PHASE 3: Services et Hooks

### 3.1 Service Connexions: src/lib/connections.ts

```typescript
import { supabase } from './supabase';
import type { Connection, ConnectionStatus } from '../types';

export const connectionService = {
  // Récupérer toutes les connexions de l'utilisateur
  async getMyConnections(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!requester_id(*),
        receiver:profiles!receiver_id(*)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');
    
    return { data, error };
  },

  // Récupérer les demandes en attente
  async getPendingRequests(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!requester_id(*)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    
    return { data, error };
  },

  // Envoyer une demande de connexion
  async sendRequest(requesterId: string, receiverId: string) {
    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: requesterId, receiver_id: receiverId })
      .select()
      .single();
    
    return { data, error };
  },

  // Répondre à une demande
  async respondToRequest(connectionId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .select()
      .single();
    
    return { data, error };
  },

  // Vérifier le statut entre deux utilisateurs
  async getConnectionStatus(userId1: string, userId2: string) {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .single();
    
    return { data, error };
  },

  // Supprimer une connexion
  async removeConnection(connectionId: string) {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);
    
    return { error };
  }
};
```

### 3.2 Service Messagerie: src/lib/messaging.ts

```typescript
import { supabase } from './supabase';
import type { Conversation, Message } from '../types';

export const messagingService = {
  // Récupérer toutes les conversations
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          *,
          user:profiles(*)
        ),
        messages(
          *,
          sender:profiles(*)
        )
      `)
      .order('updated_at', { ascending: false });
    
    // Filtrer pour ne garder que les conversations où l'utilisateur participe
    const filtered = data?.filter(conv => 
      conv.participants?.some(p => p.user_id === userId)
    );
    
    return { data: filtered, error };
  },

  // Récupérer ou créer une conversation entre deux utilisateurs
  async getOrCreateConversation(userId1: string, userId2: string) {
    // Chercher une conversation existante
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId1);
    
    if (existing) {
      for (const conv of existing) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', userId2)
          .single();
        
        if (otherParticipant) {
          return { data: { id: conv.conversation_id }, error: null };
        }
      }
    }

    // Créer nouvelle conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
    
    if (convError) return { data: null, error: convError };

    // Ajouter les participants
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId1 },
        { conversation_id: newConv.id, user_id: userId2 }
      ]);
    
    return { data: newConv, error: partError };
  },

  // Récupérer les messages d'une conversation
  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data: data?.reverse(), error };
  },

  // Envoyer un message
  async sendMessage(conversationId: string, senderId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content
      })
      .select(`
        *,
        sender:profiles(*)
      `)
      .single();
    
    // Mettre à jour la conversation
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    return { data, error };
  },

  // Marquer comme lu
  async markAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    
    return { error };
  },

  // Souscrire aux nouveaux messages (realtime)
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callback(payload.new as Message)
      )
      .subscribe();
  }
};
```

---

## PHASE 4: Composants UI - Connexions

### 4.1 Structure des fichiers

```
src/components/connections/
├── ConnectionButton.tsx      # Bouton d'action (Se connecter/Annuler/Accepter)
├── ConnectionsList.tsx       # Liste des connexions
├── PendingRequests.tsx       # Demandes en attente
├── ConnectionCard.tsx        # Carte d'une connexion
└── ConnectionsPage.tsx       # Page principale
```

### 4.2 ConnectionButton.tsx (clé)

```typescript
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { UserPlus, UserCheck, Clock, X } from 'lucide-react';
import { connectionService } from '../../lib/connections';
import { useAuth } from '../../context/AuthContext';

interface Props {
  targetUserId: string;
  onStatusChange?: () => void;
}

export function ConnectionButton({ targetUserId, onStatusChange }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'connected' | 'loading'>('loading');
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, [targetUserId]);

  const checkStatus = async () => {
    if (!user) return;
    const { data } = await connectionService.getConnectionStatus(user.id, targetUserId);
    
    if (!data) {
      setStatus('none');
    } else if (data.status === 'accepted') {
      setStatus('connected');
      setConnectionId(data.id);
    } else if (data.status === 'pending') {
      setStatus(data.requester_id === user.id ? 'pending_sent' : 'pending_received');
      setConnectionId(data.id);
    }
  };

  const handleConnect = async () => {
    if (!user) return;
    await connectionService.sendRequest(user.id, targetUserId);
    setStatus('pending_sent');
    onStatusChange?.();
  };

  const handleAccept = async () => {
    if (!connectionId) return;
    await connectionService.respondToRequest(connectionId, 'accepted');
    setStatus('connected');
    onStatusChange?.();
  };

  const handleCancel = async () => {
    if (!connectionId) return;
    await connectionService.removeConnection(connectionId);
    setStatus('none');
    setConnectionId(null);
    onStatusChange?.();
  };

  if (status === 'loading') return null;

  const buttonConfig = {
    none: { icon: UserPlus, text: 'Se connecter', action: handleConnect, variant: 'primary' },
    pending_sent: { icon: Clock, text: 'En attente', action: handleCancel, variant: 'secondary' },
    pending_received: { icon: UserCheck, text: 'Accepter', action: handleAccept, variant: 'primary' },
    connected: { icon: UserCheck, text: 'Connecté', action: handleCancel, variant: 'ghost' },
  };

  const config = buttonConfig[status];

  return (
    <Button 
      variant={config.variant as any} 
      onClick={config.action}
      className="gap-2"
    >
      <config.icon className="w-4 h-4" />
      {config.text}
    </Button>
  );
}
```

---

## PHASE 5: Composants UI - Messagerie

### 5.1 Structure des fichiers

```
src/components/messaging/
├── ConversationsList.tsx     # Liste des conversations
├── ConversationItem.tsx      # Item de conversation
├── ChatWindow.tsx            # Fenêtre de chat
├── MessageBubble.tsx         # Bulle de message
├── MessageInput.tsx          # Zone de saisie
├── MessagingModal.tsx        # Modal de messagerie
└── MessagingPage.tsx         # Page principale
```

### 5.2 ChatWindow.tsx (clé - avec realtime)

```typescript
import { useState, useEffect, useRef } from 'react';
import { messagingService } from '../../lib/messaging';
import { useAuth } from '../../context/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Avatar } from '../ui/Avatar';
import { ArrowLeft } from 'lucide-react';
import type { Message, Profile } from '../../types';

interface Props {
  conversationId: string;
  otherUser: Profile;
  onBack?: () => void;
}

export function ChatWindow({ conversationId, otherUser, onBack }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Souscrire aux nouveaux messages
    const channel = messagingService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      }
    );

    // Marquer comme lu
    if (user) {
      messagingService.markAsRead(conversationId, user.id);
    }

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const loadMessages = async () => {
    const { data } = await messagingService.getMessages(conversationId);
    if (data) setMessages(data);
    setLoading(false);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (content: string) => {
    if (!user) return;
    const { data } = await messagingService.sendMessage(
      conversationId,
      user.id,
      content
    );
    if (data) {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1 lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Avatar src={otherUser.avatar_url || undefined} alt={otherUser.first_name || ''} />
        <div>
          <p className="font-semibold">{otherUser.first_name} {otherUser.last_name}</p>
          <p className="text-xs text-gray-500">{otherUser.job_title || otherUser.promotion}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-brand-black border-t-transparent rounded-full" />
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}
```

### 5.3 MessageBubble.tsx

```typescript
import { cn } from '../../lib/utils';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2",
        isOwn 
          ? "bg-brand-black text-white rounded-br-md" 
          : "bg-white border border-gray-200 rounded-bl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn(
          "text-xs mt-1",
          isOwn ? "text-gray-300" : "text-gray-400"
        )}>
          {time}
        </p>
      </div>
    </div>
  );
}
```

### 5.4 MessageInput.tsx

```typescript
import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
}

export function MessageInput({ onSend }: Props) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    onSend(content.trim());
    setContent('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t bg-white safe-area-bottom">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez un message..."
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple max-h-32"
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-3 bg-brand-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity touch-manipulation"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
```

---

## PHASE 6: Intégration

### 6.1 Nouvelle page Messages: src/pages/Messages.tsx

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagingService } from '../lib/messaging';
import { useAuth } from '../context/AuthContext';
import { ConversationsList } from '../components/messaging/ConversationsList';
import { ChatWindow } from '../components/messaging/ChatWindow';
import { MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Conversation, Profile } from '../types';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  // Ouvrir une conversation depuis l'URL
  useEffect(() => {
    const openWith = searchParams.get('with');
    if (openWith && user) {
      openConversationWith(openWith);
    }
  }, [searchParams, user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await messagingService.getConversations(user.id);
    if (data) {
      // Enrichir avec l'autre utilisateur
      const enriched = data.map(conv => ({
        ...conv,
        other_user: conv.participants?.find(p => p.user_id !== user.id)?.user
      }));
      setConversations(enriched);
    }
    setLoading(false);
  };

  const openConversationWith = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await messagingService.getOrCreateConversation(user.id, otherUserId);
    if (data) {
      // Recharger les conversations
      await loadConversations();
      // Sélectionner la nouvelle conversation
      const conv = conversations.find(c => c.id === data.id);
      if (conv) setSelectedConversation(conv);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl overflow-hidden border border-gray-200">
      {/* Liste des conversations */}
      <div className={cn(
        "w-full lg:w-80 border-r border-gray-200",
        selectedConversation && "hidden lg:block"
      )}>
        <ConversationsList
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelect={setSelectedConversation}
          loading={loading}
        />
      </div>

      {/* Fenêtre de chat */}
      <div className={cn(
        "flex-1",
        !selectedConversation && "hidden lg:flex"
      )}>
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation.id}
            otherUser={selectedConversation.other_user as Profile}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Sélectionnez une conversation</p>
            <p className="text-sm">Ou démarrez-en une nouvelle depuis un profil</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.2 Mise à jour du Router: src/App.tsx

```typescript
// Ajouter l'import
import Messages from './pages/Messages';
import Connections from './pages/Connections';

// Ajouter les routes
<Route path="/messages" element={
  <DashboardLayout>
    <Messages />
  </DashboardLayout>
} />
<Route path="/connections" element={
  <DashboardLayout>
    <Connections />
  </DashboardLayout>
} />
```

### 6.3 Mise à jour du Sidebar

Ajouter les liens vers Messages et Connexions dans le menu de navigation.

### 6.4 Intégration sur ProfileView

Ajouter les boutons "Se connecter" et "Envoyer un message" sur la page de profil d'un membre.

---

## Checklist d'implémentation

### Backend (Supabase)
- [ ] Créer table `connections`
- [ ] Créer table `conversations`
- [ ] Créer table `conversation_participants`
- [ ] Créer table `messages`
- [ ] Configurer les index
- [ ] Configurer les policies RLS
- [ ] Activer Realtime sur `messages`

### Frontend - Types
- [ ] Ajouter types Connection
- [ ] Ajouter types Conversation, Message

### Frontend - Services
- [ ] Créer `src/lib/connections.ts`
- [ ] Créer `src/lib/messaging.ts`

### Frontend - Composants Connexions
- [ ] ConnectionButton
- [ ] ConnectionCard
- [ ] ConnectionsList
- [ ] PendingRequests
- [ ] Page Connections

### Frontend - Composants Messagerie
- [ ] ConversationsList
- [ ] ConversationItem
- [ ] ChatWindow
- [ ] MessageBubble
- [ ] MessageInput
- [ ] Page Messages

### Intégration
- [ ] Ajouter routes dans App.tsx
- [ ] Mettre à jour Sidebar
- [ ] Intégrer sur ProfileView
- [ ] Ajouter notifications

---

## Estimation

| Phase | Complexité | Durée estimée |
|-------|------------|---------------|
| Phase 1 - DB | Moyenne | 2-3h |
| Phase 2 - Types | Faible | 30min |
| Phase 3 - Services | Moyenne | 2-3h |
| Phase 4 - UI Connexions | Moyenne | 3-4h |
| Phase 5 - UI Messagerie | Haute | 5-6h |
| Phase 6 - Intégration | Moyenne | 2-3h |

**Total estimé: 15-20 heures de développement**
