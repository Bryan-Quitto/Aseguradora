import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { supabase } from '../supabase/client';

import { User } from '@supabase/supabase-js';



interface AuthContextType {

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



const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);



  useEffect(() => {

    const getSessionAndProfile = async () => {

      setLoading(true);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {

        setUser(null);

        setUserRole(null);

        setProfile(null);

        setLoading(false);

        return;

      }

      setUser(session?.user || null);



      if (session?.user) {

        // Selecciona los campos necesarios

        const { data: profileData, error: profileError } = await supabase

          .from('profiles')

          .select('role, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')

          .eq('user_id', session.user.id)

          .single();



        if (profileError || !profileData) {

          setUserRole(null);

          setProfile(null);

        } else {

          setUserRole(profileData.role);

          setProfile(profileData);

        }

      } else {

        setUserRole(null);

        setProfile(null);

      }

      setLoading(false);

    };



    getSessionAndProfile();



    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {

      setUser(session?.user || null);

      if (session?.user) {

        supabase

          .from('profiles')

          .select('role, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')

          .eq('user_id', session.user.id)

          .single()

          .then(({ data: profileData, error: profileError }) => {

            if (profileError || !profileData) {

              setUserRole(null);

              setProfile(null);

            } else {

              setUserRole(profileData.role);

              setProfile(profileData);

            }

          });

      } else {

        setUserRole(null);

        setProfile(null);

      }

      setLoading(false);

    });



    return () => {

      authListener.subscription.unsubscribe();

    };

  }, []);



  return (

    <AuthContext.Provider value={{ user, loading, userRole, profile }}>

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