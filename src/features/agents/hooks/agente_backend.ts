import { supabase } from '../../../supabase/client';

export interface AgentProfile {
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
  role: string; // Debería ser 'agent'
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene el perfil de un agente por su ID.
 * @param user_id El ID del agente a buscar.
 * @returns Una promesa que resuelve con el AgentProfile o un error.
 */
export async function getAgentProfileById(user_id: string): Promise<{ data: AgentProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .eq('role', 'agent') // Asegurarse de que el rol sea 'agent'
    .single();

  if (error) {
    console.error(`Error al obtener perfil de agente con ID ${user_id}:`, error.message);
    return { data: null, error };
  }

  return { data: data as AgentProfile, error: null };
}

interface UpdateAgentProfileData {
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
  // El rol no debería ser actualizable por el agente mismo
}

/**
 * Actualiza un perfil de agente existente en la tabla 'profiles'.
 * @param user_id El ID del perfil a actualizar.
 * @param updates Los campos a actualizar.
 * @returns Una promesa que resuelve con el AgentProfile actualizado o un error.
 */
export async function updateAgentProfile(user_id: string, updates: UpdateAgentProfileData): Promise<{ data: AgentProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user_id)
    .eq('role', 'agent') // Asegurarse de que el rol sea 'agent'
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar perfil de agente:', error.message);
    return { data: null, error };
  }

  return { data: data as AgentProfile, error: null };
}

/**
 * Obtiene todos los perfiles de agentes de la tabla 'profiles'.
 * @returns Una promesa que resuelve con un array de AgentProfile o un error.
 */
export async function getAllAgentProfiles(): Promise<{ data: AgentProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'agent'); // Filtrar por rol 'agent'

  if (error) {
    console.error('Error al obtener perfiles de agentes:', error.message);
    return { data: null, error };
  }

  return { data: data as AgentProfile[], error: null };
}