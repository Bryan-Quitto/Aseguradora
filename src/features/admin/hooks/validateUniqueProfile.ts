import { supabase } from '../../../supabase/client';

/**
 * Verifica que user_id, email y numero_identificacion sean únicos en la tabla 'profiles'.
 * @param user_id El ID de usuario a verificar.
 * @param email El email a verificar.
 * @param numero_identificacion El número de identificación a verificar.
 * @returns Un objeto con los campos duplicados encontrados (si los hay).
 */
export async function validateUniqueProfile(user_id: string, email: string, numero_identificacion: string): Promise<{ duplicated: Array<{ field: string, value: string }> }> {
  const duplicated: Array<{ field: string, value: string }> = [];

  // Verifica user_id
  if (user_id) {
    const { data: userIdData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();
    if (userIdData) duplicated.push({ field: 'user_id', value: user_id });
  }

  // Verifica email
  const { data: emailData } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (emailData) duplicated.push({ field: 'email', value: email });

  // Verifica numero_identificacion
  const { data: idData } = await supabase
    .from('profiles')
    .select('numero_identificacion')
    .eq('numero_identificacion', numero_identificacion)
    .maybeSingle();
  if (idData) duplicated.push({ field: 'numero_identificacion', value: numero_identificacion });

  return { duplicated };
}