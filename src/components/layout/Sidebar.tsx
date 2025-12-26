import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  House, 
  UsersThree, 
  GraduationCap, 
  CalendarDots, 
  Briefcase, 
  ChatTeardropDots, 
  UserPlus, 
  SignOut, 
  CaretLeft, 
  CaretRight, 
  X,
  EnvelopeSimple
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { connectionService } from '../../lib/connections';
import { messageService } from '../../lib/messages';

import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen?: boolean;
  closeMobileSidebar?: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen = false, closeMobileSidebar }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);


  useEffect(() => {
    if (user) {
      loadCounts();
      // Rafraîchir les compteurs toutes les 30 secondes
      const interval = setInterval(loadCounts, 30000);

      // S'abonner aux nouveaux messages pour mise à jour en temps réel
      const channel = supabase
        .channel('sidebar_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => loadCounts()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => loadCounts()
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadCounts = async () => {
    if (!user) return;

    const pendingRes = await connectionService.getPendingCount(user.id);
    setPendingCount(pendingRes.count);

    const unreadCount = await messageService.getUnreadCount(user.id);
    setUnreadMessages(unreadCount);
  };

  const navItems = [
    { icon: House, label: 'Accueil', path: '/home' },
    { icon: UsersThree, label: 'Annuaire', path: '/dashboard' },
    { icon: GraduationCap, label: 'Ma Promo', path: '/promo' },
    { icon: CalendarDots, label: 'Événements', path: '/events' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { icon: ChatTeardropDots, label: 'Discussions', path: '/discussions' },
    { icon: UserPlus, label: 'Connexions', path: '/connections', badge: pendingCount },
    { icon: EnvelopeSimple, label: 'Messages', path: '/messages', badge: unreadMessages },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <aside 
        className={cn(
            "bg-white border-r border-gray-200 h-full flex flex-col fixed left-0 top-0 z-40 transition-all duration-300",
            // Width logic
            "w-64", // Default mobile width
            isCollapsed ? "lg:w-20" : "lg:w-64", // Desktop responsive width
            // Visibility logic
            !isMobileOpen && "-translate-x-full lg:translate-x-0" // Hidden on mobile unless open, always visible on desktop
        )}
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "lg:justify-center lg:w-full")}>
            <img src="/logo.jpeg" alt="ENSA Connect Logo" className="w-8 h-8 object-contain rounded-lg shrink-0" />
            <span className={cn("font-bold text-lg text-brand-black whitespace-nowrap transition-opacity", 
                isCollapsed && "lg:opacity-0 lg:hidden"
            )}>
                ENSA Connect
            </span>
        </div>
        
        {/* Mobile Close Button */}
        <button 
            onClick={closeMobileSidebar}
            className="lg:hidden text-gray-500 hover:text-brand-black"
        >
            <X size={20} weight="bold" />
        </button>
      </div>
      
      {/* Desktop Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-brand-black shadow-sm z-30 hidden lg:block"
      >
        {isCollapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
      </button>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => closeMobileSidebar?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative',
                isActive
                  ? 'bg-gray-50 text-brand-black font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-brand-black',
                isCollapsed && "lg:justify-center lg:px-2"
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon size={20} weight={isActive ? 'duotone' : 'regular'} className="shrink-0" />
                  {item.badge !== undefined && item.badge > 0 && isCollapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(isCollapsed && "lg:hidden")}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                  <span className="ml-auto bg-brand-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium",
            isCollapsed && "lg:justify-center lg:px-2"
          )}
          title={isCollapsed ? "Se déconnecter" : undefined}
        >
          <SignOut size={20} weight="duotone" className="shrink-0" />
          <span className={cn(isCollapsed && "lg:hidden")}>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
