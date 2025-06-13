import { createClient } from '@supabase/supabase-js';

// ¡Esta es la corrección clave! Usamos import.meta.env para Vite.
// Y usamos los nombres exactos de tus variables.
const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;

// Verificación para asegurar que las variables de entorno están cargadas
if (!supabaseUrl || !supabaseAnonKey) {
  // El mensaje de error ahora es más útil porque apunta a las variables correctas
  throw new Error("Supabase URL o Anon Key no encontradas. Asegúrate de que las variables VITE_REACT_APP_SUPABASE_URL y VITE_REACT_APP_SUPABASE_ANON_KEY están en tu archivo .env.local.");
}

// Se crea la instancia del cliente de Supabase UNA SOLA VEZ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);