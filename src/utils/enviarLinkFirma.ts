
import { supabase } from 'src/supabase/client';

export async function enviarLinkFirma(
  email: string,
  contractId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const appBaseUrl = import.meta.env.VITE_REACT_APP_APP_BASE_URL;

    if (!appBaseUrl) {
      throw new Error(
        'La variable VITE_REACT_APP_APP_BASE_URL no está definida en tu archivo .env'
      );
    }

    const redirectUrl = `${appBaseUrl}/contract-signature?contractId=${contractId}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('Error al enviar el magic link con Supabase:', error.message);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Se ha enviado un enlace de firma a ${email}. Por favor, revisa tu bandeja de entrada.`,
    };

  } catch (error) {
    console.error('Error inesperado en la función enviarLinkFirma:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado al intentar enviar el enlace.';
    return { success: false, message: message };
  }
}