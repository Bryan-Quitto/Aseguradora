import { supabase } from '../../../supabase/client'; // Asegúrate de que esta ruta sea correcta

// Define la interfaz para el perfil de usuario, basándote en la tabla 'profiles' que creamos
// ¡IMPORTANTE! Esta interfaz debe coincidir con la estructura de tu tabla 'profiles' en Supabase.
export interface UserProfile {
    user_id: string;
    primer_nombre: string | null; // Añadido
    segundo_nombre: string | null; // Añadido
    primer_apellido: string | null;
    segundo_apellido: string | null;
    full_name: string | null;
    email: string | null; // Añadido
    nacionalidad: string | null; // Añadido
    tipo_identificacion: string | null; // Añadido
    numero_identificacion: string | null; // Añadido
    lugar_nacimiento: string | null; // Añadido
    fecha_nacimiento: string | null; // Añadido (asumiendo string en formato 'YYYY-MM-DD' para la fecha)
    sexo: string | null; // Añadido
    estado_civil: string | null; // Añadido
    estatura: number | null; // Añadido (asumiendo number)
    peso: number | null; // Añadido (asumiendo number)
    role: string;
    status: 'active' | 'inactive'; // Nuevo campo para el estado
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
        .select('*'); // Selecciona todas las columnas, incluyendo las nuevas

    if (error) {
        console.error('Error al obtener perfiles de usuario:', error.message);
        return { data: null, error };
    }

    return { data: data as UserProfile[], error: null };
}

/**
 * Obtiene un perfil de usuario por su ID.
 * @param user_id El ID del usuario a buscar.
 * @returns Una promesa que resuelve con el UserProfile o un error.
 */
export async function getUserProfileById(user_id: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single(); // Esperamos un solo resultado

    if (error) {
        console.error(`Error al obtener perfil de usuario con ID ${user_id}:`, error.message);
        return { data: null, error };
    }

    return { data: data as UserProfile, error: null };
}


interface UpdateUserProfileData {
    primer_nombre?: string | null; // Modificado
    segundo_nombre?: string | null; // Modificado
    primer_apellido?: string | null; // Modificado
    segundo_apellido?: string | null; // Modificado
    full_name?: string | null; // Modificado
    email?: string | null; // Modificado
    nacionalidad?: string | null; // Modificado
    tipo_identificacion?: string | null; // Modificado
    numero_identificacion?: string | null; // Modificado
    lugar_nacimiento?: string | null; // Modificado
    fecha_nacimiento?: string | null; // Modificado
    sexo?: string | null; // Modificado
    estado_civil?: string | null; // Modificado
    estatura?: number | null;
    peso?: number | null;
    role?: string | null; // Modificado
    status?: 'active' | 'inactive'; // Añadido
}

/**
 * Actualiza un perfil de usuario existente en la tabla 'profiles'.
 * @param user_id El ID del perfil a actualizar.
 * @param updates Los campos a actualizar.
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function updateUserProfile(user_id: string, updates: UpdateUserProfileData): Promise<{ data: UserProfile | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user_id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar perfil de usuario:', error.message);
        return { data: null, error };
    }

    return { data: data as UserProfile, error: null };
}

/**
 * Desactiva un perfil de usuario (ej. cambiando su campo 'status' a 'inactive').
 * @param user_id El ID del perfil a desactivar.
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function deactivateUserProfile(user_id: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' }) // Cambiar el estado a 'inactive'
        .eq('user_id', user_id)
        .select()
        .single();

    if (error) {
        console.error('Error al desactivar perfil de usuario:', error.message);
        return { data: null, error };
    }

    return { data: data as UserProfile, error: null };
}

/**
 * Activa un perfil de usuario cambiando su estado a 'active'.
 * @param user_id El ID del perfil a activar.
 * @returns Una promesa que resuelve con el UserProfile actualizado o un error.
 */
export async function activateUserProfile(user_id: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('user_id', user_id)
        .select()
        .single();

    if (error) {
        console.error('Error al activar perfil de usuario:', error.message);
        return { data: null, error };
    }

    return { data: data as UserProfile, error: null };
}

/**
 * Elimina un perfil de usuario de la base de datos por su ID.
 * Nota: Esto eliminará el registro de la tabla 'profiles'.
 * Si también necesitas eliminar el usuario de la autenticación de Supabase (auth.users),
 * necesitarías credenciales de 'service_role' para el cliente Supabase y usar `supabase.auth.admin.deleteUser(userId)`.
 * Por motivos de seguridad y alcance, aquí solo eliminamos el perfil de la tabla 'profiles'.
 * @param user_id El ID del perfil de usuario a eliminar.
 * @returns Una promesa que resuelve con un error si la eliminación falla.
 */
export async function deleteUserProfile(user_id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('profiles') // Elimina el registro de la tabla 'profiles'
        .delete()
        .eq('user_id', user_id);

    if (error) {
        console.error('Error al eliminar perfil de usuario:', error.message);
        return { error };
    }

    return { error: null };
}