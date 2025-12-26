import { type ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';
import { useAuth } from '../context/AuthContext';
import { Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { Profile } from '../types';
import { cn } from '../lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  useEffect(() => {
    fetchMembers();
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search term with URL when it changes
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setSearchTerm(searchParams.get('q') || '');
    }
  }, [searchParams, location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchExpanded(false);
  }, [location.pathname]);

  const fetchMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);
      if (data) setMembers(data);
    } catch (error) {
      console.error('Error fetching members for search:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setShowSuggestions(true);

    if (location.pathname === '/dashboard') {
      const params = new URLSearchParams(location.search);
      if (term) params.set('q', term);
      else params.delete('q');
      navigate(`/dashboard?${params.toString()}`, { replace: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      setIsSearchExpanded(false);
      navigate(`/dashboard?q=${searchTerm}`);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsSearchExpanded(false);
    }
  };

  const suggestions = searchTerm.length > 0 
    ? members.filter(m => {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        const company = (m.company || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || company.includes(term);
      }).slice(0, 5)
    : [];

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
          
          {/* Left section - Logo & Search */}
          <div className="flex items-center gap-2 flex-1">
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

            {/* Search Bar - Desktop always visible, Mobile expandable */}
            <div 
              className={cn(
                "relative transition-all duration-200",
                // Mobile: Expandable search
                isSearchExpanded 
                  ? "fixed inset-x-0 top-0 h-14 bg-white z-50 px-3 flex items-center" 
                  : "hidden sm:block flex-1 max-w-md lg:max-w-xl"
              )} 
              ref={searchRef}
            >
              {/* Mobile search close button */}
              {isSearchExpanded && (
                <button
                  className="p-2 mr-2 text-gray-500 hover:text-brand-black"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setShowSuggestions(false);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              <div className={cn("relative", isSearchExpanded && "flex-1")}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  className="pl-10 py-2.5 bg-gray-50 border-none w-full" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className={cn(
                  "absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden",
                  isSearchExpanded ? "top-full mx-3" : "top-full"
                )}>
                  {suggestions.map(member => (
                    <button
                      key={member.id}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors touch-manipulation"
                      onClick={() => {
                        navigate(`/member/${member.id}`);
                        setShowSuggestions(false);
                        setIsSearchExpanded(false);
                      }}
                    >
                      <Avatar src={member.avatar_url || undefined} alt={member.first_name || 'User'} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-brand-black truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.job_title || member.promotion || 'Membre'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile search trigger button */}
            <button
              className="sm:hidden p-2 text-gray-500 hover:text-brand-black hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
              onClick={() => setIsSearchExpanded(true)}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          {/* Right section - Notifications & Profile */}
          <div className="flex items-center gap-1 sm:gap-3">
            <NotificationDropdown />
            
            <button 
              onClick={() => profile?.id && navigate(`/member/${profile.id}`)}
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
