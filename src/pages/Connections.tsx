import { useState, useEffect } from 'react';
import { connectionService } from '../lib/connections';
import { useAuth } from '../context/AuthContext';
import { ConnectionCard } from '../components/connections/ConnectionCard';
import { PendingRequestCard } from '../components/connections/PendingRequestCard';
import { SentRequestCard } from '../components/connections/SentRequestCard';
import { Card } from '../components/ui/Card';
import { Users, UserPlus, Search, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Connection, Profile } from '../types';

type TabType = 'connections' | 'pending' | 'sent';

export default function Connections() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const [connectionsRes, pendingRes, sentRes] = await Promise.all([
      connectionService.getMyConnections(user.id),
      connectionService.getPendingRequests(user.id),
      connectionService.getSentRequests(user.id)
    ]);
    
    if (connectionsRes.data) setConnections(connectionsRes.data);
    if (pendingRes.data) setPendingRequests(pendingRes.data);
    if (sentRes.data) setSentRequests(sentRes.data);
    
    setLoading(false);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!window.confirm('Voulez-vous vraiment retirer cette connexion ?')) return;
    
    await connectionService.removeConnection(connectionId);
    loadData();
  };

  // Extraire le profil de l'autre utilisateur depuis une connexion
  const getOtherUser = (connection: Connection): Profile | null => {
    if (!user) return null;
    if (connection.requester_id === user.id) {
      return connection.receiver || null;
    }
    return connection.requester || null;
  };

  // Filtrer les connexions par recherche
  const filteredConnections = connections.filter(conn => {
    if (!searchQuery.trim()) return true;
    
    const other = getOtherUser(conn);
    if (!other) return false;
    
    const fullName = `${other.first_name} ${other.last_name}`.toLowerCase();
    const company = (other.company || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || company.includes(query);
  });

  const tabs = [
    { 
      id: 'connections' as const, 
      label: 'Connexions', 
      icon: Users, 
      count: connections.length 
    },
    { 
      id: 'pending' as const, 
      label: 'Reçues', 
      icon: UserPlus, 
      count: pendingRequests.length,
      highlight: pendingRequests.length > 0
    },
    { 
      id: 'sent' as const, 
      label: 'Envoyées', 
      icon: Clock, 
      count: sentRequests.length 
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-6 pb-20 sm:pb-10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-brand-black truncate">Connexions</h1>
          <p className="text-xs xs:text-sm text-gray-500 hidden sm:block">Gérez votre réseau professionnel</p>
        </div>
        {/* Connection count badge - mobile */}
        <div className="sm:hidden bg-brand-lime/20 text-brand-black px-2 xs:px-2.5 py-1 rounded-full text-[10px] xs:text-xs font-medium whitespace-nowrap shrink-0">
          {connections.length} connexion{connections.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabs - More compact on mobile */}
      <div className="flex gap-1 xs:gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1 xs:gap-1.5 px-2.5 xs:px-3 sm:px-4 py-2 xs:py-2.5 rounded-full text-[11px] xs:text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 shrink-0",
              activeTab === tab.id
                ? "bg-brand-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
            )}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">{tab.label}</span>
            <span className={cn(
              "text-[10px] xs:text-xs px-1.5 py-0.5 rounded-full min-w-[16px] xs:min-w-[18px] text-center",
              activeTab === tab.id
                ? "bg-white/20"
                : tab.highlight
                  ? "bg-brand-purple text-white"
                  : "bg-gray-200"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recherche (seulement pour les connexions) - Mobile optimized */}
      {activeTab === 'connections' && connections.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 xs:py-3 pl-9 xs:pl-10 pr-9 xs:pr-10 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all touch-manipulation"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 xs:right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="space-y-2.5 xs:space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-3 xs:p-4 animate-pulse">
              <div className="flex items-center gap-2.5 xs:gap-3">
                <div className="w-10 h-10 xs:w-12 xs:h-12 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 xs:h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Tab: Connexions */}
          {activeTab === 'connections' && (
            filteredConnections.length > 0 ? (
              <div className="space-y-2.5 xs:space-y-3">
                {filteredConnections.map(connection => {
                  const otherUser = getOtherUser(connection);
                  if (!otherUser) return null;

                  return (
                    <ConnectionCard
                      key={connection.id}
                      profile={otherUser}
                      onRemove={() => handleRemoveConnection(connection.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Aucune connexion"
                description={searchQuery
                  ? "Aucun résultat pour cette recherche"
                  : "Commencez à vous connecter avec d'autres membres depuis l'annuaire"
                }
              />
            )
          )}

          {/* Tab: Demandes reçues */}
          {activeTab === 'pending' && (
            pendingRequests.length > 0 ? (
              <div className="space-y-2.5 xs:space-y-3">
                {pendingRequests.map(request => (
                  <PendingRequestCard
                    key={request.id}
                    connection={request}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Aucune demande"
                description="Vous n'avez pas de demande de connexion en attente"
              />
            )
          )}

          {/* Tab: Demandes envoyées */}
          {activeTab === 'sent' && (
            sentRequests.length > 0 ? (
              <div className="space-y-2.5 xs:space-y-3">
                {sentRequests.map(request => (
                  <SentRequestCard
                    key={request.id}
                    connection={request}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="Aucune demande envoyée"
                description="Vos demandes de connexion en attente apparaîtront ici"
              />
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-8 xs:py-10 sm:py-16 bg-gray-50 rounded-2xl px-4">
      <Icon className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 xs:mb-4" />
      <h3 className="text-sm xs:text-base sm:text-xl font-semibold text-gray-600 mb-1.5 xs:mb-2">{title}</h3>
      <p className="text-xs xs:text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}
