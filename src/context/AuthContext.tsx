import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  mustChangePassword: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | undefined>(undefined);

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116' && currentUser) {
          // Profile doesn't exist, create it from user metadata
          const { user_metadata, email } = currentUser;
          const firstName = user_metadata?.first_name || user_metadata?.full_name?.split(' ')[0] || '';
          const lastName = user_metadata?.last_name || user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
          
          const newProfile = {
            id: userId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            avatar_url: user_metadata?.avatar_url || null,
            completion_score: 0,
            onboarding_completed: false
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            setProfile(createdProfile);
          }
        } else {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id;
      
      if (session?.user) {
        fetchProfile(session.user.id, session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Supabase auth error:", err);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      const currentUserId = session?.user?.id;
      
      // Détection robuste du changement d'utilisateur (login ou logout) via ref pour éviter les closures stale
      if (currentUserId !== userIdRef.current) {
          userIdRef.current = currentUserId;
          
          if (session?.user) {
            setLoading(true);
            fetchProfile(session.user.id, session.user).finally(() => setLoading(false));
          } else {
            setProfile(null);
            setLoading(false);
          }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  };

  // Déterminer si l'utilisateur doit changer son mot de passe
  const mustChangePassword = Boolean(profile?.must_change_password);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, mustChangePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
