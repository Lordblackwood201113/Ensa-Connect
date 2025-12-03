import { type ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { Search, Menu } from 'lucide-react';
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

  useEffect(() => {
    fetchMembers();
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search term with URL when it changes (e.g. back button)
  useEffect(() => {
    if (location.pathname === '/dashboard') {
        setSearchTerm(searchParams.get('q') || '');
    }
  }, [searchParams, location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .limit(100); // Limit for suggestions performance
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
        navigate(`/dashboard?q=${searchTerm}`);
    }
  };

  const suggestions = searchTerm.length > 0 
    ? members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
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
          "ml-0" // Always 0 margin on mobile since sidebar is overlay
      )}>
        <header className="bg-white border-b border-gray-200 h-16 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden mr-4 text-gray-500"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl lg:w-96 relative mr-4 lg:mr-0" ref={searchRef}>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                    className="pl-10 py-2 bg-gray-50 border-none w-full" 
                    placeholder="Rechercher..." 
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                />
             </div>

             {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {suggestions.map(member => (
                        <button
                            key={member.id}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            onClick={() => {
                                navigate(`/member/${member.id}`);
                                setShowSuggestions(false);
                            }}
                        >
                            <Avatar src={member.avatar_url || undefined} alt={member.first_name || 'User'} size="sm" />
                            <div>
                                <p className="font-medium text-sm text-brand-black">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-gray-500 truncate">{member.job_title || 'Membre'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div 
              onClick={() => profile?.id && navigate(`/member/${profile.id}`)}
              className="flex items-center gap-3 pl-4 lg:border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-brand-black">
                  {profile?.first_name || 'User'} {profile?.last_name || ''}
                </p>
                <p className="text-xs text-gray-500">
                  {profile?.promotion ? `Promo ${profile.promotion}` : 'N/A'}
                </p>
              </div>
              <Avatar src={profile?.avatar_url || undefined} alt={profile?.first_name || 'User'} size="sm" />
            </div>
          </div>
        </header>
        
        <main className="p-4 lg:p-8 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
