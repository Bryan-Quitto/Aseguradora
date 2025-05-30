import { supabase } from '../../../supabase/client';
import { UserProfile } from './administrador_backend';

export interface CreateUserProfileData {
  user_id: string;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  full_name: string;
  email: string;
  nacionalidad: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  lugar_nacimiento: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  estatura: number | null;
  peso: number | null;
  role: string;
}

/**
 * Crea un nuevo perfil de usuario en la tabla 'profiles'.
 * @param profileData Los datos del perfil a crear.
 * @returns Una promesa que resuelve con el nuevo UserProfile o un error.
 */
export async function createUserProfile(profileData: CreateUserProfileData): Promise<{ data: UserProfile | null; error: Error | null }> {
  // Verifica si ya existe un perfil con ese user_id
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', profileData.user_id)
    .single();

  if (existing) {
    return { data: null, error: new Error('Ya existe un perfil para este usuario.') };
  }

  // Si no existe, inserta el nuevo perfil
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      user_id: profileData.user_id,
      primer_nombre: profileData.primer_nombre,
      segundo_nombre: profileData.segundo_nombre,
      primer_apellido: profileData.primer_apellido,
      segundo_apellido: profileData.segundo_apellido,
      full_name: profileData.full_name,
      email: profileData.email,
      nacionalidad: profileData.nacionalidad,
      tipo_identificacion: profileData.tipo_identificacion,
      numero_identificacion: profileData.numero_identificacion,
      lugar_nacimiento: profileData.lugar_nacimiento,
      fecha_nacimiento: profileData.fecha_nacimiento,
      sexo: profileData.sexo,
      estado_civil: profileData.estado_civil,
      estatura: profileData.estatura,
      peso: profileData.peso,
      role: profileData.role
    }])
    .select()
    .single();

  if (error) {
    console.error('Error al crear perfil de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile, error: null };
}