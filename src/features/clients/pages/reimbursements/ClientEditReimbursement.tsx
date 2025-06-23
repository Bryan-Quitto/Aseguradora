import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import FileUpload from 'src/components/shared/FileUpload';
import { Icon } from '@iconify/react';
import {
    getReimbursementRequestById,
    getRequiredDocuments,
    getSubmittedDocuments,
    updateReimbursementWithDocs,
    RequiredDocument,
    ReimbursementDocument
} from 'src/features/reimbursements/reimbursement_management';

export default function ClientEditReimbursement() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [request, setRequest] = useState<any>(null);
    const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    
    const [amountRequested, setAmountRequested] = useState('');
    const [filesToAdd, setFilesToAdd] = useState<Map<string, File>>(new Map());
    const [docsToDelete, setDocsToDelete] = useState<ReimbursementDocument[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetails = useCallback(async () => {
        if (!requestId || !user?.id) return;
        setLoading(true);
        try {
            const { data: reqData, error: reqError } = await getReimbursementRequestById(requestId);
            if (reqError || !reqData || reqData.client_id !== user.id) throw new Error("No se pudo cargar o no tienes acceso a esta solicitud.");
            
            if (reqData.status === 'approved') {
                navigate(`/client/dashboard/reimbursements/${requestId}`);
                return;
            }
            
            if (!reqData.policies) {
                throw new Error("No se pudo encontrar la información de la póliza asociada a este reembolso.");
            }

            setRequest(reqData);
            setAmountRequested(reqData.amount_requested?.toString() || '');
            
            const { data: subData, error: subError } = await getSubmittedDocuments(requestId);
            if (subError) throw new Error("Error al cargar documentos existentes.");
            setSubmittedDocs(subData || []);
            
            const { data: reqDocData, error: reqDocError } = await getRequiredDocuments(reqData.policies.product_id);
            if (reqDocError) throw new Error("Error al cargar documentos requeridos.");
            setRequiredDocs(reqDocData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId, user?.id, navigate]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleFileChange = (docName: string, files: FileList | null) => {
        if (files && files.length > 0) {
            setFilesToAdd(prev => new Map(prev).set(docName, files[0]));
            setDocsToDelete(prev => prev.filter(d => d.document_name !== docName));
        }
    };

    const handleMarkForDeletion = (doc: ReimbursementDocument) => {
        setDocsToDelete(prev => [...prev, doc]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestId || !user?.id) return;
        
        setError(null);
        const amount = parseFloat(amountRequested);
        if (isNaN(amount) || amount <= 0) {
            setError('El monto es obligatorio y debe ser mayor a cero.');
            return;
        }

        setSubmitting(true);
        try {
            const newStatus = 'pending'; 

            await updateReimbursementWithDocs(
                requestId,
                { amount_requested: amount, status: newStatus, rejection_reasons: null, rejection_comments: null },
                filesToAdd,
                docsToDelete,
                user.id
            );
            navigate(`/client/dashboard/reimbursements/${requestId}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <div className="text-center p-8">Cargando solicitud para edición...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    const pageTitle = (request?.status === 'rejected' || request?.status === 'more_info_needed') 
        ? "Corregir Solicitud de Reembolso" 
        : "Editar Solicitud de Reembolso";

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-700 mb-2">{pageTitle}</h2>
            <p className="text-sm text-gray-600 mb-6">Póliza: {request.policies?.policy_number}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto del Reembolso <span className="text-red-500">*</span></label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                        <input type="number" id="amount" value={amountRequested} onChange={e => setAmountRequested(e.target.value)} required className="block w-full rounded-md border-gray-300 pl-7 pr-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="0.00" step="0.01" />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Documentos</h3>
                    <div className="space-y-4">
                        {requiredDocs.map(doc => {
                            const submittedDoc = submittedDocs.find(d => d.document_name === doc.document_name && !docsToDelete.some(del => del.id === d.id));
                            const newFile = filesToAdd.get(doc.document_name);

                            return (
                                <div key={doc.id} className="bg-gray-50 p-4 rounded-lg border">
                                    <p className="text-sm font-medium text-gray-700">{doc.document_name}{doc.is_required && <span className="text-red-500 ml-1">*</span>}</p>
                                    
                                    {submittedDoc ? (
                                        <div className="mt-2 flex items-center justify-between p-2 bg-blue-100 rounded-md text-sm">
                                            <div className="flex items-center truncate">
                                                <Icon icon="solar:document-text-line-duotone" className="text-blue-600 mr-2 h-5 w-5 flex-shrink-0" />
                                                <span className="truncate flex-grow font-medium">Archivo subido</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <a 
                                                    href={submittedDoc.file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                                                >
                                                    Ver
                                                </a>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleMarkForDeletion(submittedDoc)} 
                                                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ) : newFile ? (
                                        <div className="mt-2 flex items-center justify-between p-2 bg-green-100 rounded-md text-sm">
                                            <div className="flex items-center truncate">
                                                 <Icon icon="solar:check-circle-bold" className="text-green-600 mr-2 h-5 w-5 flex-shrink-0" />
                                                <span className="truncate flex-grow">{newFile.name}</span>
                                            </div>
                                            <button type="button" onClick={() => { setFilesToAdd(prev => { const newMap = new Map(prev); newMap.delete(doc.document_name); return newMap; }) }} className="text-red-500 hover:text-red-700 text-xs ml-4">Quitar</button>
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            <FileUpload id={doc.id} name={doc.document_name} label="Subir nuevo archivo" onChange={(files) => handleFileChange(doc.document_name, files)} accept=".pdf,.jpg,.jpeg,.png" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">{error}</div>}

                <div className="flex justify-between items-center pt-4 border-t">
                     <Link to={`/client/dashboard/reimbursements/${requestId}`} className="text-sm text-gray-600 hover:underline">Cancelar</Link>
                    <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        {submitting ? 'Guardando Cambios...' : 'Guardar y Reenviar'}
                    </button>
                </div>
            </form>
        </div>
    );
}