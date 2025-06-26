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
import { getAgentProfileById, AgentProfile } from 'src/features/policies/policy_management';
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

const formatStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function AdminReimbursementDetail() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);
    const [isRejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [approvalAmount, setApprovalAmount] = useState<string>('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
    const [rejectionError, setRejectionError] = useState<string | null>(null);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        setError(null);
        setActionMessage(null);
        setAgent(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar la solicitud.');
            setRequest(requestData);
            setApprovalAmount(requestData.amount_requested?.toString() || '');
            
            if (requestData.policies?.agent_id) {
                const { data: agentData, error: agentError } = await getAgentProfileById(requestData.policies.agent_id);
                if (agentError) console.error("Error al cargar datos del agente:", agentError);
                else setAgent(agentData);
            }

            const initialRejectionReasons: Record<string, boolean> = {};
            const initialRejectionComments: Record<string, string> = {};
            if (requestData.rejection_reasons) {
                requestData.rejection_reasons.forEach(reasonId => initialRejectionReasons[reasonId] = true);
                if (requestData.rejection_comments) {
                    requestData.rejection_comments.split('\n').filter(line => line.trim() !== '').forEach(line => {
                        const parts = line.split(/:(.*)/s);
                        if (parts.length > 1) {
                            const label = parts[0].trim();
                            const comment = parts[1].trim();
                            const reasonConfig = rejectionReasonsConfig.find(r => r.label === label);
                            if (reasonConfig) initialRejectionComments[reasonConfig.id] = comment;
                        }
                    });
                }
            }
            setRejectionData({ reasons: initialRejectionReasons, comments: initialRejectionComments });

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
        const finalNotes = `Aprobado por admin ${user.email}.\n\nJustificación:\n${approvalNotes || "No se proveyó una justificación detallada."}`;
        
        await updateReimbursementRequest(request.id, {
            status: 'approved',
            amount_approved: amount,
            rejection_reasons: null,
            rejection_comments: null,
            admin_notes: finalNotes,
        }).then(({ error: updateError }) => {
            if (updateError) setActionMessage({ type: 'error', text: `Error al aprobar: ${updateError.message}` });
            else {
                fetchAllDetails();
                setActionMessage({ type: 'success', text: 'Solicitud aprobada exitosamente.' });
                setApprovalModalOpen(false);
            }
        }).finally(() => setLoading(false));
    };

    const handleConfirmRejection = async (newStatus: 'rejected' | 'more_info_needed') => {
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
            finalComments += comment ? `${reasonConfig.label}: ${comment}\n` : `${reasonConfig.label}\n`;
        }

        setLoading(true);
        await updateReimbursementRequest(request.id, {
            status: newStatus,
            rejection_reasons: selectedReasons,
            rejection_comments: finalComments.trim(),
            amount_approved: null,
            admin_notes: `${formatStatus(newStatus)} por admin ${user.email}.`
        }).then(({ error: updateError }) => {
            if (updateError) setActionMessage({ type: 'error', text: `Error al actualizar: ${updateError.message}` });
            else {
                fetchAllDetails();
                setActionMessage({ type: 'success', text: `Solicitud actualizada a "${formatStatus(newStatus)}".` });
                setRejectionModalOpen(false);
            }
        }).finally(() => setLoading(false));
    };

    const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
        setRejectionData(prev => type === 'reason'
            ? { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } }
            : { ...prev, comments: { ...prev.comments, [id]: value as string } });
    };

    const renderFormattedNotes = (notes: string | null | undefined, type: 'approval' | 'rejection') => {
        if (!notes) return <p className="text-sm text-gray-500">No hay comentarios.</p>;

        if (type === 'approval') {
            const parts = notes.split('\n\nJustificación:\n');
            const approverInfo = parts[0];
            const justification = parts[1];
            return (
                <div className="text-sm">
                    <p className="text-gray-600">{approverInfo}</p>
                    {justification && (
                        <blockquote className="mt-2 pl-3 border-l-4 border-gray-300 text-gray-800 italic">
                            {justification}
                        </blockquote>
                    )}
                </div>
            );
        }

        const lines = notes.split('\n').filter(line => line.trim());
        return (
            <dl className="space-y-3">
                {lines.map((line, index) => {
                    const parts = line.split(/:(.*)/s);
                    const reason = parts[0];
                    const detail = parts[1] ? parts[1].trim() : null;
                    return (
                        <div key={index}>
                            <dt className="font-semibold text-gray-800">{reason}:</dt>
                            {detail && <dd className="pl-4 italic text-gray-600">"{detail}"</dd>}
                        </div>
                    );
                })}
            </dl>
        );
    };
    
    if (loading) return <div className="text-center p-8">Cargando detalles de la solicitud...</div>;
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
                            <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General</h3>
                            <p><strong>Cliente:</strong> {request.profiles?.full_name}</p>
                            <p><strong>Póliza:</strong> {request.policies?.policy_number}</p>
                            <p><strong>Producto:</strong> {request.policies?.insurance_products?.[0]?.name || 'N/A'}</p>
                            <p><strong>Inicio Póliza:</strong> {request.policies?.start_date ? format(new Date(request.policies.start_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                            <p><strong>Fin Póliza:</strong> {request.policies?.end_date ? format(new Date(request.policies.end_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                            <p><strong>Fecha Siniestro:</strong> {request.event_date ? format(new Date(request.event_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                            <p><strong>Fecha Solicitud:</strong> {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                            <p><strong>Monto Solicitado:</strong> <span className="font-bold">${request.amount_requested?.toFixed(2)}</span></p>
                            <p className="mt-2"><strong>Estado:</strong> <span className={`ml-2 px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>{formatStatus(request.status)}</span></p>
                            {request.status === 'approved' && <p><strong>Monto Aprobado:</strong> <span className="font-bold text-green-700">${request.amount_approved?.toFixed(2)}</span></p>}
                        </div>

                        <div className="bg-purple-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-purple-800 mb-4">Agente Asignado al Cliente</h3>
                            {agent ? (<><p><strong>Nombre:</strong> {agent.full_name || 'N/A'}</p><p><strong>Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-600 hover:underline">{agent.email}</a></p>{agent.phone_number && <p><strong>Teléfono:</strong> {agent.phone_number}</p>}</>) : (<p>No hay un agente asignado.</p>)}
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Checklist de Documentos</h3>
                            {requiredDocs.length > 0 ? (
                                <ul className="space-y-3">{requiredDocs.map(reqDoc => (<li key={reqDoc.id} className="flex items-center justify-between"><div className="flex items-center">{submittedDocNames.has(reqDoc.document_name) ? <Icon icon="solar:check-circle-bold" className="text-green-600 mr-2 h-5 w-5 flex-shrink-0" /> : <Icon icon="solar:close-circle-bold" className="text-red-600 mr-2 h-5 w-5 flex-shrink-0" />}<span title={reqDoc.description || ''}>{reqDoc.document_name}</span></div>{reqDoc.is_required ? <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Obligatorio</span> : <span className="text-xs font-semibold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">Opcional</span>}</li>))}</ul>
                            ) : <p>No hay documentos requeridos definidos.</p>}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-indigo-800 mb-4">Documentos Subidos</h3>
                            {submittedDocs.length > 0 ? (
                                <ul className="bg-white rounded-lg p-4 border space-y-2">{submittedDocs.map(doc => (<li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0"><span>{doc.document_name}</span><a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="bg-indigo-500 text-white font-bold py-1 px-3 rounded-full text-sm hover:bg-indigo-600">Ver</a></li>))}</ul>
                            ) : <p>El cliente no ha subido ningún documento.</p>}
                        </div>

                        {(request.status === 'rejected' || request.status === 'more_info_needed') && (<div className="bg-red-50 p-6 rounded-lg shadow-sm"><h3 className="text-xl font-semibold text-red-800 mb-4">Detalles de Acción Previa</h3><div className="bg-white p-3 rounded border border-red-200 text-sm">{renderFormattedNotes(request.rejection_comments, 'rejection')}</div></div>)}
                        
                        {request.status === 'approved' && (<div className="bg-green-50 p-6 rounded-lg shadow-sm"><h3 className="text-xl font-semibold text-green-800 mb-4">Notas de la Aprobación</h3><div className="bg-white p-3 rounded border border-green-200">{renderFormattedNotes(request.admin_notes, 'approval')}</div></div>)}

                        {['pending', 'in_review', 'more_info_needed'].includes(request.status) && (
                            <div className="bg-gray-100 p-6 rounded-lg shadow-sm flex justify-end gap-4">
                                <button onClick={() => setRejectionModalOpen(true)} disabled={loading} className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50">Rechazar / Solicitar Info</button>
                                <button onClick={() => setApprovalModalOpen(true)} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">Aprobar</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isApprovalModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-4">
                        <h3 className="text-2xl font-bold mb-4">Aprobar Reembolso</h3>
                        <div className="space-y-4">
                            <div><label htmlFor="approvalAmount" className="block text-sm font-medium text-gray-700">Monto a Aprobar</label><div className="mt-1 relative rounded-md shadow-sm"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div><input type="number" id="approvalAmount" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} className="block w-full rounded-md border-gray-300 pl-7 pr-12" placeholder="0.00" /></div></div>
                            <div><label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700">Justificación (Opcional)</label><textarea id="approvalNotes" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: Se ajusta el monto según la cobertura..."></textarea></div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8 pt-4 border-t"><button onClick={() => setApprovalModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button><button onClick={handleConfirmApproval} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{loading ? 'Procesando...' : 'Confirmar'}</button></div>
                    </div>
                </div>
            )}
            
            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold mb-4">Acción sobre la Solicitud</h3>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4">{rejectionReasonsConfig.map(reason => (<div key={reason.id}><label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded" checked={!!rejectionData.reasons[reason.id]} onChange={(e) => handleRejectionChange('reason', reason.id, e.target.checked)} /><span className="ml-3">{reason.label}</span></label>{reason.requiresComment && rejectionData.reasons[reason.id] && <textarea className="mt-2 block w-full px-3 py-2 border rounded-md" rows={2} placeholder={reason.placeholder} value={rejectionData.comments[reason.id] || ''} onChange={(e) => handleRejectionChange('comment', reason.id, e.target.value)} />}</div>))}</div>
                        {rejectionError && <p className="text-red-600 text-sm mt-4">{rejectionError}</p>}
                        <div className="flex justify-end gap-4 mt-8 pt-4 border-t"><button onClick={() => setRejectionModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button><button onClick={() => handleConfirmRejection('more_info_needed')} disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50">{loading ? 'Procesando...' : 'Solicitar Info'}</button><button onClick={() => handleConfirmRejection('rejected')} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Procesando...' : 'Rechazar'}</button></div>
                    </div>
                </div>
            )}
        </>
    );
}