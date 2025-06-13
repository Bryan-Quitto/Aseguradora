import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import FileUpload from 'src/components/shared/FileUpload';

const ContractSignature = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignatureUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('Por favor, selecciona una imagen o un PDF de tu firma.');
      return;
    }

    const file = files[0];
    setLoading(true);
    setError(null);

    // Validar el tipo de archivo antes de intentar subir
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no permitido. Sube una imagen (JPG, PNG, GIF) o un PDF.');
      setLoading(false);
      return;
    }

    try {
      // Obtener el ID del contrato/política desde los parámetros de la URL
      const params = new URLSearchParams(location.search);
      const contractId = params.get('contractId'); // Este será el ID de la tabla 'policies'

      if (!contractId) {
        throw new Error('ID del contrato/política no encontrado. Por favor, asegúrate de que la URL sea correcta.');
      }

      console.log("Intentando subir firma para contractId (policy ID):", contractId); // Debugging

      // Subir la firma a Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${contractId}-signature.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error al subir a Supabase Storage:', uploadError);
        if (uploadError.message.includes('not found')) {
            throw new Error('El bucket "signatures" no existe o no tienes permisos de acceso.');
        }
        if (uploadError.message.includes('Policy')) {
            throw new Error('Permisos insuficientes para subir el archivo. Revisa las políticas RLS de Storage.');
        }
        throw new Error(`Error al subir la firma: ${uploadError.message}`);
      }

      // Obtener la URL pública del archivo subido
      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(uploadData.path);

      if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('No se pudo obtener la URL pública del archivo subido.');
      }
      
      const signaturePublicUrl = publicUrlData.publicUrl;
      console.log("Firma subida. URL Pública:", signaturePublicUrl); // Debugging


      // ¡¡¡CAMBIO CRÍTICO AQUÍ: 'contracts' cambiado a 'policies'!!!
      // Actualizar el estado de la política en la base de datos
      const { error: updateError } = await supabase
        .from('policies')
        .update({
          signature_url: signaturePublicUrl, // Mantener si la columna existe y la necesitas
          signed_at: new Date().toISOString(), // Mantener si la columna existe y la necesitas
          status: 'active' // ¡¡¡ASEGÚRATE DE QUE ESTÉ ASÍ!!!
        })
        .eq('id', contractId);

      if (updateError) {
        console.error('Error al actualizar la política:', updateError);
        throw new Error(`Error al actualizar el contrato: ${updateError.message || 'Detalle de error no disponible.'}`);
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error general en handleSignatureUpload:', err);
      // Asegurarse de que el error sea un string legible
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar tu firma.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">¡Gracias por firmar el contrato!</h2>
        <p>El documento ha sido firmado exitosamente.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Firma del Contrato</h1>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Por favor, sube una imagen clara de tu firma (JPG, PNG, GIF) o un documento PDF para completar el contrato.
        </p>

        <FileUpload
          id="signature"
          name="signature"
          label="Subir firma"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleSignatureUpload}
          required
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {loading && (
        <div className="text-gray-600 flex items-center justify-center mt-4">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Procesando su firma...
        </div>
      )}
    </div>
  );
};

export default ContractSignature;