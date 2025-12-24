import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users } from 'lucide-react';
import { Button } from '../ui/Button';

export function EmptyMessages() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <MessageCircle className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Aucune conversation
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Vous n'avez pas encore de messages. Connectez-vous avec d'autres membres pour commencer à échanger.
      </p>
      <Button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2">
        <Users className="w-4 h-4" />
        Explorer l'annuaire
      </Button>
    </div>
  );
}
