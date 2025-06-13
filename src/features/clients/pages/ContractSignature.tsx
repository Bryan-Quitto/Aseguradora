// src/pages/ContractSignature.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from 'src/supabase/client'; // Asegúrate de que esta ruta sea correcta
import FileUpload from 'src/components/shared/FileUpload'; // Asegúrate de que esta ruta sea correcta

// Definición de la interfaz de la póliza (adaptada a tu tabla 'policies')
// Esta interfaz debe coincidir con la definida en policy_management.ts
interface Policy {
  id: string;
  policy_number: string; // Añadido, ya que existe en tu tabla 'policies'
  name: string; // Nombre del producto o póliza
  description: string; // Descripción del producto o póliza
  client_email: string;
  client_id: string; // ID del cliente (user_id de profiles)
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature'; // Incluido 'awaiting_signature'
  signature_url: string | null;
  signed_at: string | null;
  // Añade otras propiedades de tu póliza aquí si las necesitas para mostrar detalles
}

const ContractSignature = () => {
  const [loading, setLoading] = useState(true); // Iniciar en loading para la carga de detalles
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [policyDetails, setPolicyDetails] = useState<Policy | null>(null); // Cambiado a policyDetails
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const policyId = params.get('contractId'); // Mantener 'contractId' para la URL, pero lo usaremos como policyId

  // Hook para cargar los detalles de la póliza al cargar la página
  useEffect(() => {
    const fetchPolicyDetails = async () => {
      if (!policyId) {
        setError('ID de póliza no encontrado en la URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Verificar si el usuario está autenticado. Si no, Supabase debería redirigirlo automáticamente
        // si el magic link fue el método de inicio de sesión.
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Esto podría ocurrir si el magic link ya expiró o no fue usado para autenticar.
          setError('No estás autenticado para firmar esta póliza. Por favor, asegúrate de usar el enlace completo del correo.');
          setLoading(false);
          return;
        }

        // Obtener detalles de la póliza desde Supabase (ahora de la tabla 'policies')
        const { data, error: fetchError } = await supabase
          .from('policies') // Apunta a 'policies'
          .select('*')
          .eq('id', policyId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Póliza no encontrada.');

        setPolicyDetails(data as Policy);

        // Si la póliza ya está activa Y tiene una URL de firma, se considera firmada.
        // Si ya está en estado 'active' y no tiene URL de firma (ej. fue activada manualmente por el agente),
        // o si está en otros estados que no son 'pending' o 'awaiting_signature', no se permite firmar.
        if (data.status === 'active' && data.signature_url) { 
          setSuccess(true); // Ya está firmada
        } else if (data.status !== 'pending' && data.status !== 'awaiting_signature') {
          // Si no está ni pendiente ni esperando firma, se muestra un error.
          setError(`La póliza no está en estado 'pendiente' o 'esperando firma'. Estado actual: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}.`);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los detalles de la póliza.');
        console.error('Error fetching policy details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyDetails();
  }, [policyId]); // Dependencia del ID de la póliza

  const handleSignatureUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('Por favor seleccione una imagen de su firma.');
      return;
    }
    // Solo permitir firma si la póliza está pendiente o esperando firma
    if (!policyDetails || (policyDetails.status !== 'pending' && policyDetails.status !== 'awaiting_signature')) {
      setError('Esta póliza no está en estado "pendiente" o "esperando firma" para ser firmada, o ya ha sido firmada.');
      return;
    }

    const file = files[0];
    setLoading(true);
    setError(null);

    try {
      if (!policyId) {
        throw new Error('ID de póliza no encontrado. Error interno.');
      }

      // Subir la firma a Supabase Storage
      const fileExt = file.name.split('.').pop();
      // Generar un nombre de archivo único para evitar colisiones
      const fileName = `${policyId}-${Date.now()}-signature.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures') // Asegúrate de que este bucket exista en Supabase Storage
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false // No sobrescribir si ya existe
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener la URL pública de la firma
      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(uploadData.path);

      if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('No se pudo obtener la URL pública de la firma.');
      }
      
      const signaturePublicUrl = publicUrlData.publicUrl; // Variable para almacenar la URL

      // Actualizar el estado de la póliza en la base de datos (ahora en 'policies')
      const { error: updateError } = await supabase
        .from('policies') // Apunta a 'policies'
        .update({
          signature_url: signaturePublicUrl, // Guardar la URL pública
          signed_at: new Date().toISOString(),
          status: 'active' // ¡CAMBIO! Cambiar el estado a 'active' después de la firma
        })
        .eq('id', policyId);

      if (updateError) {
          // Si hay un error al actualizar, intenta eliminar el archivo de firma para limpiar
          await supabase.storage.from('signatures').remove([uploadData.path]);
          throw updateError;
      }

      setSuccess(true);
      // Opcional: Actualizar los detalles de la póliza en el estado para reflejar el cambio
      setPolicyDetails(prev => prev ? { ...prev, signature_url: signaturePublicUrl, signed_at: new Date().toISOString(), status: 'active' } : null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la firma.');
      console.error('Error during signature upload or policy update:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Cargando detalles de la póliza...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-green-700 mb-4">¡Póliza firmada exitosamente!</h2>
          <p className="text-gray-700">Gracias por tu firma. La póliza ha sido completada.</p>
          {policyDetails?.signature_url && (
            <div className="mt-6">
              <p className="text-gray-600 mb-2">Tu firma subida:</p>
              <img src={policyDetails.signature_url} alt="Firma de la póliza" className="max-w-xs mx-auto border rounded-md shadow-sm" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-gray-200">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Firma Electrónica de la Póliza</h1>
      
      {policyDetails ? (
        <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Detalles de la Póliza:</h2>
          <p className="text-gray-600"><strong className="text-gray-700">Número de Póliza:</strong> {policyDetails.policy_number}</p>
          <p className="text-gray-600"><strong className="font-medium">Producto:</strong> {policyDetails.name}</p>
          <p className="text-gray-600"><strong className="font-medium">Descripción:</strong> {policyDetails.description}</p>
          <p className="text-gray-600"><strong className="text-gray-700">Para Cliente:</strong> {policyDetails.client_email}</p>
          <p className="text-gray-600"><strong className="text-gray-700">Estado Actual:</strong> <span className={`font-medium ${policyDetails.status === 'active' ? 'text-green-600' : (policyDetails.status === 'pending' || policyDetails.status === 'awaiting_signature') ? 'text-orange-500' : 'text-red-600'}`}>{policyDetails.status.charAt(0).toUpperCase() + policyDetails.status.slice(1)}</span></p>
          {/* Aquí puedes añadir más detalles de la póliza que quieras mostrar */}
        </div>
      ) : (
        <div className="text-gray-600 text-center mb-6">No se pudieron cargar los detalles de la póliza.</div>
      )}

      <div className="mb-8">
        <p className="text-gray-700 mb-5 leading-relaxed">
          Por favor, suba una imagen clara de su firma para aceptar los términos de esta póliza.
          Asegúrese de que la imagen sea legible y represente su firma manuscrita o electrónica.
        </p>
        
        <FileUpload
          id="signature"
          name="signature"
          label="Subir imagen de la firma"
          accept="image/*" // Solo permite imágenes
          onChange={handleSignatureUpload}
          required
          disabled={loading || (policyDetails?.status !== 'pending' && policyDetails?.status !== 'awaiting_signature')} // Deshabilitar si está cargando o no está pendiente/esperando firma
        />
      </div>

      {loading && (
        <div className="text-center text-blue-600 font-medium py-2">
          <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          Procesando su firma... Por favor, espere.
        </div>
      )}
    </div>
  );
};

export default ContractSignature;