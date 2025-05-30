import { supabase } from '../../../supabase/client';
import { UserProfile } from './administrador_backend';

/**
 * Desactiva un perfil de usuario (cambiando su rol a 'inactive').
 * @param user_id El ID del perfil a desactivar.
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function deactivateUserProfile(user_id: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'inactive' })
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) {
    console.error('Error al desactivar perfil de usuario:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile, error: null };
}