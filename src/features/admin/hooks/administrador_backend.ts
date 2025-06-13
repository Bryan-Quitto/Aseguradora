import { supabase } from '../../../supabase/client'; // Asegúrate de que esta ruta sea correcta

// 1. CORRECCIÓN: La interfaz debe coincidir con tu tabla de la base de datos.
// Usamos 'status' en lugar de 'is_active'.
export interface UserProfile {
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
    fecha_nacimiento: string | null; // Podrías usar Date si lo manejas así
    sexo: string | null;
    estado_civil: string | null;
    estatura: number | null;
    peso: number | null;
    role: string;
    // La propiedad clave que debe coincidir con tu BD
    status: 'active' | 'inactive'; // <-- CAMBIO IMPORTANTE AQUÍ
    created_at: string;
    updated_at: string;
    phone_number: string | null; // Añadida por si la necesitas, como en tu DDL
}

// 2. CORRECCIÓN: Adaptamos las funciones para que retornen los tipos correctos.
// Supabase puede devolver un PostgrestError, no un Error genérico.
// Es mejor práctica usar los tipos que provee Supabase.
import { PostgrestError } from '@supabase/supabase-js';

// No es necesario retornar un objeto, podemos retornar directamente la respuesta de Supabase.
export async function getAllUserProfiles() {
    // El select obtiene todas las columnas, no es necesario especificarlas si quieres todas.
    const { data, error } = await supabase.from('profiles').select('*');
    return { data: data as UserProfile[] | null, error };
}

export async function getUserProfileById(user_id: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();
    
    return { data: data as UserProfile | null, error };
}

export async function updateUserProfile(user_id: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user_id)
        .select()
        .single();
    
    return { data: data as UserProfile | null, error };
}


// 4. CORRECCIÓN: Creamos la función que el frontend necesita.
// Esta es la función que usamos para activar/desactivar.
export async function updateUserProfileStatus(user_id: string, newStatus: 'active' | 'inactive') {
    // Reutilizamos la función genérica de actualizar para mantener el código DRY (Don't Repeat Yourself)
    return updateUserProfile(user_id, { status: newStatus });
}


// 5. La función de borrar está bien, solo ajustamos el tipo de retorno para consistencia.
export async function deleteUserProfile(user_id: string): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user_id);
    
    return { error };
}