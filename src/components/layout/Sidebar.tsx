import { NavLink, useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Calendar, Briefcase, MessageCircle, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen?: boolean;
  closeMobileSidebar?: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen = false, closeMobileSidebar }: SidebarProps) {
  const navigate = useNavigate();
  const navItems = [
    { icon: Users, label: 'Annuaire', path: '/dashboard' },
    { icon: GraduationCap, label: 'Ma Promo', path: '/promo' },
    { icon: Calendar, label: 'Événements', path: '/events' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    { icon: MessageCircle, label: 'Discussions', path: '/discussions' },
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
            <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Desktop Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-brand-black shadow-sm z-30 hidden lg:block"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => closeMobileSidebar?.()} // Close menu on navigation on mobile
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                isActive
                  ? 'bg-gray-50 text-brand-black font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-brand-black',
                isCollapsed && "lg:justify-center lg:px-2"
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className={cn(isCollapsed && "lg:hidden")}>{item.label}</span>
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
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={cn(isCollapsed && "lg:hidden")}>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
