import { supabase } from '../../../supabase/client';

// Define la interfaz para el perfil de usuario, basándote en la tabla 'profiles' que creamos
export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todos los perfiles de usuario de la tabla 'profiles'.
 * @returns Una promesa que resuelve con un array de UserProfile o un error.
 */
export async function getAllUserProfiles(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('Error al obtener perfiles de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile[], error: null };
}

/**
 * Crea un nuevo perfil de usuario en la tabla 'profiles'.
 * @param profileData Los datos del perfil a crear (full_name, role).
 * @returns Una promesa que resuelve con el nuevo UserProfile o un error.
 */
export async function createUserProfile(profileData: { id: string; full_name: string; role: string }): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([profileData])
    .select()
    .single();

  if (error) {
    console.error('Error al crear perfil de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile, error: null };
}

/**
 * Actualiza un perfil de usuario existente en la tabla 'profiles'.
 * @param id El ID del perfil a actualizar.
 * @param updates Los campos a actualizar (full_name, role).
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function updateUserProfile(id: string, updates: { full_name?: string; role?: string }): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar perfil de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile, error: null };
}

/**
 * Desactiva un perfil de usuario (ej. cambiando su rol o añadiendo un campo 'status').
 * Nota: Supabase no tiene una función de 'desactivar' nativa. Esto es una implementación lógica.
 * Aquí, simplemente actualizaremos el rol a 'inactive' o similar, o podrías añadir un campo 'is_active'.
 * Para este ejemplo, asumiremos que cambiar el rol a 'inactive' es suficiente.
 * @param id El ID del perfil a desactivar.
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function deactivateUserProfile(id: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'inactive' }) // O podrías tener un campo 'status: 'active' | 'inactive''
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al desactivar perfil de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile, error: null };
}