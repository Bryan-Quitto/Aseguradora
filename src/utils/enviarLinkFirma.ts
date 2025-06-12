import { supabase } from 'src/supabase/client';

export async function enviarLinkFirma(email: string, contractId: string) {
  try {
    // Generar magic link con Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/contract-signature?contractId=${contractId}`
      }
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Se ha enviado un enlace de firma a su correo electrónico'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al enviar el enlace de firma'
    };
  }
}