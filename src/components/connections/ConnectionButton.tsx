import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { UserPlus, UserCheck, Clock, UserMinus, Loader2 } from 'lucide-react';
import { connectionService } from '../../lib/connections';
import { useAuth } from '../../context/AuthContext';

interface ConnectionButtonProps {
  targetUserId: string;
  onStatusChange?: () => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

type ConnectionState = 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'loading';

export function ConnectionButton({ 
  targetUserId, 
  onStatusChange,
  size = 'md',
  showLabel = true 
}: ConnectionButtonProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionState>('loading');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (user && targetUserId && user.id !== targetUserId) {
      checkStatus();
    }
  }, [user, targetUserId]);

  const checkStatus = async () => {
    if (!user) return;
    
    const result = await connectionService.getConnectionStatus(user.id, targetUserId);
    
    setStatus(result.status);
    setConnectionId(result.data?.id || null);
  };

  const handleConnect = async () => {
    if (!user || isActioning) return;
    setIsActioning(true);
    
    try {
      const { data, error } = await connectionService.sendRequest(user.id, targetUserId);
      if (!error && data) {
        setStatus('pending_sent');
        setConnectionId(data.id);
        onStatusChange?.();
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleAccept = async () => {
    if (!connectionId || isActioning) return;
    setIsActioning(true);
    
    try {
      const { error } = await connectionService.respondToRequest(connectionId, 'accepted');
      if (!error) {
        setStatus('connected');
        onStatusChange?.();
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleCancel = async () => {
    if (!connectionId || isActioning) return;
    setIsActioning(true);
    
    try {
      const { error } = await connectionService.removeConnection(connectionId);
      if (!error) {
        setStatus('none');
        setConnectionId(null);
        onStatusChange?.();
      }
    } finally {
      setIsActioning(false);
    }
  };

  // Ne pas afficher si c'est le profil de l'utilisateur courant
  if (!user || user.id === targetUserId) return null;
  
  if (status === 'loading') {
    return (
      <Button variant="ghost" size={size} disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  const configs = {
    none: {
      icon: UserPlus,
      label: 'Se connecter',
      variant: 'primary' as const,
      action: handleConnect
    },
    pending_sent: {
      icon: Clock,
      label: 'En attente',
      variant: 'secondary' as const,
      action: handleCancel
    },
    pending_received: {
      icon: UserCheck,
      label: 'Accepter',
      variant: 'primary' as const,
      action: handleAccept
    },
    connected: {
      icon: UserMinus,
      label: 'Connecté',
      variant: 'ghost' as const,
      action: handleCancel
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  // Mode icône seule avec style discret
  if (!showLabel) {
    const iconStyles = {
      none: 'text-gray-500 hover:text-brand-lime hover:border-brand-lime hover:bg-brand-lime/5',
      pending_sent: 'text-amber-500 border-amber-200 bg-amber-50',
      pending_received: 'text-brand-purple hover:text-brand-purple hover:border-brand-purple hover:bg-brand-purple/5',
      connected: 'text-green-500 border-green-200 bg-green-50'
    };

    return (
      <button
        onClick={config.action}
        disabled={isActioning}
        className={`p-2.5 rounded-full border border-gray-200 transition-all touch-manipulation active:scale-95 disabled:opacity-50 ${iconStyles[status]}`}
        title={config.label}
      >
        {isActioning ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <Button
      variant={config.variant}
      size={size}
      onClick={config.action}
      disabled={isActioning}
      className="gap-2"
    >
      {isActioning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span>{config.label}</span>
    </Button>
  );
}
