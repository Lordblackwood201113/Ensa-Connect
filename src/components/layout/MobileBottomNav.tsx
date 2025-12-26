import { NavLink, useLocation } from 'react-router-dom';
import { 
  House, 
  CalendarDots, 
  Briefcase, 
  UsersThree,
  List,
  X
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

interface NavItem {
  icon: React.ElementType;
  iconFilled: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: House, iconFilled: House, label: 'Accueil', path: '/home' },
  { icon: CalendarDots, iconFilled: CalendarDots, label: 'Événements', path: '/events' },
  { icon: Briefcase, iconFilled: Briefcase, label: 'Emploi', path: '/jobs' },
  { icon: UsersThree, iconFilled: UsersThree, label: 'Annuaire', path: '/dashboard' },
];

interface MobileBottomNavProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export function MobileBottomNav({ isMenuOpen, onMenuToggle }: MobileBottomNavProps) {
  const location = useLocation();

  // Don't show on conversation pages (needs full screen)
  if (location.pathname.startsWith('/messages/')) {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-lg transition-all touch-manipulation',
                isActive
                  ? 'text-brand-primary'
                  : 'text-gray-400 hover:text-gray-600 active:bg-gray-100'
              )}
            >
              <div className="relative">
                <item.icon
                  size={24}
                  weight={isActive ? 'duotone' : 'regular'}
                  className={cn(
                    'transition-all',
                    isActive && 'scale-110'
                  )}
                />
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium transition-all',
                  isActive ? 'text-brand-primary' : 'text-gray-500'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* Menu Button - Toggle open/close */}
        <button
          onClick={onMenuToggle}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-lg transition-all touch-manipulation",
            isMenuOpen
              ? "text-brand-primary"
              : "text-gray-400 hover:text-gray-600 active:bg-gray-100"
          )}
        >
          <div className="relative">
            {isMenuOpen ? (
              <X size={24} weight="bold" />
            ) : (
              <List size={24} weight={isMenuOpen ? 'duotone' : 'regular'} />
            )}
            {isMenuOpen && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full" />
            )}
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium transition-all",
            isMenuOpen ? "text-brand-primary" : "text-gray-500"
          )}>
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
