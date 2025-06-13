import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL as string, // Usar VITE_REACT_APP_
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY as string // Usar VITE_REACT_APP_
);