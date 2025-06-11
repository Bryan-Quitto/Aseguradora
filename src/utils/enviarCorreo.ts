import emailjs from 'emailjs-com';

/**
 * Envía un correo formal a través de EmailJS.
 * @param from_email Correo del remitente (debe ser válido y autorizado).
 * @param to_email Correo del destinatario.
 * @param name Nombre del destinatario.
 * @returns Promise<void>
 */
export async function enviarCorreo(from_email: string, to_email: string, name: string): Promise<void> {
  const message = `Estimado/a ${name},

Le contacto desde el sistema de gestión de usuarios de Savalta para tratar asuntos administrativos relacionados con su cuenta. Si tiene alguna consulta o requiere información adicional, por favor no dude en responder a este correo.

Saludos cordiales,
Equipo Savalta`;

  await emailjs.send(
    'service_po5arne',        // Service ID
    'template_fz3f6vg',       // Template ID
    {
      from_email,
      to_email,
      name,
      message,
    },
    'X8gXv7AvjFvzr7Rvl'       // Public Key
  );
}