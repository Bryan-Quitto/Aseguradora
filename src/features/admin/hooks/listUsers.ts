import { supabase } from '../../../supabase/client';
import { UserProfile } from './administrador_backend';

/**
 * Obtiene todos los perfiles de usuario de la tabla 'profiles'.
 * @returns Una promesa que resuelve con un array de UserProfile o un error.
 */
export async function listUsers(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*'); // Selecciona todas las columnas

  if (error) {
    console.error('Error al obtener perfiles de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile[], error: null };
}