import { supabase } from '../../../supabase/client';
import { UserProfile } from './administrador_backend';
// Usamos el tipo de error específico de Supabase para mayor precisión
import { PostgrestError } from '@supabase/supabase-js';

// No necesitamos una interfaz separada para la creación si es casi idéntica
// a UserProfile. Podemos usar Omit para quitar los campos que se generan
// automáticamente (como created_at, updated_at).
export type CreateUserProfileData = Omit<UserProfile, 'created_at' | 'updated_at' | 'status'> & {
    user_id: string; // Nos aseguramos de que user_id sea requerido
};

/**
 * Crea un nuevo perfil de usuario en la tabla 'profiles'.
 * @param profileData Los datos del perfil a crear.
 * @returns Una promesa que resuelve con el nuevo UserProfile o un error.
 */
export async function createUserProfile(profileData: CreateUserProfileData): Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }> {
  
  // 1. CORRECCIÓN: Manejamos el error 'fetchError'
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', profileData.user_id)
    .single();

  // Si hay un error de red o de base de datos al buscar, lo retornamos.
  // Ignoramos el error específico "PGRST116" que significa "0 filas encontradas",
  // ya que eso es lo que esperamos si el usuario no existe.
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error al verificar la existencia del perfil:', fetchError.message);
    return { data: null, error: fetchError };
  }

  // Si 'existing' no es null, significa que se encontró un perfil.
  if (existing) {
    return { data: null, error: new Error('Ya existe un perfil para este usuario.') };
  }

  // Si llegamos aquí, es seguro insertar el nuevo perfil.
  // 2. MEJORA: Podemos pasar el objeto 'profileData' directamente si los nombres de las propiedades coinciden.
  // Esto hace el código más corto y mantenible.
  const { data, error: insertError } = await supabase
    .from('profiles')
    .insert([profileData]) // Pasamos el objeto directamente
    .select()
    .single();

  if (insertError) {
    console.error('Error al crear perfil de usuario:', insertError.message);
    return { data: null, error: insertError };
  }

  return { data: data as UserProfile, error: null };
}