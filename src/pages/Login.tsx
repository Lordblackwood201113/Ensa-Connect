import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleOAuthLogin = async (provider: 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
          scopes: 'email profile openid',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
            }
          }
        });
        if (error) throw error;
        alert('Inscription réussie ! Vérifiez vos emails pour confirmer.');
      }
    } catch (err: any) {
      let errorMessage = err.message;
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = 'Email ou mot de passe incorrect.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-brand-lime/30">
      {/* Left Side - Branding & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A0A0A] relative flex-col justify-between p-16 text-white overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-lime rounded-full blur-[160px] mix-blend-screen animate-pulse duration-[4s]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-purple rounded-full blur-[140px] opacity-60" />
        </div>

        {/* Glass Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-lime/20">
                    <img src="/logo.jpeg" alt="Logo" className="w-full h-full rounded-xl object-cover" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">ENSA Connect</span>
            </div>
            
            <div className="max-w-2xl">
                <h1 className="text-7xl font-extrabold leading-[1.1] mb-8 tracking-tight">
                    Votre réseau,<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime to-white">votre avenir.</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-lg leading-relaxed font-light mb-12">
                    Rejoignez la communauté exclusive des anciens élèves de l'ENSA. Partagez, collaborez et évoluez ensemble.
                </p>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-brand-lime/10 flex items-center justify-center text-brand-lime">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span>Accès exclusif à l'annuaire des alumni</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-brand-lime/10 flex items-center justify-center text-brand-lime">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span>Offres d'emploi et stages ciblés</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-brand-lime/10 flex items-center justify-center text-brand-lime">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span>Événements networking et afterworks</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-gray-50/50 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-lime/5 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[24px] shadow-xl shadow-brand-black/5 border border-white relative z-10">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold text-brand-black mb-3 tracking-tight">
                    {isLogin ? 'Bon retour 👋' : 'Créer un compte'}
                </h2>
                <p className="text-gray-500 text-lg">
                    {isLogin ? 'Accédez à votre espace personnel' : 'Rejoignez la communauté ENSA Connect'}
                </p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-6">
                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {error}
                    </div>
                )}

                {!isLogin && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Prénom</label>
                            <Input 
                                required
                                placeholder="Jean" 
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="bg-gray-50 border-gray-100 focus:bg-white focus:border-brand-lime/50 rounded-xl h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Nom</label>
                            <Input 
                                required
                                placeholder="Dupont" 
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="bg-gray-50 border-gray-100 focus:bg-white focus:border-brand-lime/50 rounded-xl h-12"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Email professionnel</label>
                    <Input 
                        type="email"
                        required
                        placeholder="nom@exemple.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-50 border-gray-100 focus:bg-white focus:border-brand-lime/50 rounded-xl h-12"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
                        {isLogin && <a href="#" className="text-xs font-medium text-gray-500 hover:text-brand-black hover:underline transition-colors">Mot de passe oublié ?</a>}
                    </div>
                    <Input 
                        type="password"
                        required
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-50 border-gray-100 focus:bg-white focus:border-brand-lime/50 rounded-xl h-12"
                    />
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-bold shadow-xl shadow-brand-black/10 hover:shadow-2xl hover:shadow-brand-lime/20" disabled={loading}>
                    {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
                    {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400 font-medium">Ou continuer avec</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Button 
                    variant="outline"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full h-14 text-base font-semibold group"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform mr-2" />
                    Continuer avec Google
                </Button>
            </div>

            <div className="mt-10 text-center">
                <p className="text-gray-500">
                    {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="ml-2 font-bold text-brand-black hover:text-brand-purple transition-colors hover:underline decoration-2 underline-offset-4"
                    >
                        {isLogin ? "Créer un compte" : "Se connecter"}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}