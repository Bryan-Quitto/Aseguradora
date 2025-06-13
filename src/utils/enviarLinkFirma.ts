import { supabase } from 'src/supabase/client'; // Asegúrate de que esta ruta sea correcta

export async function enviarLinkFirma(email: string, contractId: string) {
  try {
    const appBaseUrl = import.meta.env.VITE_REACT_APP_APP_BASE_URL || import.meta.env.VITE_REACT_APP_SUPABASE_URL;

    if (!appBaseUrl) {
      throw new Error('VITE_REACT_APP_APP_BASE_URL o VITE_REACT_APP_SUPABASE_URL no están definidos en tus variables de entorno.');
    }

    console.log(`enviarLinkFirma: Solicitando magic link para ${email} con redirección a ${appBaseUrl}/contract-signature?contractId=${contractId}`);

    // 1. CORRECCIÓN: Eliminamos 'data' de la desestructuración porque no se usa.
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${appBaseUrl}/contract-signature?contractId=${contractId}`,
      },
    });

    if (error) {
      console.error('Error al enviar el magic link con Supabase:', error.message);
      return { success: false, message: error.message };
    }

    return { 
      success: true, 
      message: `Se ha enviado un enlace de firma a ${email}. Por favor, revisa tu bandeja de entrada.` 
    };

  } catch (error) {
    console.error('Error inesperado en enviarLinkFirma:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Ocurrió un error inesperado al intentar enviar el enlace.' };
  }
}