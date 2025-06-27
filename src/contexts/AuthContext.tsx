import { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  profile: {
    primer_nombre?: string;
    segundo_nombre?: string;
    primer_apellido?: string;
    segundo_apellido?: string;
  } | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentSession(session);
      if (!session) {
        setLoading(false);
      }
    };
    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentSession(session);
        if (!session) {
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    const setProfileData = async () => {
      if (currentSession?.user) {
        if (currentSession.user.id === user?.id) {
            return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
          .eq('user_id', currentSession.user.id)
          .single();

        setUser(currentSession.user);
        setUserRole(profileData?.role || null);
        setProfile(profileData || null);
      } else {
        setUser(null);
        setUserRole(null);
        setProfile(null);
      }
      if (loading) {
        setLoading(false);
      }
    };

    setProfileData();
  }, [currentSession, user?.id, loading]);

  const value = { user, loading, userRole, profile };

  console.log('[AuthProvider] Renderizando y proveyendo contexto.');

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};