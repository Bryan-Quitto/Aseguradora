import React, { useState, useEffect } from 'react';
// Importa el cliente de Supabase real
import { supabase } from 'src/supabase/client';
// Importa el componente FileUpload real
import FileUpload from 'src/components/shared/FileUpload';

// Importa los tipos y funciones necesarios desde tu archivo de gestión de pólizas
import {
  Policy, // Importa la interfaz Policy de policy_management.ts
  getPoliciesByClientId, // Importa la función para obtener pólizas por ID de cliente
  getInsuranceProductById, // ¡IMPORTANTE! Importa también esta función
  InsuranceProduct, // Asegúrate de que esta interfaz esté importada si getInsuranceProductById la devuelve
} from '../../policies/policy_management'; // Ajusta esta ruta según la ubicación real de tu archivo

// Define tipos para los documentos que se manejarán localmente.
// Si esta interfaz también se centralizará, impórtala desde su ubicación.
interface Document {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string; // URL pública para descarga
}

interface DocumentUploadSectionProps {
  policyId: string | null; // El ID de la póliza a la que se adjuntarán los documentos
  clientId: string | null; // El ID del cliente que sube el documento
  onDocumentUploadSuccess?: () => void; // Callback opcional para cuando se sube un documento
  requiredDocumentTypes?: string[]; // Opcional: lista de tipos de documentos requeridos (ej: ['ID', 'ComprobanteDomicilio'])
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  policyId,
  clientId,
  onDocumentUploadSuccess,
  requiredDocumentTypes = []
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar documentos existentes para la póliza cuando cambia policyId
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!policyId) {
        setDocuments([]);
        return;
      }

      setLoadingDocuments(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const { data, error: docsError } = await supabase
          .from('policy_documents')
          .select('*')
          .eq('policy_id', policyId)
          .order('uploaded_at', { ascending: false });

        if (docsError) throw docsError;

        const documentsWithUrls = await Promise.all((data || []).map(async (doc: Document) => {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(doc.file_path);
          return { ...doc, file_url: urlData?.publicUrl || '#' };
        }));

        setDocuments(documentsWithUrls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los documentos de la póliza.');
        console.error('Error fetching documents for policy:', err);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [policyId]);

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('Por favor seleccione un documento para subir.');
      return;
    }
    if (!policyId) {
      setError('Error: El ID de la póliza no está disponible. Guarde la póliza primero.');
      return;
    }
    if (!clientId) {
      setError('Error: El ID del cliente no está disponible.');
      return;
    }

    const file = files[0];
    setUploadingDocument(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
      const filePath = `policies/${policyId}/${uniqueFileName}`; // Ruta en Supabase Storage

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('policy_documents')
        .insert({
          policy_id: policyId,
          document_name: file.name,
          file_path: uploadData.path,
          uploaded_by: clientId,
        });

      if (dbError) throw dbError;

      setSuccessMessage('¡Documento subido exitosamente!');
      console.log('Document uploaded successfully:', uploadData.path);

      // Actualizar la lista de documentos después de una subida exitosa
      const { data: updatedDocs, error: fetchError } = await supabase
        .from('policy_documents')
        .select('*')
        .eq('policy_id', policyId)
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;

      const documentsWithUrls = await Promise.all((updatedDocs || []).map(async (doc: Document) => {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(doc.file_path);
        return { ...doc, file_url: urlData?.publicUrl || '#' };
      }));
      setDocuments(documentsWithUrls);

      // Llamar al callback de éxito si se proporciona
      onDocumentUploadSuccess && onDocumentUploadSuccess();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el documento.');
      console.error('Error during document upload:', err);
      setSuccessMessage(null);
    } finally {
      setUploadingDocument(false);
    }
  };

  // Determinar los documentos pendientes de subir si hay tipos requeridos definidos
  const uploadedDocumentNames = documents.map(doc => doc.document_name);
  const pendingRequiredDocuments = requiredDocumentTypes.filter(
    (reqType) => !uploadedDocumentNames.some(uploadedName => uploadedName.includes(reqType)) // Simplificado: busca el nombre del tipo en el nombre del archivo
  );

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow-sm mt-6">
      <h4 className="text-xl font-semibold text-gray-800 mb-4">Documentos de la Póliza</h4>

      {!policyId && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Información:</strong>
          <span className="block sm:inline ml-2">Guarda la póliza primero para poder adjuntar documentos.</span>
        </div>
      )}

      {loadingDocuments ? (
        <div className="text-center text-gray-600 mb-4">Cargando documentos existentes...</div>
      ) : documents.length === 0 ? (
        <div className="text-gray-600 italic mb-4">No hay documentos subidos para esta póliza aún.</div>
      ) : (
        <div className="mb-4">
          <h5 className="text-lg font-medium text-gray-700 mb-2">Documentos Subidos:</h5>
          <ul className="bg-white rounded-md border border-gray-200 p-3 max-h-48 overflow-y-auto">
            {documents.map((doc) => (
              <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100">
                <span className="text-gray-800 text-sm break-words flex-grow mr-4">{doc.document_name}</span>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300 ease-in-out"
                >
                  Ver
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {requiredDocumentTypes.length > 0 && pendingRequiredDocuments.length > 0 && policyId && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Atención!</strong>
          <span className="block sm:inline ml-2">Aún faltan documentos obligatorios: {pendingRequiredDocuments.join(', ')}.</span>
        </div>
      )}
      
      <div className="mt-4">
        <FileUpload
          id="policy-document-upload"
          name="policy-document-upload"
          label="Adjuntar Nuevo Documento"
          onChange={handleDocumentUpload}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          disabled={!policyId || uploadingDocument} // Deshabilita si no hay policyId o se está subiendo
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
          <strong className="font-bold">¡Éxito!</strong>
          <span className="block sm:inline ml-2">{successMessage}</span>
        </div>
      )}

      {uploadingDocument && (
        <div className="flex items-center justify-center text-gray-600 mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
          Subiendo documento...
        </div>
      )}
    </div>
  );
};

export default DocumentUploadSection;