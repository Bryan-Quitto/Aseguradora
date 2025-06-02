import { supabase } from '../../../supabase/client';

export interface ClientProfile {
  user_id: string;
  primer_nombre: string | null;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  full_name: string | null;
  email: string | null;
  nacionalidad: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  lugar_nacimiento: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  estatura: number | null;
  peso: number | null;
  role: string; // Debería ser 'client'
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene el perfil de un cliente por su ID.
 * @param user_id El ID del cliente a buscar.
 * @returns Una promesa que resuelve con el ClientProfile o un error.
 */
export async function getClientProfileById(user_id: string): Promise<{ data: ClientProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .eq('role', 'client') // Asegurarse de que el rol sea 'client'
    .single();

  if (error) {
    console.error(`Error al obtener perfil de cliente con ID ${user_id}:`, error.message);
    return { data: null, error };
  }

  return { data: data as ClientProfile, error: null };
}

interface UpdateClientProfileData {
  primer_nombre?: string | null;
  segundo_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  full_name?: string | null;
  email?: string | null;
  nacionalidad?: string | null;
  tipo_identificacion?: string | null;
  numero_identificacion?: string | null;
  lugar_nacimiento?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  estado_civil?: string | null;
  estatura?: number | null;
  peso?: number | null;
  // El rol no debería ser actualizable por el cliente mismo
}

/**
 * Actualiza un perfil de cliente existente en la tabla 'profiles'.
 * @param user_id El ID del perfil a actualizar.
 * @param updates Los campos a actualizar.
 * @returns Una promesa que resuelve con el ClientProfile actualizado o un error.
 */
export async function updateClientProfile(user_id: string, updates: UpdateClientProfileData): Promise<{ data: ClientProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user_id)
    .eq('role', 'client') // Asegurarse de que el rol sea 'client'
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar perfil de cliente:', error.message);
    return { data: null, error };
  }

  return { data: data as ClientProfile, error: null };
}

/**
 * Obtiene todos los perfiles de clientes de la tabla 'profiles'.
 * @returns Una promesa que resuelve con un array de ClientProfile o un error.
 */
export async function getAllClientProfiles(): Promise<{ data: ClientProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client'); // Filtrar por rol 'client'

  if (error) {
    console.error('Error al obtener perfiles de clientes:', error.message);
    return { data: null, error };
  }

  return { data: data as ClientProfile[], error: null };
}