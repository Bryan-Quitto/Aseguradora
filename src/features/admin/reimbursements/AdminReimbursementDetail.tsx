import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import {
    getReimbursementRequestById,
    getSubmittedDocuments,
    getRequiredDocuments,
    updateReimbursementRequest,
    ReimbursementRequestDetail,
    ReimbursementDocument,
    RequiredDocument
} from 'src/features/reimbursements/reimbursement_management';
import { Icon } from '@iconify/react';

const rejectionReasonsConfig = [
    { id: 'illegible_document', label: 'Documento(s) Ilegible(s)', requiresComment: true, placeholder: "Especifica qué documento(s) no se pueden leer." },
    { id: 'missing_document', label: 'Falta(n) Documento(s)', requiresComment: true, placeholder: "Especifica qué documento(s) faltan." },
    { id: 'inconsistent_data', label: 'Información Inconsistente', requiresComment: true, placeholder: "Detalla la inconsistencia (ej. fechas, nombres)." },
    { id: 'out_of_coverage', label: 'Servicio/Producto Fuera de Cobertura', requiresComment: false },
    { id: 'policy_not_active', label: 'Póliza no activa en la fecha del servicio', requiresComment: false },
    { id: 'other_reason', label: 'Otra Razón', requiresComment: true, placeholder: "Detalla la razón específica del rechazo." }
];

const getStatusStyles = (status: string) => {
    const styles: { [key: string]: string } = {
        approved: 'bg-green-100 text-green-800', in_review: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800', more_info_needed: 'bg-orange-100 text-orange-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
};

const formatStatus = (status: string) => status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function AdminReimbursementDetail() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);
    const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);

    const [approvalAmount, setApprovalAmount] = useState<string>('');
    const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
    const [rejectionError, setRejectionError] = useState<string | null>(null);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId) {
            setError('ID de solicitud no encontrado.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setActionMessage(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar la solicitud.');
            setRequest(requestData);
            setApprovalAmount(requestData.amount_requested?.toString() || '');

            const { data: submittedData, error: submittedError } = await getSubmittedDocuments(requestId);
            if (submittedError) throw new Error('Error al cargar documentos subidos.');
            setSubmittedDocs(submittedData || []);

            const productId = requestData.policies?.product_id;
            if (productId) {
                const { data: requiredData, error: requiredError } = await getRequiredDocuments(productId);
                if (requiredError) throw new Error('Error al cargar documentos requeridos.');
                setRequiredDocs(requiredData || []);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        fetchAllDetails();
    }, [fetchAllDetails]);

    const handleConfirmApproval = async () => {
        if (!request || !user?.id) return;
        const amount = parseFloat(approvalAmount);
        if (isNaN(amount) || amount < 0) {
            setActionMessage({ type: 'error', text: 'El monto a aprobar no es válido.' });
            return;
        }

        setLoading(true);
        const { data, error: updateError } = await updateReimbursementRequest(request.id, {
            status: 'approved',
            amount_approved: amount,
            admin_notes: `Aprobado por ${user.email}.`,
        });

        if (updateError) {
            setActionMessage({ type: 'error', text: `Error al aprobar: ${updateError.message}` });
        } else if (data) {
            setRequest(prev => prev ? { ...prev, ...data } : null);
            setActionMessage({ type: 'success', text: 'Solicitud aprobada exitosamente.' });
            setApprovalModalOpen(false);
        }
        setLoading(false);
    };

    const handleConfirmRejection = async () => {
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

        setLoading(true);
        const { data, error: updateError } = await updateReimbursementRequest(request.id, {
            status: 'rejected',
            rejection_reasons: selectedReasons,
            rejection_comments: finalComments.trim(),
            admin_notes: `Rechazado por ${user.email}.`
        });

        if (updateError) {
            setActionMessage({ type: 'error', text: `Error al rechazar: ${updateError.message}` });
        } else if (data) {
            setRequest(prev => prev ? { ...prev, ...data } : null);
            setActionMessage({ type: 'success', text: 'Solicitud rechazada.' });
            setRejectionModalOpen(false);
            setRejectionData({ reasons: {}, comments: {} });
        }
        setLoading(false);
    };

    const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
        setRejectionData(prev => type === 'reason'
            ? { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } }
            : { ...prev, comments: { ...prev.comments, [id]: value as string } });
    };

    if (loading && !request) return <div className="text-center p-8">Cargando detalles de la solicitud...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!request) return <div className="text-center p-8">Solicitud no encontrada.</div>;

    const submittedDocNames = new Set(submittedDocs.map(d => d.document_name));

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl border mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-blue-700">Revisión de Reembolso</h2>
                    <Link to="/admin/dashboard/reimbursements" className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Volver a la Lista</Link>
                </div>

                {actionMessage && <div className={`border px-4 py-3 rounded mb-4 ${actionMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}>{actionMessage.text}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-blue-800 mb-4">Detalles de la Solicitud</h3>
                            <p><strong>Cliente:</strong> {request.profiles?.full_name}</p>
                            <p><strong>Cédula:</strong> {request.profiles?.numero_identificacion}</p>
                            <p><strong>Póliza:</strong> {request.policies?.policy_number}</p>
                            <p><strong>Producto:</strong> {request.policies?.product_name}</p>
                            <p><strong>Fecha Solicitud:</strong> {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                            <p><strong>Monto Solicitado:</strong> <span className="font-bold">${request.amount_requested?.toFixed(2)}</span></p>
                            <p className="mt-2"><strong>Estado:</strong> <span className={`ml-2 px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>{formatStatus(request.status)}</span></p>
                            {request.status === 'approved' && <p><strong>Monto Aprobado:</strong> <span className="font-bold text-green-700">${request.amount_approved?.toFixed(2)}</span></p>}
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Checklist de Documentos</h3>
                            {requiredDocs.length > 0 ? (
                                <ul className="space-y-2">
                                    {requiredDocs.map(reqDoc => (
                                        <li key={reqDoc.id} className="flex items-center">
                                            {submittedDocNames.has(reqDoc.document_name) ?
                                                <Icon icon="solar:check-circle-bold" className="text-green-600 mr-2 h-5 w-5" /> :
                                                <Icon icon="solar:close-circle-bold" className="text-red-600 mr-2 h-5 w-5" />
                                            }
                                            <span title={reqDoc.description || ''}>{reqDoc.document_name}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No hay documentos requeridos definidos para este producto.</p>}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-indigo-800 mb-4">Documentos Subidos por el Cliente</h3>
                            {submittedDocs.length > 0 ? (
                                <ul className="bg-white rounded-lg p-4 border space-y-2">
                                    {submittedDocs.map(doc => (
                                        <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                            <span>{doc.document_name}</span>
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="bg-indigo-500 text-white font-bold py-1 px-3 rounded-full text-sm hover:bg-indigo-600">Ver Documento</a>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>El cliente no ha subido ningún documento.</p>}
                        </div>

                        {['pending', 'in_review'].includes(request.status) && (
                            <div className="bg-gray-100 p-6 rounded-lg shadow-sm flex justify-end gap-4">
                                <button onClick={() => setRejectionModalOpen(true)} disabled={loading} className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50">Rechazar</button>
                                <button onClick={() => setApprovalModalOpen(true)} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">Aprobar</button>
                            </div>
                        )}

                        {request.status === 'rejected' && request.rejection_comments && (
                            <div className="bg-red-50 p-6 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-red-800 mb-4">Detalles del Rechazo</h3>
                                <pre className="text-sm whitespace-pre-wrap font-sans">{request.rejection_comments}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isApprovalModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-4">
                        <h3 className="text-2xl font-bold mb-4">Aprobar Reembolso</h3>
                        <p className="mb-2">Monto Solicitado: <strong>${request.amount_requested?.toFixed(2)}</strong></p>
                        <div>
                            <label htmlFor="approvalAmount" className="block text-sm font-medium text-gray-700">Monto a Aprobar</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                <input type="number" id="approvalAmount" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={() => setApprovalModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmApproval} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{loading ? 'Procesando...' : 'Confirmar Aprobación'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold mb-4">Rechazar Solicitud</h3>
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
                            <button onClick={() => setRejectionModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmRejection} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Procesando...' : 'Confirmar Rechazo'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}