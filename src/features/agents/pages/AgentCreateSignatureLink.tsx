// src/pages/AgentCreateSignatureLink.tsx
import React, { useState } from 'react';
import { enviarLinkFirma } from 'src/utils/enviarLinkFirma'; // Asegúrate de que esta ruta sea correcta
import { supabase } from 'src/supabase/client'; // Importa supabase para crear pólizas de ejemplo

const AgentCreateSignatureLink = () => {
  const [clientEmail, setClientEmail] = useState('');
  // Eliminamos clientId del estado, ya que se usará como variable local.
  // const [clientId, setClientId] = useState(''); 
  const [newPolicyId, setNewPolicyId] = useState(''); // Estado para el ID de la nueva póliza
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null); // ¡AGREGADO! Estado para errores generales del componente

  // Función para obtener el user_id de un cliente por su email
  const getClientUserIdByEmail = async (email: string) => {
    setError(null); // Limpiar errores antes de la búsqueda
    const { data: profile, error: supabaseError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (supabaseError) {
      console.error('Error al obtener user_id del cliente:', supabaseError.message);
      setMessage({ type: 'error', text: `Error al buscar cliente: ${supabaseError.message}` }); // Usar setMessage
      return null;
    }
    if (!profile) {
      setMessage({ type: 'error', text: 'Cliente no encontrado con ese email.' }); // Usar setMessage
      return null;
    }
    return profile.user_id;
  };

  // Función para crear una póliza de ejemplo y obtener su ID
  const createExamplePolicy = async () => {
    setLoading(true);
    setMessage(null);
    setError(null); // Limpiar errores antes de crear la póliza
    setNewPolicyId(''); // Limpiar ID de póliza anterior

    if (!clientEmail) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el correo del cliente primero.' });
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener el user_id del cliente para asociarlo a la póliza
      const clientUserId = await getClientUserIdByEmail(clientEmail);
      if (!clientUserId) {
        setLoading(false);
        return; // El error ya se manejará en getClientUserIdByEmail
      }
      // Ya no necesitamos setClientId, clientUserId se usa directamente

      // 2. Crear la póliza de ejemplo en la tabla 'policies'
      const { data, error: policyError } = await supabase
        .from('policies') // ¡CAMBIO AQUÍ! Ahora apunta a 'policies'
        .insert([
          { 
            policy_number: `POL-${Math.floor(Math.random() * 1000000)}`, // Número de póliza único
            name: `Póliza Auto Estándar`,
            description: 'Póliza de seguro de automóvil estándar con cobertura completa y beneficios adicionales.',
            client_email: clientEmail,
            client_id: clientUserId, // ¡IMPORTANTE! Asociar el user_id del cliente para RLS
            product_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Reemplaza con un ID de producto válido de tu tabla 'insurance_products'
            start_date: new Date().toISOString().split('T')[0], // Fecha actual
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Un año después
            status: 'pending', // Estado inicial pendiente de firma
            premium_amount: 150.75,
            payment_frequency: 'monthly',
          }
        ])
        .select('id, policy_number')
        .single(); // Espera un solo registro

      if (policyError) throw policyError;
      if (!data) throw new Error('No se pudo crear la póliza.');

      setNewPolicyId(data.id);
      setMessage({ type: 'success', text: `Póliza de ejemplo creada con número: ${data.policy_number} (ID: ${data.id}). Ahora puedes enviar el link de firma.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear póliza.'); // Usar setError para el error general
      console.error('Error creating example policy:', err);
      setMessage(null); // Limpiar mensajes de éxito/error específicos si hay un error general
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null); // Limpiar errores antes de enviar el link

    if (!clientEmail || !newPolicyId) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el correo del cliente y el ID de la póliza.' });
      setLoading(false);
      return;
    }

    const result = await enviarLinkFirma(clientEmail, newPolicyId); // Pasa newPolicyId como contractId

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setClientEmail(''); // Limpiar campo después de enviar
      setNewPolicyId(''); // Limpiar campo después de enviar
      // No limpiar clientId porque ya no está en el estado
    } else {
      setError(result.message); // Usar setError para el error del envío
      console.error('Error sending signature link:', result.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-gray-200">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-7 text-center">Enviar Enlace de Firma de Póliza</h1>
      <p className="text-gray-700 mb-6 text-center">
        Desde aquí, un agente puede crear una nueva póliza y enviar un enlace de firma único a un cliente.
      </p>

      <div className="mb-6">
        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-2">
          Correo Electrónico del Cliente
        </label>
        <input
          type="email"
          id="clientEmail"
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="cliente@ejemplo.com"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">Asegúrate de que este email corresponda a un usuario existente en tu tabla 'profiles' (con user_id y role 'client').</p>
      </div>

      <div className="mb-6">
        <label htmlFor="newPolicyId" className="block text-sm font-medium text-gray-700 mb-2">
          ID de la Póliza a Firmar
        </label>
        <input
          type="text"
          id="newPolicyId"
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed"
          placeholder="Haz clic en 'Crear Póliza de Ejemplo' para obtener un ID"
          value={newPolicyId}
          readOnly // Hacerlo de solo lectura ya que se genera automáticamente o se busca
        />
        <button
          onClick={createExamplePolicy}
          disabled={loading || !clientEmail}
          className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-sm transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && message?.text.includes('Póliza') ? 'Creando Póliza...' : 'Crear Póliza de Ejemplo y Obtener ID'}
        </button>
        <p className="text-sm text-gray-500 mt-2">
          En un entorno real, el ID de la póliza se obtendría de una base de datos después de la creación de la póliza real.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !clientEmail || !newPolicyId}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
      >
        {loading && !message?.text.includes('Póliza') ? ( // Diferenciar mensaje de loading
          <div className="flex items-center justify-center">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Enviando enlace...
          </div>
        ) : (
          'Enviar Enlace de Firma al Cliente'
        )}
      </button>

      {/* Mostrar el mensaje de error general */}
      {error && (
        <div className="mt-6 p-4 rounded-md text-center bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Mostrar el mensaje de éxito/error específico (si no hay un error general) */}
      {message && !error && (
        <div className={`mt-6 p-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default AgentCreateSignatureLink;