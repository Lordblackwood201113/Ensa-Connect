import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si le profil n'est pas encore chargé, on attend
  if (!profile) {
     // Si le chargement est terminé mais qu'on a pas de profil, c'est qu'il y a eu une erreur
     // ou que la création automatique a échoué.
     // On ne redirige PAS vers l'onboarding ici pour éviter les boucles si l'API échoue.
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Impossible de charger le profil</h2>
            <p className="text-gray-600 mb-6">Une erreur est survenue lors de la récupération de vos informations.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-brand-black text-white px-6 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
     );
  }

  // Redirection vers l'onboarding uniquement si le flag n'est pas à true
  if (!profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

