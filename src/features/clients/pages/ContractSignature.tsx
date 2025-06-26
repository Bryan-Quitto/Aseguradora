import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import FileUpload from 'src/components/shared/FileUpload';
import { User } from '@supabase/supabase-js';
import html2pdf from 'html2pdf.js';
import ContractTemplate from 'src/components/contracts/ContractTemplate';

interface Policy {
    id: string;
    policy_number: string;
    client_id: string;
    status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature' | 'awaiting_review';
    signed_at: string | null;
    start_date: string;
    end_date: string; 
    premium_amount: number; 
    payment_frequency: 'monthly' | 'quarterly' | 'annually'; 
    contract_details: string | null; 
    insurance_products: { name: string; type?: 'life' | 'health' | 'other'; description?: string | null; } | null; 
    profiles: { email: string; full_name?: string | null } | null;
    deductible: number | null; 
    coinsurance: number | null; 
    max_annual: number | null; 
    wellness_rebate: number | null; 
    age_at_inscription: number | null; 
    has_dental_basic: boolean | null; 
    has_dental_premium: boolean | null; 
    has_vision_basic: boolean | null; 
    has_vision_full: boolean | null; 
    coverage_amount: number | null; 
    ad_d_included: boolean | null; 
    ad_d_coverage: number | null; 
    dependents_details: { id?: string; relation: string; custom_relation?: string; first_name1: string; first_name2?: string; last_name1: string; last_name2?: string; id_card: string; age: number; }[] | null; 
    beneficiaries: { id?: string; relation: string; custom_relation?: string; first_name1: string; first_name2?: string; last_name1: string; last_name2?: string; id_card: string; percentage: number; }[] | null; 
    num_dependents?: number | null; 
    num_beneficiaries?: number | null; 
}

interface SignatureDocument {
    id: string;
    name: string;
    url: string;
    path: string;
}

const generateAndSaveContractPDF = async (elementId: string, policyId: string): Promise<string> => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Elemento con ID '${elementId}' no fue encontrado.`);
    }

    const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `contrato_${policyId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        const pdfBlob = await html2pdf().from(element).set(options).output('blob');
        const pdfFile = new File([pdfBlob], options.filename, { type: 'application/pdf' });
        const filePath = `contracts/${policyId}/contract-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(filePath, pdfFile);

        if (uploadError) {
            throw new Error(`Error al subir el PDF a Supabase: ${uploadError.message}`);
        }
        
        return filePath;

    } catch (error) {
        console.error("Error en la generación o subida del PDF:", error);
        throw error;
    }
};

const ContractSignature = () => {
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [policyDetails, setPolicyDetails] = useState<Policy | null>(null);
    const [uploadedSignature, setUploadedSignature] = useState<SignatureDocument | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [showConfirmDeleteSignatureModal, setShowConfirmDeleteSignatureModal] = useState(false);
    const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmittedForReview, setIsSubmittedForReview] = useState(false);
    const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState<string | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const policyId = params.get('contractId');

    useEffect(() => {
        const fetchPolicyData = async (authenticatedUser: User) => {
            if (!policyId) {
                setError('ID de póliza no encontrado en la URL.');
                setLoading(false);
                return;
            }
            
            try {
                const { data: policyData, error: policyError } = await supabase
                    .from('policies')
                    .select(`*, insurance_products ( name, type, description ), profiles!policies_client_id_fkey ( email, full_name )`)
                    .eq('id', policyId)
                    .single();

                if (policyError) throw policyError;
                if (!policyData) throw new Error('Póliza no encontrada.');

                if (policyData.profiles?.email !== authenticatedUser.email) {
                    throw new Error("Acceso denegado. Este enlace no corresponde a su cuenta.");
                }
                
                if (typeof policyData.dependents_details === 'string') policyData.dependents_details = JSON.parse(policyData.dependents_details);
                if (policyData.dependents_details === null) policyData.dependents_details = [];
                if (typeof policyData.beneficiaries === 'string') policyData.beneficiaries = JSON.parse(policyData.beneficiaries);
                if (policyData.beneficiaries === null) policyData.beneficiaries = [];
                
                setPolicyDetails(policyData as Policy);

                const { data: docData } = await supabase
                    .from('policy_documents')
                    .select('id, document_name, file_path, document_type')
                    .eq('policy_id', policyId)
                    .eq('document_type', 'signature')
                    .maybeSingle();
                
                if (docData) {
                    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(docData.file_path);
                    setUploadedSignature({ id: docData.id, name: docData.document_name, path: docData.file_path, url: urlData.publicUrl });
                }

            } catch (err) {
                setError(`Error al cargar los datos: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
            } finally {
                setLoading(false);
            }
        };
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                setUser(session.user);
                fetchPolicyData(session.user);
            } else {
                setUser(null);
                setError("El enlace es inválido, ha expirado o ya ha sido utilizado.");
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [policyId]);

    const handleSignatureUpload = async (files: FileList | null) => {
        setError(null); 
        setUploadError(null);
        setDeleteSuccessMessage(null); 
        setSubmissionSuccessMessage(null);
    
        if (!files || files.length === 0 || !policyId || !user) {
            setUploadError("Por favor, seleccione un archivo de firma válido.");
            return;
        }
    
        const file = files[0];
        const acceptedFileTypes = ["image/jpeg", "image/png", "image/svg+xml", "application/pdf"];
        if (!acceptedFileTypes.includes(file.type)) {
            setUploadError("Formato no permitido. Solo se aceptan JPG, PNG, SVG o PDF.");
            return;
        }
    
        setIsProcessing(true);
        try {
            const filePath = `signatures/${policyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
            const { data: uploadData, error: uploadErrorRes } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadErrorRes) throw uploadErrorRes;
            
            const fileExtension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
            const standardizedSignatureName = `Firma del Cliente (${fileExtension})`;
    
            const { data: dbData, error: dbError } = await supabase.from('policy_documents').insert({ 
                policy_id: policyId, 
                document_name: standardizedSignatureName,
                file_path: uploadData.path, 
                uploaded_by: user.id, 
                document_type: 'signature'
            }).select('id').single();
            
            if (dbError) { 
                await supabase.storage.from('documents').remove([uploadData.path]); 
                throw dbError; 
            }
            
            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
            
            // --- ESTA ES LA LÍNEA CORREGIDA ---
            setUploadedSignature({ id: dbData!.id, name: standardizedSignatureName, path: uploadData.path, url: urlData.publicUrl });
    
        } catch (err) { 
            setUploadError(err instanceof Error ? err.message : 'Error al subir la firma.'); 
        } finally { 
            setIsProcessing(false); 
        }
    };

    const handleConfirmSignatureAndSubmitForReview = async () => {
        if (!policyDetails || !uploadedSignature || !user) {
            setError("Faltan datos para procesar. Por favor, asegúrese de que la firma esté subida.");
            return;
        }
    
        setIsProcessing(true);
        setError(null);
        setSubmissionSuccessMessage(null);
    
        try {
            const contractPdfPath = await generateAndSaveContractPDF('contract-to-print', policyDetails.id);
    
            const { error: contractDocError } = await supabase
                .from('policy_documents')
                .insert({
                    policy_id: policyDetails.id,
                    document_name: 'Contrato de Póliza (Generado)',
                    file_path: contractPdfPath,
                    uploaded_by: user.id,
                    document_type: 'contract_snapshot'
                });
    
            if (contractDocError) {
                await supabase.storage.from('contracts').remove([contractPdfPath]);
                throw new Error(`Error al guardar el registro del contrato en la base de datos: ${contractDocError.message}`);
            }
    
            // --- CAMBIO CLAVE: YA NO CAMBIAMOS EL ESTADO, SOLO LA FECHA DE FIRMA ---
            const { error: policyUpdateError } = await supabase
                .from('policies')
                .update({
                    signed_at: new Date().toISOString() // Solo registramos cuándo se firmó
                    // El estado 'status' se mantiene como 'awaiting_signature'
                })
                .eq('id', policyDetails.id);
    
            if (policyUpdateError) {
                throw new Error(`Error al actualizar la fecha de firma de la póliza: ${policyUpdateError.message}`);
            }
    
            setIsSubmittedForReview(true);
            setSubmissionSuccessMessage("¡Firma enviada con éxito! Su solicitud está lista para la revisión final del agente.");
    
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al confirmar y generar el contrato.';
            console.error("FALLÓ EL PROCESO DE FIRMA:", errorMessage);
            setError(errorMessage); 
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDownloadContractPDF = async () => {
        if (!policyDetails) {
            setError("No se pueden cargar los detalles de la póliza para generar el PDF.");
            return;
        }
    
        setIsDownloading(true);
        setError(null);
    
        try {
            const element = document.getElementById('contract-to-print');
            if (!element) {
                throw new Error("No se encontró la plantilla del contrato para descargar.");
            }
    
            const options = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `borrador_contrato_${policyDetails.policy_number}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
    
            await html2pdf().from(element).set(options).save();
    
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al generar el PDF para descarga.');
        } finally {
            setIsDownloading(false);
        }
    };

    const confirmDeleteSignature = () => {
        setShowConfirmDeleteSignatureModal(true);
    };

    const executeDeleteSignature = async () => {
        if (!uploadedSignature || !policyId) return; 
    
        setIsProcessing(true);
        setError(null);
        setDeleteSuccessMessage(null); 
        setShowConfirmDeleteSignatureModal(false); 
    
        try {
            const { data: contractDocs, error: findError } = await supabase
                .from('policy_documents')
                .select('id, file_path')
                .eq('policy_id', policyId)
                .eq('document_type', 'contract_snapshot');
    
            if (findError) {
                console.error("Error buscando contratos para borrar:", findError);
            }
    
            if (contractDocs && contractDocs.length > 0) {
                const contractPaths = contractDocs.map(doc => doc.file_path);
                const contractIds = contractDocs.map(doc => doc.id);
    
                await supabase.storage.from('contracts').remove(contractPaths);
                await supabase.from('policy_documents').delete().in('id', contractIds);
            }
    
            await supabase.storage.from('documents').remove([uploadedSignature.path]);
            await supabase.from('policy_documents').delete().eq('id', uploadedSignature.id);
            
            await supabase.from('policies').update({ status: 'awaiting_signature', signed_at: null }).eq('id', policyId);
    
            setUploadedSignature(null); 
            setPolicyDetails(prev => prev ? { ...prev, status: 'awaiting_signature', signed_at: null } : null); 
            setDeleteSuccessMessage("La firma y los contratos asociados han sido eliminados. Ahora puede subir una nueva.");
            setIsSubmittedForReview(false);
            setSubmissionSuccessMessage(null);
        } catch (err) { 
            setError(err instanceof Error ? err.message : 'Error desconocido al eliminar la firma.'); 
        } finally { 
            setIsProcessing(false); 
        }
    };

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
                {!isSubmittedForReview && (
                    <div className="mt-6 text-center">
                        <button onClick={confirmDeleteSignature} disabled={isProcessing} className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                            {isProcessing ? 'Eliminando...' : 'Eliminar y Subir de Nuevo'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderContractContent = () => {
        if (!policyDetails) {
            return <p className="text-gray-600 italic">Cargando detalles del contrato...</p>;
        }
        
        return <ContractTemplate policy={policyDetails as any} />;
    };

    if (loading) return <div className="text-center p-10">Verificando enlace, por favor espere...</div>;
    if (error && !policyDetails) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-lg max-w-lg mx-auto my-10">{error}</div>;
    if (!policyDetails) return <div className="text-center p-10">No se encontraron detalles de la póliza.</div>;

    const relevantStatuses = ['active', 'awaiting_review'];
    if (relevantStatuses.includes(policyDetails.status)) {
        return (
            <div className="max-w-lg mx-auto my-10 p-8 bg-white rounded-lg shadow-xl border border-green-200">
                <h1 className="text-3xl font-extrabold text-green-700 mb-4 text-center">¡Póliza Ya Procesada!</h1>
                <p className="text-gray-700 text-center mb-6">Esta póliza ya ha sido firmada y se encuentra activa o en revisión.</p>
                {uploadedSignature && renderDocumentViewer()}
                   <div className="mt-8 text-center">
                    <button onClick={() => navigate('/client/dashboard')} className="text-blue-600 hover:underline">
                        Volver al Panel de Cliente
                    </button>
                </div>
            </div>
        );
    }
    
    if (policyDetails.status !== 'awaiting_signature') {
      return (
            <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-yellow-300">
                <h1 className="text-2xl font-bold text-yellow-800 mb-4 text-center">Atención</h1>
                <p className="text-gray-700 text-center">
                    Esta póliza no se puede firmar en este momento. Su estado actual es: 
                    <strong className="ml-1">{policyDetails.status.replace(/_/g, ' ')}</strong>.
                </p>
                <div className="mt-6 text-center">
                    <button onClick={() => navigate('/client/dashboard')} className="text-blue-600 hover:underline">
                        Volver al Panel de Cliente
                    </button>
                </div>
            </div>
      );
    }

    return (
        <div className="max-w-6xl mx-auto my-10 p-6 bg-white rounded-lg shadow-xl border border-gray-200">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Firma de la Póliza</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col border border-gray-200 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <h2 className="text-xl font-semibold text-gray-800">Vista Previa del Contrato</h2>
                        <button
                            onClick={handleDownloadContractPDF}
                            disabled={isDownloading || isProcessing}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Generando...
                                </>
                            ) : (
                                'Descargar (PDF)'
                            )}
                        </button>
                    </div>
                    <div className="overflow-auto max-h-[80vh] bg-gray-50 p-1 rounded-lg shadow-inner">
                      {renderContractContent()}
                    </div>
                </div>

                <div className="p-4 border border-gray-300 rounded-md flex flex-col justify-between">
                    <div> 
                        {uploadedSignature ? (
                            <>
                                {renderDocumentViewer()}
                                {policyDetails.status === 'awaiting_signature' && (
                                    <div className="mt-6 text-center">
                                        <button 
                                            onClick={handleConfirmSignatureAndSubmitForReview} 
                                            disabled={isProcessing || isSubmittedForReview} 
                                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-lg font-semibold w-full"
                                        >
                                            {isProcessing ? 'Enviando...' : (isSubmittedForReview ? 'Enviado a Revisión' : 'Confirmar Firma y Enviar a Revisión')}
                                        </button>
                                        {submissionSuccessMessage && (
                                            <div className="mt-4 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg text-center">
                                                {submissionSuccessMessage}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Paso Final: Tu Firma</h3>
                                <p className="text-gray-700 mb-5 leading-relaxed">
                                    Por favor, suba un documento con su firma para aceptar los términos de esta póliza y completar el proceso.
                                </p>
                                <FileUpload
                                    id="signature-upload"
                                    name="signature-upload"
                                    label="Seleccionar Documento (JPG, PNG, SVG, PDF)"
                                    accept="image/*,.pdf" 
                                    onChange={handleSignatureUpload}
                                    disabled={isProcessing || isDownloading}
                                />
                                {uploadError && <div className="text-red-600 text-sm mt-2">{uploadError}</div>}
                                {deleteSuccessMessage && <div className="text-green-600 text-sm mt-2">{deleteSuccessMessage}</div>}
                            </div>
                        )}
                    </div>

                    {(isProcessing || isDownloading) && (
                        <div className="text-center text-blue-600 font-medium py-4">
                            <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                            {isProcessing ? 'Procesando y generando contrato...' : 'Generando PDF...'}
                        </div>
                    )}
                    {error && <div className="text-red-600 text-sm mt-2 text-center">{error}</div>}
                </div>
            </div>
            
            {showConfirmDeleteSignatureModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que quieres eliminar la firma actual y subir una nueva?
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setShowConfirmDeleteSignatureModal(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400" disabled={isProcessing}>
                                Cancelar
                            </button>
                            <button onClick={executeDeleteSignature} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" disabled={isProcessing}>
                                Eliminar Firma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractSignature;