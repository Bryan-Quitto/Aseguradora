import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import FileUpload from 'src/components/shared/FileUpload';
import { User } from '@supabase/supabase-js';

// --- Interfaces ---

interface Policy {
  id: string;
  policy_number: string;
  description: string;
  client_id: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
  signed_at: string | null;
  start_date: string;
  insurance_products: { name: string } | null;
  profiles: { email: string } | null;
}

interface SignatureDocument {
    id: string;
    name: string;
    url: string;
    path: string;
}

// --- Componente ---

const ContractSignature = () => {
    // Hooks de estado
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [policyDetails, setPolicyDetails] = useState<Policy | null>(null);
    const [uploadedSignature, setUploadedSignature] = useState<SignatureDocument | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // Hooks de React Router
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const policyId = params.get('contractId');

    // Efecto para manejar la autenticación y la carga de datos
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                setUser(session.user);
                fetchPolicyData(session.user);
            } else {
                setUser(null);
                setError("El enlace es inválido, ha expirado o ya ha sido utilizado. Por favor, solicite uno nuevo.");
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [policyId]);

    // Función para cargar los datos de la póliza
    const fetchPolicyData = async (authenticatedUser: User) => {
        if (!policyId) {
            setError('ID de póliza no encontrado en la URL.');
            setLoading(false);
            return;
        }
        
        try {
            const { data: policyData, error: policyError } = await supabase
                .from('policies')
                .select(`*, insurance_products ( name ), profiles!policies_client_id_fkey ( email )`)
                .eq('id', policyId)
                .single();

            if (policyError) throw policyError;
            if (!policyData) throw new Error('Póliza no encontrada.');

            if (policyData.profiles?.email !== authenticatedUser.email) {
                throw new Error("Acceso denegado. Este enlace de firma no corresponde a su cuenta.");
            }
            
            setPolicyDetails(policyData as Policy);

            const { data: docData, error: docError } = await supabase
                .from('policy_documents')
                .select('id, document_name, file_path')
                .eq('policy_id', policyId)
                .eq('document_type', 'signature')
                .maybeSingle();

            if (docError) throw new Error(`Error al buscar firma existente: ${docError.message}`);
            
            if (docData) {
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(docData.file_path);
                setUploadedSignature({
                    id: docData.id,
                    name: docData.document_name,
                    path: docData.file_path,
                    url: urlData.publicUrl,
                });
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
            setError(`Error al cargar los datos: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Manejador para la subida de la firma
    const handleSignatureUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !policyId || !user) return;
        const file = files[0];
        setIsProcessing(true);
        setError(null);
        try {
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = `signatures/${policyId}/${Date.now()}-${sanitizedFileName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: dbData, error: dbError } = await supabase.from('policy_documents').insert({ policy_id: policyId, document_name: file.name, file_path: uploadData.path, uploaded_by: user.id, document_type: 'signature'}).select('id').single();
            if (dbError) { await supabase.storage.from('documents').remove([uploadData.path]); throw dbError; }
            const { error: policyUpdateError } = await supabase.from('policies').update({ status: 'active', signed_at: new Date().toISOString() }).eq('id', policyId);
            if (policyUpdateError) { console.error("Error al actualizar póliza:", policyUpdateError); throw new Error("La firma se guardó, pero hubo un error al activar la póliza."); }
            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
            setUploadedSignature({ id: dbData!.id, name: file.name, path: uploadData.path, url: urlData.publicUrl });
            setPolicyDetails(prev => prev ? { ...prev, status: 'active' } : null);
        } catch (err) { setError(err instanceof Error ? err.message : 'Error al subir la firma.'); } finally { setIsProcessing(false); }
    };

    // Manejador para eliminar la firma
    const handleDeleteSignature = async () => {
        if (!uploadedSignature || !policyId) return;
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta firma y subir una nueva?")) return;
        setIsProcessing(true);
        setError(null);
        try {
            await supabase.storage.from('documents').remove([uploadedSignature.path]);
            await supabase.from('policy_documents').delete().eq('id', uploadedSignature.id);
            await supabase.from('policies').update({ status: 'awaiting_signature', signed_at: null }).eq('id', policyId);
            setUploadedSignature(null);
            setPolicyDetails(prev => prev ? { ...prev, status: 'awaiting_signature' } : null);
        } catch (err) { setError(err instanceof Error ? err.message : 'Error desconocido al eliminar la firma.'); } finally { setIsProcessing(false); }
    };

    // Función para renderizar el visor de documentos
    const renderDocumentViewer = () => {
        if (!uploadedSignature) return null;
        const isPdf = uploadedSignature.name.toLowerCase().endsWith('.pdf');
        return (
            <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Documento de Firma Subido</h3>
                <div className="bg-gray-100 p-4 rounded-lg flex flex-col items-center gap-4">
                    {isPdf ? ( <p className="font-medium text-gray-700">📄 {uploadedSignature.name}</p> ) : ( <img src={uploadedSignature.url} alt="Firma subida" className="max-w-xs mx-auto border rounded-md shadow-sm" /> )}
                    <div className="flex items-center gap-3 mt-2">
                        {isPdf && <a href={uploadedSignature.url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Ver Documento</a>}
                        <a href={uploadedSignature.url} download={uploadedSignature.name} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Descargar</a>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={handleDeleteSignature} disabled={isProcessing} className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-red-300">{isProcessing ? 'Eliminando...' : 'Eliminar y Subir de Nuevo'}</button>
                </div>
            </div>
        );
    };

    // --- Lógica de Renderizado ---

    if (loading) {
        return <div className="text-center p-10">Verificando enlace, por favor espere...</div>;
    }

    if (error) {
        return <div className="text-center p-10 bg-red-100 text-red-700 rounded-lg max-w-lg mx-auto my-10">{error}</div>;
    }

    if (!policyDetails) {
        return <div className="text-center p-10">No se encontraron detalles de la póliza.</div>;
    }

    if (policyDetails.status === 'active' && uploadedSignature) {
        return (
            <div className="max-w-lg mx-auto my-10 p-8 bg-white rounded-lg shadow-xl border border-green-200">
                <h1 className="text-3xl font-extrabold text-green-700 mb-4 text-center">¡Póliza Activada!</h1>
                <p className="text-gray-700 text-center mb-6">Gracias. Tu póliza ha sido firmada y activada correctamente.</p>
                {renderDocumentViewer()}
                 <div className="mt-8 text-center">
                    <button onClick={() => navigate('/client/dashboard')} className="text-blue-600 hover:underline">
                        Volver al Panel de Cliente
                    </button>
                </div>
            </div>
        );
    }
    
    if (policyDetails.status !== 'pending' && policyDetails.status !== 'awaiting_signature') {
      return (
          <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-yellow-300">
              <h1 className="text-2xl font-bold text-yellow-800 mb-4 text-center">Atención</h1>
              <p className="text-gray-700 text-center">
                  Esta póliza no se puede firmar en este momento. Su estado actual es: 
                  <strong className="ml-1">{policyDetails.status.replace('_', ' ')}</strong>.
              </p>
          </div>
      );
    }

    return (
        <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-gray-200">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Firma de la Póliza</h1>
            
            <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Detalles:</h2>
                <p><strong>Nº Póliza:</strong> {policyDetails.policy_number}</p>
                <p><strong>Producto:</strong> {policyDetails.insurance_products?.name || 'Cargando...'}</p>
                <p><strong>Cliente:</strong> {policyDetails.profiles?.email || 'Cargando...'}</p>
            </div>

            {uploadedSignature ? (
                renderDocumentViewer()
            ) : (
                <div>
                    <p className="text-gray-700 mb-5 leading-relaxed">
                        Por favor, suba un documento con su firma (imagen o PDF) para aceptar los términos de esta póliza.
                    </p>
                    <FileUpload
                        id="signature-upload"
                        name="signature-upload"
                        label="Seleccionar Documento de Firma"
                        accept="image/*,.pdf"
                        onChange={handleSignatureUpload}
                        disabled={isProcessing}
                    />
                </div>
            )}

            {isProcessing && (
                <div className="text-center text-blue-600 font-medium py-4">
                    <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                    Procesando... Por favor, espere.
                </div>
            )}
        </div>
    );
};

export default ContractSignature;