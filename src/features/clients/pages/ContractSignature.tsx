import React, { useState } from 'react';
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
      setError('Por favor seleccione una imagen de su firma');
      return;
    }

    const file = files[0];
    setLoading(true);
    setError(null);

    try {
      // Obtener el ID del contrato desde los parámetros de la URL
      const params = new URLSearchParams(location.search);
      const contractId = params.get('contractId');

      if (!contractId) {
        throw new Error('ID del contrato no encontrado');
      }

      // Subir la firma a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractId}-signature.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Actualizar el estado del contrato
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          signature_url: uploadData.path,
          signed_at: new Date().toISOString(),
          status: 'signed'
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la firma');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">¡Gracias por firmar el contrato!</h2>
        <p>El documento ha sido firmado exitosamente.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Firma del Contrato</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Por favor, suba una imagen clara de su firma para completar el contrato.
        </p>
        
        <FileUpload
          id="signature"
          name="signature"
          label="Subir firma"
          accept="image/*,application/pdf" // Modified this line
          onChange={handleSignatureUpload}
          required
        />
      </div>

      {error && (
        <div className="text-red-600 mb-4">{error}</div>
      )}

      {loading && (
        <div className="text-gray-600">Procesando su firma...</div>
      )}
    </div>
  );
};

export default ContractSignature;