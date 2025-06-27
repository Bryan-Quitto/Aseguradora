import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/useAuth';
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

export default function AdminEditReimbursement() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        status: '',
        amount_approved: ''
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);
    const [approvalNotes, setApprovalNotes] = useState('');

    const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
    const [rejectionError, setRejectionError] = useState<string | null>(null);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        setError(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar la solicitud.');
            
            setRequest(requestData);
            setFormData({
                status: requestData.status,
                amount_approved: requestData.amount_approved?.toString() || requestData.amount_requested?.toString() || ''
            });

            const { data: submittedData, error: submittedError } = await getSubmittedDocuments(requestId);
            if (submittedError) throw new Error('Error al cargar documentos subidos.');
            setSubmittedDocs(submittedData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        fetchAllDetails();
    }, [fetchAllDetails]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDeleteDocument = async (docId: string, filePath: string, docName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el documento "${docName}"?`)) return;
        
        setDeleting(docId);
        try {
            await deleteReimbursementDocument(docId, filePath);
            setSubmittedDocs(prevDocs => prevDocs.filter(d => d.id !== docId));
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message });
        } finally {
            setDeleting(null);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.status === 'approved') {
            const existingNotes = request?.admin_notes?.split('Justificación:\n')[1] || '';
            setApprovalNotes(existingNotes);
            setApprovalModalOpen(true);
        } else if (formData.status === 'rejected') {
            const existingReasons = request?.rejection_reasons || [];
            const newReasons: Record<string, boolean> = {};
            existingReasons.forEach(r => newReasons[r] = true);
            setRejectionData(prev => ({...prev, reasons: newReasons}));
            setRejectionModalOpen(true);
        } else {
            executeSave({ status: formData.status as any });
        }
    };

    const executeSave = async (updates: Partial<ReimbursementRequestDetail>) => {
        if (!request) return;
        
        setIsSaving(true);
        setActionMessage(null);
        
        try {
            await updateReimbursementRequest(request.id, updates);
            setActionMessage({ type: 'success', text: 'Cambios guardados exitosamente.' });
            setTimeout(() => navigate('/admin/dashboard/reimbursements'), 1500);
        } catch (err: any) {
            setActionMessage({ type: 'error', text: `Error al guardar: ${err.message}`});
        } finally {
            setIsSaving(false);
            setApprovalModalOpen(false);
            setRejectionModalOpen(false);
        }
    };
    
    const handleConfirmApproval = async () => {
        const amount = parseFloat(formData.amount_approved);
        if (isNaN(amount) || amount < 0) {
            setActionMessage({ type: 'error', text: 'El monto a aprobar no es válido.' });
            return;
        }

        const finalNotes = `Modificado por administrador: ${user?.email}\n\nJustificación:\n${approvalNotes || "No se proveyó una justificación detallada."}`;
        
        await executeSave({
            status: 'approved',
            amount_approved: amount,
            rejection_reasons: null,
            rejection_comments: null,
            admin_notes: finalNotes,
        });
    };

    const handleConfirmRejection = async () => {
        const selectedReasons = Object.keys(rejectionData.reasons).filter(key => rejectionData.reasons[key]);
        if (selectedReasons.length === 0) {
            setRejectionError('Debe seleccionar al menos una razón.');
            return;
        }

        let finalComments = "";
        for (const reasonId of selectedReasons) {
            const reasonConfig = rejectionReasonsConfig.find(r => r.id === reasonId);
            if (!reasonConfig) continue;
            const comment = rejectionData.comments[reasonId]?.trim();
            if (reasonConfig.requiresComment && !comment) {
                setRejectionError(`Añada un comentario para: "${reasonConfig.label}"`);
                return;
            }
            finalComments += comment ? `${reasonConfig.label}: ${comment}\n` : `${reasonConfig.label}\n`;
        }
        
        await executeSave({
            status: 'rejected',
            rejection_reasons: selectedReasons,
            rejection_comments: finalComments.trim(),
            amount_approved: null
        });
    };

    const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
        setRejectionData(prev => type === 'reason'
            ? { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } }
            : { ...prev, comments: { ...prev.comments, [id]: value as string } });
    };

    if (loading) return <div className="text-center p-8">Cargando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!request) return <div className="text-center p-8">Solicitud no encontrada.</div>;

    const cancelUrl = '/admin/dashboard/reimbursements';

    return (
        <>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl mx-auto space-y-8">
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
                        <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm">
                            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amount_approved" className="block text-sm font-medium text-gray-700 mb-1">Monto Aprobado</label>
                        <div className="relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500">$</span></div>
                            <input type="number" name="amount_approved" id="amount_approved" value={formData.amount_approved} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 pl-7 shadow-sm" placeholder="0.00" step="0.01" />
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm border-t pt-6">
                    <h3 className="text-xl font-semibold text-indigo-800 mb-4">Gestionar Documentos Subidos</h3>
                    {submittedDocs.length > 0 ? (
                        <ul className="bg-white rounded-lg p-4 border space-y-2">
                            {submittedDocs.map(doc => (<li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0"><span className="flex-1">{doc.document_name}</span><div className="flex items-center gap-3"><a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Ver</a><button type="button" onClick={() => handleDeleteDocument(doc.id, doc.file_url || '', doc.document_name)} disabled={deleting === doc.id} className="text-red-600 hover:text-red-800 disabled:opacity-50">{deleting === doc.id ? 'Eliminando...' : 'Eliminar'}</button></div></li>))}
                        </ul>
                    ) : <p className="text-center text-gray-500 py-4">No hay documentos para gestionar.</p>}
                </div>
                
                <div className="flex justify-end pt-6 border-t">
                    <button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {isApprovalModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold mb-4">Confirmar Aprobación</h3>
                        <div className="space-y-4">
                            <p>Estás a punto de aprobar un monto de <strong>${parseFloat(formData.amount_approved).toFixed(2)}</strong>.</p>
                            <div>
                                <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700">Justificación (Opcional)</label>
                                <textarea id="approvalNotes" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: Se ajusta el monto según la cobertura..."></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                            <button onClick={() => setApprovalModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmApproval} disabled={isSaving} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? 'Procesando...' : 'Confirmar y Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold mb-4">Especificar Motivos de Rechazo</h3>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-4">{rejectionReasonsConfig.map(reason => (<div key={reason.id}><label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded" checked={!!rejectionData.reasons[reason.id]} onChange={(e) => handleRejectionChange('reason', reason.id, e.target.checked)} /><span className="ml-3">{reason.label}</span></label>{reason.requiresComment && rejectionData.reasons[reason.id] && <textarea className="mt-2 block w-full px-3 py-2 border rounded-md" rows={2} placeholder={reason.placeholder} value={rejectionData.comments[reason.id] || ''} onChange={(e) => handleRejectionChange('comment', reason.id, e.target.value)} />}</div>))}</div>
                        {rejectionError && <p className="text-red-600 text-sm mt-4">{rejectionError}</p>}
                        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                            <button onClick={() => setRejectionModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmRejection} disabled={isSaving} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50">{isSaving ? 'Guardando...' : 'Confirmar y Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}