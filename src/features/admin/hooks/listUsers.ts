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

export async function listOnlyUsuarios(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client'); // Solo usuarios con rol 'client'

  if (error) {
    console.error('Error al obtener solo usuarios:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile[], error: null };
}

export async function listOnlyAgentes(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'agent'); // Solo usuarios con rol 'agent'

  if (error) {
    console.error('Error al obtener solo agentes:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile[], error: null };
}

export async function listOnlyAdmins(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    // CAMBIO CLAVE: Usa el operador 'in' para incluir 'admin' y 'superadministrator'
    .in('role', ['admin', 'superadministrator']); // <<-- ¡Este es el cambio!

  if (error) {
    console.error('Error al obtener solo administradores:', error.message);
    return { data: null, error };
  }

  return { data: data as UserProfile[], error: null };
}