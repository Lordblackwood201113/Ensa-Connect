import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Avatar';
import { CircularProgress } from '../components/ui/CircularProgress';
import {
  CalendarDots,
  UsersThree,
  Briefcase,
  ChatTeardropDots,
  UserPlus,
  GraduationCap,
  ArrowRight,
  Sparkle
} from '@phosphor-icons/react';

interface QuickAccessCard {
  icon: React.ElementType;
  label: string;
  path: string;
  description: string;
  gradient: string;
}

const quickAccessItems: QuickAccessCard[] = [
  {
    icon: CalendarDots,
    label: 'Événements',
    path: '/events',
    description: 'Découvrez les prochains événements',
    gradient: 'from-brand-primary/20 to-brand-primary/5'
  },
  {
    icon: UsersThree,
    label: 'Annuaire',
    path: '/dashboard',
    description: 'Explorez le réseau des alumni',
    gradient: 'from-brand-secondary/20 to-brand-secondary/5'
  },
  {
    icon: Briefcase,
    label: 'Emploi',
    path: '/jobs',
    description: 'Offres et opportunités',
    gradient: 'from-brand-primary/20 to-brand-primary/5'
  },
  {
    icon: ChatTeardropDots,
    label: 'Discussions',
    path: '/discussions',
    description: 'Échangez avec la communauté',
    gradient: 'from-brand-secondary/20 to-brand-secondary/5'
  },
  {
    icon: GraduationCap,
    label: 'Ma Promo',
    path: '/promo',
    description: 'Retrouvez votre promotion',
    gradient: 'from-brand-primary/20 to-brand-primary/5'
  },
  {
    icon: UserPlus,
    label: 'Connexions',
    path: '/connections',
    description: 'Gérez vos contacts',
    gradient: 'from-brand-secondary/20 to-brand-secondary/5'
  }
];

export default function Home() {
  const { profile } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="min-h-full -m-4 sm:-m-6 lg:-m-8">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-dark" />

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-20">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Sparkle size={16} weight="duotone" className="text-white" />
              <span className="text-white text-sm font-medium">ENSA Connect</span>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Avatar with ring */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm" />
              <Avatar
                src={profile?.avatar_url || undefined}
                alt={profile?.first_name || 'User'}
                size="xl"
                className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white/50 relative"
              />
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white" />
            </div>

            {/* Welcome Text */}
            <div className="pt-1">
              <p className="text-white/80 text-sm sm:text-base mb-1">
                {getGreeting()},
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                {profile?.first_name || 'Utilisateur'}{' '}
                <span className="text-white/90">{profile?.last_name || ''}</span>
              </h1>

              {/* Profile Link */}
              <Link
                to={`/member/${profile?.id}`}
                className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm sm:text-base font-medium group transition-colors"
              >
                Voir votre profil
                <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mt-8 sm:mt-10">
            {/* Promotion Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <GraduationCap size={28} weight="duotone" className="text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {profile?.promotion?.replace('ENSA ', '') || '—'}
                  </p>
                  <p className="text-white/70 text-xs sm:text-sm">Promotion ENSA</p>
                </div>
              </div>
            </div>
            
            {/* Completion Score Card with Circular Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  value={profile?.completion_score || 0}
                  size={56}
                  strokeWidth={5}
                  animationDuration={1200}
                />
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">
                    {(profile?.completion_score || 0) < 100 ? 'Profil' : 'Profil à jour'}
                  </p>
                  {(profile?.completion_score || 0) < 100 && (
                    <p className="text-white/70 text-xs sm:text-sm">
                      À compléter
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
            <path
              d="M0 80V60C240 20 480 0 720 0C960 0 1200 20 1440 60V80H0Z"
              fill="#F9FAFB"
            />
          </svg>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8 bg-gray-50">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-brand-black">
            Accès directs
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {quickAccessItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group bg-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg border border-gray-100 hover:border-brand-primary/30 transition-all duration-300 active:scale-[0.98]"
            >
              {/* Icon */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={28} weight="duotone" className="text-brand-secondary" />
              </div>

              {/* Text */}
              <h3 className="font-semibold text-brand-black text-sm sm:text-base mb-1 group-hover:text-brand-primary transition-colors">
                {item.label}
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 hidden sm:block">
                {item.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Quick Tips Card - Hidden when profile is 100% complete */}
        {(profile?.completion_score || 0) < 100 && (
          <div className="mt-6 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-2xl p-4 sm:p-6 border border-brand-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                <Sparkle size={20} weight="duotone" className="text-brand-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-black mb-1">
                  Complétez votre profil
                </h3>
                <p className="text-gray-600 text-sm">
                  Un profil complet augmente vos chances d'être trouvé par d'autres alumni et recruteurs.
                </p>
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-1 text-brand-primary font-medium text-sm mt-2 hover:underline"
                >
                  Modifier mon profil
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
