import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({ onSuccess }: ForcePasswordChangeModalProps) {
  const { user, refreshProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation du mot de passe
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères de sécurité.');
      return;
    }

    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mettre à jour le mot de passe via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Mettre à jour le flag must_change_password dans le profil
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Rafraîchir le profil
      await refreshProfile();

      onSuccess();
    } catch (err: any) {
      console.error('Error updating password:', err);
      let errorMessage = 'Une erreur est survenue lors du changement de mot de passe.';

      if (err.message?.includes('should be different')) {
        errorMessage = 'Le nouveau mot de passe doit être différent de l\'ancien.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-purple to-brand-purple/80 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Changement de mot de passe requis</h2>
          </div>
          <p className="text-white/80 text-sm">
            Pour des raisons de sécurité, veuillez définir un nouveau mot de passe personnel.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrez votre nouveau mot de passe"
                className="pl-10 pr-10 h-12 rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Criteria */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <PasswordCheck label="8 caractères min" checked={passwordChecks.minLength} />
              <PasswordCheck label="Une majuscule" checked={passwordChecks.hasUppercase} />
              <PasswordCheck label="Une minuscule" checked={passwordChecks.hasLowercase} />
              <PasswordCheck label="Un chiffre" checked={passwordChecks.hasNumber} />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className={`pl-10 pr-10 h-12 rounded-xl ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-300 focus:border-red-500'
                    : confirmPassword && passwordsMatch
                      ? 'border-green-300 focus:border-green-500'
                      : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-500 mt-1">Les mots de passe correspondent</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={loading || !isPasswordValid || !passwordsMatch}
          >
            {loading ? 'Changement en cours...' : 'Définir mon nouveau mot de passe'}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Ce changement est obligatoire pour continuer à utiliser l'application.
          </p>
        </form>
      </div>
    </div>
  );
}

function PasswordCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${checked ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${checked ? 'bg-green-500' : 'bg-gray-300'}`} />
      {label}
    </div>
  );
}
