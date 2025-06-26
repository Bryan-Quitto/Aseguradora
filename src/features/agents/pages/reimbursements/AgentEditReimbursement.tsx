import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import {
    getReimbursementRequestById,
    getSubmittedDocuments,
    deleteReimbursementDocument,
    updateReimbursementRequest,
    ReimbursementRequestDetail,
    ReimbursementDocument
} from 'src/features/reimbursements/reimbursement_management';

const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_review', label: 'En Revisión' },
    { value: 'more_info_needed', label: 'Más Información Necesaria' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
];

const rejectionReasonsConfig = [
    { id: 'illegible_document', label: 'Documento(s) Ilegible(s)', requiresComment: true, placeholder: "Especifica qué documento(s) no se pueden leer." },
    { id: 'missing_document', label: 'Falta(n) Documento(s)', requiresComment: true, placeholder: "Especifica qué documento(s) faltan." },
    { id: 'inconsistent_data', label: 'Información Inconsistente', requiresComment: true, placeholder: "Detalla la inconsistencia (ej. fechas, nombres)." },
    { id: 'out_of_coverage', label: 'Servicio/Producto Fuera de Cobertura', requiresComment: false },
    { id: 'policy_not_active', label: 'Póliza no activa en la fecha del servicio', requiresComment: false },
    { id: 'other_reason', label: 'Otra Razón', requiresComment: true, placeholder: "Detalla la razón específica del rechazo." }
];

export default function AgentEditReimbursement() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    
    const [formData, setFormData] = useState({
        status: '',
        amount_approved: ''
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
    const [rejectionError, setRejectionError] = useState<string | null>(null);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId || !user?.id) return;
        setLoading(true);
        setError(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar la solicitud.');
            
            const isAgent = userRole === 'agent';
            if (isAgent && requestData.policies?.agent_id !== user.id) {
                setAccessDenied(true);
                throw new Error('Acceso no autorizado.');
            }
            setRequest(requestData);
            setFormData({
                status: requestData.status,
                amount_approved: requestData.amount_approved?.toString() || ''
            });

            const { data: submittedData, error: submittedError } = await getSubmittedDocuments(requestId);
            if (submittedError) throw new Error('Error al cargar documentos subidos.');
            setSubmittedDocs(submittedData || []);
        } catch (err: any) {
            if (!accessDenied) setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId, user?.id, userRole, accessDenied]);

    useEffect(() => {
        fetchAllDetails();
    }, [fetchAllDetails]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'status' && value === 'rejected') {
            setRejectionModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDeleteDocument = async (docId: string, filePath: string, docName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el documento "${docName}"?`)) return;
        
        setDeleting(docId);
        setActionMessage(null);
        try {
            await deleteReimbursementDocument(docId, filePath);
            setActionMessage({ type: 'success', text: `Documento "${docName}" eliminado.` });
            setSubmittedDocs(prevDocs => prevDocs.filter(d => d.id !== docId));
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message });
        } finally {
            setDeleting(null);
        }
    };
    
    const handleSaveChanges = async (e: React.FormEvent, rejectionDetails: { reasons?: string[], comments?: string } = {}) => {
        e.preventDefault();
        if (!request) return;
        
        setIsSaving(true);
        setActionMessage(null);

        const updates = {
            status: formData.status as any,
            amount_approved: formData.amount_approved ? parseFloat(formData.amount_approved) : null,
            rejection_reasons: rejectionDetails.reasons,
            rejection_comments: rejectionDetails.comments
        };
        
        try {
            await updateReimbursementRequest(request.id, updates);
            setActionMessage({ type: 'success', text: 'Cambios guardados exitosamente.' });
            setTimeout(() => {
                navigate('/agent/dashboard/reimbursements');
            }, 1500);
        } catch (err: any) {
            setActionMessage({ type: 'error', text: `Error al guardar: ${err.message}`});
        } finally {
            setIsSaving(false);
            setRejectionModalOpen(false);
        }
    };

    const handleConfirmRejection = async (e: React.FormEvent) => {
        if (!request || !user?.id) { setRejectionError('Faltan datos.'); return; }
        const selectedReasons = Object.keys(rejectionData.reasons).filter(key => rejectionData.reasons[key]);
        if (selectedReasons.length === 0) { setRejectionError('Debe seleccionar al menos una razón.'); return; }

        let finalComments = "";
        for (const reasonId of selectedReasons) {
            const reasonConfig = rejectionReasonsConfig.find(r => r.id === reasonId);
            if (!reasonConfig) continue;

            const comment = rejectionData.comments[reasonId]?.trim();
            if (reasonConfig.requiresComment && !comment) {
                setRejectionError(`Añada un comentario para: "${reasonConfig.label}"`);
                return;
            }
            if (comment) {
                finalComments += `${reasonConfig.label}: ${comment}\n`;
            } else {
                finalComments += `${reasonConfig.label}\n`;
            }
        }
        
        setFormData(prev => ({ ...prev, status: 'rejected' }));
        await handleSaveChanges(e, { reasons: selectedReasons, comments: finalComments.trim() });
    };

    const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
        setRejectionData(prev => type === 'reason'
            ? { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } }
            : { ...prev, comments: { ...prev.comments, [id]: value as string } });
    };

    const closeRejectionModal = () => {
        setRejectionModalOpen(false);
        setRejectionData({ reasons: {}, comments: {} });
        setRejectionError(null);
    };

    if (accessDenied) return <Navigate to="/agent/dashboard/reimbursements" replace />;
    if (loading) return <div className="text-center p-8">Cargando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!request) return <div className="text-center p-8">Solicitud no encontrada.</div>;

    const cancelUrl = '/agent/dashboard/reimbursements';

    return (
        <>
            <form onSubmit={handleSaveChanges} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-blue-700">Editar Reembolso</h2>
                    <Link to={cancelUrl} className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-300">
                        Cancelar
                    </Link>
                </div>

                {actionMessage && <div className={`border px-4 py-3 rounded ${actionMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}>{actionMessage.text}</div>}

                <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                    <p><strong>Cliente:</strong> {request.profiles?.full_name}</p>
                    <p><strong>Póliza:</strong> {request.policies?.policy_number}</p>
                    <p><strong>Fecha Solicitud:</strong> {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                    <p><strong>Monto Solicitado:</strong> ${request.amount_requested?.toFixed(2)}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado de la Solicitud</label>
                        <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amount_approved" className="block text-sm font-medium text-gray-700 mb-1">Monto Aprobado</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500">$</span></div>
                            <input type="number" name="amount_approved" id="amount_approved" value={formData.amount_approved} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="0.00" step="0.01" />
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm border-t pt-6">
                    <h3 className="text-xl font-semibold text-indigo-800 mb-4">Gestionar Documentos Subidos</h3>
                    {submittedDocs.length > 0 ? (
                        <ul className="bg-white rounded-lg p-4 border space-y-2">
                            {submittedDocs.map(doc => (
                                <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                    <span className="flex-1">{doc.document_name}</span>
                                    <div className="flex items-center gap-3">
                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Ver</a>
                                        <button type="button" onClick={() => handleDeleteDocument(doc.id, doc.file_url || '', doc.document_name)} disabled={deleting === doc.id} className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-wait">
                                            {deleting === doc.id ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 py-4">No hay documentos para gestionar.</p>}
                </div>
                
                <div className="flex justify-end pt-6 border-t">
                    <button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold mb-4">Especificar Motivos de Rechazo</h3>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-4">
                            {rejectionReasonsConfig.map(reason => (
                                <div key={reason.id}>
                                    <label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded" checked={!!rejectionData.reasons[reason.id]} onChange={(e) => handleRejectionChange('reason', reason.id, e.target.checked)} /><span className="ml-3">{reason.label}</span></label>
                                    {reason.requiresComment && rejectionData.reasons[reason.id] && <textarea className="mt-2 block w-full px-3 py-2 border rounded-md" rows={2} placeholder={reason.placeholder} value={rejectionData.comments[reason.id] || ''} onChange={(e) => handleRejectionChange('comment', reason.id, e.target.value)} />}
                                </div>
                            ))}
                        </div>
                        {rejectionError && <p className="text-red-600 text-sm mt-4">{rejectionError}</p>}
                        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                            <button onClick={closeRejectionModal} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmRejection} disabled={isSaving} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50">{isSaving ? 'Procesando...' : 'Confirmar Rechazo y Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}