import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users } from 'lucide-react';

export function EmptyMessages() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100 shadow-sm">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
        <MessageCircle className="w-7 h-7 sm:w-9 sm:h-9 text-brand-primary" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-brand-black mb-2">
        Aucune conversation
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
        Connectez-vous avec d'autres membres pour commencer à échanger.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl active:scale-[0.98] transition-transform touch-manipulation"
      >
        <Users className="w-4 h-4" />
        <span>Explorer l'annuaire</span>
      </button>
    </div>
  );
}
