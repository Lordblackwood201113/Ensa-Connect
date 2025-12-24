import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal';

interface PasswordChangeGuardProps {
  children: React.ReactNode;
}

export function PasswordChangeGuard({ children }: PasswordChangeGuardProps) {
  const { mustChangePassword, user, loading } = useAuth();
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Ne pas afficher le modal pendant le chargement ou si pas d'utilisateur
  if (loading || !user) {
    return <>{children}</>;
  }

  // Afficher le modal si l'utilisateur doit changer son mot de passe
  if (mustChangePassword && !passwordChanged) {
    return (
      <>
        {children}
        <ForcePasswordChangeModal onSuccess={() => setPasswordChanged(true)} />
      </>
    );
  }

  return <>{children}</>;
}
