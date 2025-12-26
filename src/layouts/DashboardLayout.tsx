import { type ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';
import { useAuth } from '../context/AuthContext';
import { User, SignOut } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        closeMobileSidebar={() => setIsMobileMenuOpen(false)}
      />
      
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
        "ml-0"
      )}>
        {/* Header */}
        {/* Header - Hidden on mobile for conversation pages (they have their own header) */}
        <header className={cn(
          "bg-white border-b border-gray-200 h-14 sm:h-16 px-3 sm:px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20",
          location.pathname.startsWith('/messages/') && "hidden lg:flex"
        )}>
          
          {/* Left section - Logo */}
          <div className="flex items-center">
            {/* Mobile Logo - Clickable to go home */}
            <button
              onClick={() => navigate('/home')}
              className="lg:hidden flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all touch-manipulation"
            >
              <img
                src="/logo.jpeg"
                alt="ENSA Connect"
                className="w-8 h-8 object-contain rounded-lg"
              />
              <span className="font-bold text-base text-brand-black hidden xs:inline">
                ENSA Connect
              </span>
            </button>
          </div>
          
          {/* Right section - Notifications & Profile */}
          <div className="flex items-center gap-1 sm:gap-3">
            <NotificationDropdown />
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 sm:pl-3 lg:pl-4 lg:border-l border-gray-200 hover:bg-gray-50 rounded-full sm:rounded-none transition-colors touch-manipulation"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-brand-black">
                    {profile?.first_name || 'User'} {profile?.last_name || ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile?.promotion ? `${profile.promotion}` : 'N/A'}
                  </p>
                </div>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  alt={profile?.first_name || 'User'}
                  size="sm"
                  className="w-8 h-8 sm:w-9 sm:h-9"
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      profile?.id && navigate(`/member/${profile.id}`);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <User size={20} weight="duotone" className="text-brand-black" />
                    <span>Profil</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                  >
                    <SignOut size={20} weight="duotone" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        {/* Main Content - No padding on conversation pages for full-screen chat */}
        <main className={cn(
          "flex-1 overflow-auto",
          location.pathname.startsWith('/messages/') 
            ? "p-0 pb-0" 
            : "p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8"
        )}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
      </div>
    </div>
  );
}
