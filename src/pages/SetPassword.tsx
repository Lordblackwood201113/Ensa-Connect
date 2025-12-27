import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Password validation
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    // Check if we have a valid session from the invitation link
    const checkSession = async () => {
      try {
        // The hash fragment contains the tokens from Supabase
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Check if this is an invite or recovery flow
        if (type === 'invite' || type === 'recovery' || type === 'magiclink') {
          if (accessToken && refreshToken) {
            // Set the session manually
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Session error:', error);
              setError('Le lien d\'invitation a expiré ou est invalide. Veuillez contacter un administrateur.');
              setVerifying(false);
              return;
            }

            if (data.user) {
              setUserEmail(data.user.email || null);
              setVerifying(false);
              // Clear the hash to avoid issues on page reload
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          }
        }

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User already has a session, check if they need to set password
          const { data: profile } = await supabase
            .from('profiles')
            .select('must_change_password')
            .eq('id', session.user.id)
            .single();

          if (profile?.must_change_password) {
            setUserEmail(session.user.email || null);
            setVerifying(false);
          } else {
            // User doesn't need to set password, redirect to home
            navigate('/home', { replace: true });
          }
        } else {
          // No valid session, redirect to login
          setError('Aucune session valide trouvée. Veuillez utiliser le lien de votre email d\'invitation.');
          setVerifying(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError('Une erreur est survenue. Veuillez réessayer.');
        setVerifying(false);
      }
    };

    checkSession();
  }, [navigate]);

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
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update the profile to mark password as set
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);
      }

      setSuccess(true);

      // Redirect to onboarding or home after a short delay
      setTimeout(() => {
        navigate('/onboarding', { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      let errorMessage = 'Une erreur est survenue lors de la définition du mot de passe.';

      if (err.message?.includes('should be different')) {
        errorMessage = 'Le mot de passe doit être différent de l\'ancien.';
      } else if (err.message?.includes('weak')) {
        errorMessage = 'Le mot de passe est trop faible.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while verifying
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Vérification de votre invitation...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-brand-black mb-2">Mot de passe défini !</h2>
          <p className="text-gray-600 mb-4">
            Votre compte est maintenant activé. Vous allez être redirigé...
          </p>
          <Loader2 className="w-6 h-6 text-brand-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Error state without form (invalid link)
  if (error && !userEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-brand-black mb-2">Lien invalide</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/logo.jpeg" alt="ENSA Connect" className="w-full h-full rounded-2xl object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-brand-black">Bienvenue sur ENSA Connect</h1>
          <p className="text-gray-500 mt-2">Définissez votre mot de passe pour activer votre compte</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Email Display */}
          {userEmail && (
            <div className="bg-gradient-to-r from-brand-primary to-brand-primary/80 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Compte en cours d'activation</p>
                  <p className="font-semibold">{userEmail}</p>
                </div>
              </div>
            </div>
          )}

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
                  placeholder="Entrez votre mot de passe"
                  className="pl-10 pr-10 h-12 rounded-xl"
                  required
                  autoFocus
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
              {loading ? 'Activation en cours...' : 'Activer mon compte'}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              En activant votre compte, vous acceptez les conditions d'utilisation d'ENSA Connect.
            </p>
          </form>
        </div>
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
