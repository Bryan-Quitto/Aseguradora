import React, { useState } from 'react';
import FileUpload from 'src/components/shared/FileUpload';
import { supabase } from 'src/supabase/client'; // Assuming you have a Supabase client configured here

const ClientDocumentUpload: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('Por favor seleccione un documento para subir.');
      return;
    }

    const file = files[0];
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // You might want to generate a unique name or use a specific path for documents
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`; // Example: unique name based on timestamp
      const filePath = `documents/${fileName}`; // Example: store in a 'documents' folder in Supabase Storage

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents') // Make sure you have a bucket named 'documents' in Supabase
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Optionally, save the document metadata (e.g., file name, URL) to your database
      // For example, if you have a 'client_documents' table:
      // const { error: dbError } = await supabase
      //   .from('client_documents')
      //   .insert([
      //     { client_id: 'some_client_id', file_name: file.name, file_url: uploadData.path }
      //   ]);
      // if (dbError) throw dbError;

      setSuccess(true);
      console.log('Document uploaded successfully:', uploadData.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el documento.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 text-center text-green-600">
        <h2 className="text-2xl font-bold mb-4">¡Documento Subido Exitosamente!</h2>
        <p>El documento ha sido cargado correctamente.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Subir Documentos</h2>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Por favor, seleccione el documento que desea subir.
        </p>

        <FileUpload
          id="document-upload"
          name="document-upload"
          label="Seleccionar Documento"
          onChange={handleDocumentUpload}
          // Consider adding 'accept' prop for specific file types, e.g., accept=".pdf,.doc,.docx"
        />
      </div>

      {error && (
        <div className="text-red-600 mb-4">{error}</div>
      )}

      {loading && (
        <div className="text-gray-600">Cargando documento...</div>
      )}
    </div>
  );
};

export default ClientDocumentUpload;
