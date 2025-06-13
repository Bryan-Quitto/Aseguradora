// src/utils/enviarLinkFirma.ts
// Esta función ahora llama a la Edge Function de Supabase para generar y enviar el link de firma.

export async function enviarLinkFirma(email: string, contractId: string) {
  try {
    // Construye la URL completa de la Edge Function
    // Asume que VITE_REACT_APP_SUPABASE_URL ya está configurado en tu .env para Vite
    const supabaseBaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
    
    if (!supabaseBaseUrl) {
      throw new Error('VITE_REACT_APP_SUPABASE_URL no está definido en tus variables de entorno.');
    }
    
    // Concatena la URL base de Supabase con la ruta de tu Edge Function
    const edgeFunctionUrl = `${supabaseBaseUrl}/functions/v1/generate-signature-link`;

    console.log(`enviarLinkFirma: Llamando a la Edge Function en: ${edgeFunctionUrl}`);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aunque la función esté desplegada con --no-verify-jwt, a veces es necesario
        // enviar la clave anon para que el Gateway de Supabase enrute la petición correctamente.
        'Authorization': `Bearer ${import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, contractId }),
    });

    console.log('enviarLinkFirma: Respuesta de la Edge Function recibida.');

    const data = await response.json();

    if (!response.ok) {
      // Si la respuesta no es OK (ej. status 400, 500), hubo un error en la Edge Function
      console.error('enviarLinkFirma: Error al llamar a la Edge Function:', data.error);
      throw new Error(data.error || 'Error desconocido al generar y enviar el enlace de firma.');
    }

    // La Edge Function ahora devuelve { success: true, message: '...' } si todo va bien.
    return {
      success: true,
      message: data.message || 'Se ha procesado la solicitud del enlace de firma y se ha enviado un correo.'
    };
  } catch (error) {
    console.error('enviarLinkFirma: Error en enviarLinkFirma (al llamar a la Edge Function):', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al enviar el enlace de firma.'
    };
  }
}