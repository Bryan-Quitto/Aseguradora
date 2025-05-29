import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: string | null; // Añadir esta línea
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // Añadir esta línea

  useEffect(() => {
    const getSessionAndProfile = async () => { // Renombrar la función para reflejar su nueva tarea
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(session?.user || null);

      if (session?.user) {
        // Obtener el rol del usuario de la tabla 'profiles'
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.warn('No se encontró perfil para el usuario:', session.user.id, profileError);
          setUserRole(null);
        } else {
          setUserRole(profile.role);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    };

    getSessionAndProfile(); // Llamar a la nueva función

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        // Re-obtener el rol en cada cambio de estado de autenticación
        supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (profileError || !profile) {
              console.warn('No se encontró perfil en onAuthStateChange:', session.user.id, profileError);
              setUserRole(null);
            } else {
              setUserRole(profile.role);
            }
          });
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userRole }}> {/* Añadir userRole aquí */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};