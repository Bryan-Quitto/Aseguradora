// supabase/functions/generate-signature-link/index.ts
// Este archivo es una Supabase Edge Function que se ejecuta en el lado del servidor.
// Su propósito es generar un magic link de autenticación para el cliente Y enviar el correo real.

// --- Referencias de tipo para Deno y módulos externos (para que TypeScript los reconozca localmente) ---
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
/// <reference types="https://deno.land/std@0.177.0/http/server.d.ts" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.42.0" />
/// <reference types="https://esm.sh/resend@1.1.0" />
// --- Fin de referencias de tipo ---

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
// Importa el cliente de Resend (para enviar correos).
import { Resend } from 'https://esm.sh/resend@1.1.0'; 

console.log('Edge Function: generate-signature-link starting...');

// Definir los encabezados CORS para permitir solicitudes desde tu dominio.
// CAMBIA '*' a tu dominio de producción (ej. 'https://tu-dominio.com') cuando despliegues en producción.
// Para localhost, '*' está bien.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Inicializa el cliente de Resend con tu API Key.
// La API Key se obtiene de las variables de entorno (secrets) de Supabase.
const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

// Función para enviar el correo personalizado.
async function sendCustomEmail(toEmail: string, magicLinkUrl: string) {
  // ¡IMPORTANTE! Aquí usamos la dirección de prueba de Resend.
  // Cuando tengas tu propio dominio verificado, cambiarás esto.
  const fromEmail = 'onboarding@resend.dev'; 
  const subject = '¡Póliza Lista para Firma en Savalta Seguros!';
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .header img { width: 80px; margin-bottom: 10px; }
        .header h1 { color: #4A90E2; font-size: 24px; margin: 0; }
        .content { padding: 20px 0; text-align: center; }
        .content p { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 15px; }
        .button-container { text-align: center; margin-top: 20px; }
        .btn {
          display: inline-block;
          background-color: #4A90E2; /* Azul Savalta */
          color: #ffffff !important;
          text-decoration: none;
          font-weight: bold;
          padding: 12px 25px;
          border-radius: 6px;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .btn:hover { background-color: #357ABD; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 30px; font-size: 12px; color: #888; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Savalta Seguros</h1>
        </div>
        <div class="content">
          <p>Estimado cliente,</p>
          <p>Tu póliza está lista para ser revisada y firmada. Por favor, haz clic en el siguiente botón para acceder al documento y completar el proceso de firma electrónica.</p>
          <div class="button-container">
            <a href="${magicLinkUrl}" class="btn">Firmar Póliza Ahora</a>
          </div>
          <p style="margin-top: 25px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>&copy; Savalta Seguros 2025</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: subject,
      html: htmlBody,
    });

    if (error) {
      console.error('Error sending email with Resend:', error);
      return { success: false, error: error.message };
    }
    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error during email sending:', err);
    return { success: false, error: (err as Error).message };
  }
}


// La función principal que maneja las solicitudes HTTP.
serve(async (req) => {
  // Manejar solicitudes OPTIONS (pre-flight requests de CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.warn(`Method Not Allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const { email, contractId } = await req.json();

    if (!email || !contractId) {
      console.error('Missing email or contractId in request body.');
      return new Response(JSON.stringify({ error: 'Email and contractId are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Attempting to generate magic link for email: ${email} with contractId: ${contractId}`);

    const { data, error: generateError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('APP_BASE_URL')}/contract-signature?contractId=${contractId}`,
      },
    });

    if (generateError) {
      console.error('Error generating magic link:', generateError.message);
      return new Response(JSON.stringify({ error: `Failed to generate magic link: ${generateError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const magicLinkUrl = data.properties?.action_link;

    if (!magicLinkUrl) {
      console.error('Magic link URL was not generated, data:', data);
      return new Response(JSON.stringify({ error: 'Magic link URL not generated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Magic link generated successfully for ${email}. URL: ${magicLinkUrl}`);

    // --- ¡NUEVA LÓGICA! Enviar el correo usando Resend (o tu proveedor) ---
    const emailSendResult = await sendCustomEmail(email, magicLinkUrl);

    if (!emailSendResult.success) {
      console.error('Failed to send custom email:', emailSendResult.error);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailSendResult.error}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    // --- FIN NUEVA LÓGICA ---

    return new Response(JSON.stringify({ success: true, message: 'Magic link generated and email sent.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected server error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});