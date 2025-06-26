import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import {
    getReimbursementRequestById,
    getSubmittedDocuments,
    getRequiredDocuments,
    ReimbursementRequestDetail,
    ReimbursementDocument,
    RequiredDocument
} from 'src/features/reimbursements/reimbursement_management';
import { Icon } from '@iconify/react';

const getStatusStyles = (status: string) => {
    const styles: { [key: string]: string } = {
        approved: 'bg-green-100 text-green-800', in_review: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800', more_info_needed: 'bg-orange-100 text-orange-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
};

const formatStatus = (status: string) => status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

const rejectionReasonLabels: { [key: string]: string } = {
    illegible_document: 'Documento(s) Ilegible(s)', missing_document: 'Falta(n) Documento(s)',
    inconsistent_data: 'Información Inconsistente', out_of_coverage: 'Servicio Fuera de Cobertura',
    policy_not_active: 'Póliza no activa en la fecha', other_reason: 'Otra Razón'
};

export default function ClientReimbursementDetail() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId || !user?.id) return;
        setLoading(true);
        setError(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar tu solicitud.');
            if (requestData.client_id !== user.id) {
                setAccessDenied(true);
                throw new Error('Acceso no autorizado.');
            }
            setRequest(requestData);

            const { data: submittedData, error: submittedError } = await getSubmittedDocuments(requestId);
            if (submittedError) throw new Error('Error al cargar los documentos de tu solicitud.');
            setSubmittedDocs(submittedData || []);

            const productId = requestData.policies?.product_id;
            if (productId) {
                const { data: requiredData, error: requiredError } = await getRequiredDocuments(productId);
                if (requiredError) throw new Error('Error al cargar documentos requeridos.');
                setRequiredDocs(requiredData || []);
            }
        } catch (err: any) {
            if (!accessDenied) setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId, user?.id, accessDenied]);

    useEffect(() => {
        fetchAllDetails();
    }, [fetchAllDetails]);

    if (accessDenied) return <Navigate to="/client/dashboard/reimbursements" replace />;
    if (loading) return <div className="text-center p-8">Cargando detalles de tu solicitud...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!request) return <div className="text-center p-8">Solicitud no encontrada.</div>;

    const submittedDocNames = new Set(submittedDocs.map(d => d.document_name));

    const renderStatusDetails = () => {
        switch (request.status) {
            case 'approved':
                return (
                    <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-200">
                        <h3 className="text-xl font-semibold text-green-800 mb-2 flex items-center">
                            <Icon icon="solar:check-read-bold" className="mr-2 h-6 w-6" />
                            Resultado: Solicitud Aprobada
                        </h3>
                        <p>¡Buenas noticias! Tu solicitud de reembolso ha sido aprobada.</p>
                        <p className="mt-2 text-2xl font-bold text-green-700">Monto Aprobado: ${request.amount_approved?.toFixed(2)}</p>
                    </div>
                );
            case 'rejected':
            case 'more_info_needed':
                return (
                    <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-200">
                        <h3 className="text-xl font-semibold text-red-800 mb-2 flex items-center">
                            <Icon icon="solar:close-circle-bold" className="mr-2 h-6 w-6" />
                            Resultado: Se Requiere Acción
                        </h3>
                        <p className="mb-4">Tu solicitud necesita correcciones. Por favor, revisa los siguientes puntos, ajusta lo necesario y vuelve a enviarla.</p>
                        {request.rejection_reasons && request.rejection_reasons.length > 0 && (
                             <div className="bg-white p-4 rounded-md border border-red-200 mb-4">
                                 <h4 className="font-semibold text-gray-800 mb-2">Motivos:</h4>
                                 <ul className="list-disc list-inside space-y-1 text-sm">
                                     {request.rejection_reasons.map(reason => (
                                         <li key={reason}>{rejectionReasonLabels[reason] || reason}</li>
                                     ))}
                                 </ul>
                             </div>
                        )}
                        {request.rejection_comments && (
                             <div className="bg-white p-4 rounded-md border border-red-200 mb-6">
                                  <h4 className="font-semibold text-gray-800 mb-2">Comentarios Adicionales del Revisor:</h4>
                                 <pre className="text-sm whitespace-pre-wrap font-sans text-gray-800">{request.rejection_comments}</pre>
                             </div>
                        )}
                        <Link to={`/client/dashboard/reimbursements/${request.id}/edit`} className="w-full text-center block bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition">
                            Corregir y Reenviar Solicitud
                        </Link>
                    </div>
                );
            case 'pending':
            case 'in_review':
                return (
                    <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200 text-center">
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">En Proceso</h3>
                        <p className="text-gray-600">Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos tan pronto como haya una actualización.</p>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl border mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Detalle de mi Reembolso</h2>
                <Link to="/client/dashboard/reimbursements" className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Volver a la Lista</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General</h3>
                        <p><strong>Póliza:</strong> {request.policies?.policy_number || 'N/A'}</p>
                        <p><strong>Producto:</strong> {(request.policies?.insurance_products as any)?.name || 'N/A'}</p>
                        <p><strong>Fecha Inicio Póliza:</strong> {request.policies?.start_date ? format(new Date(request.policies.start_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                        <p><strong>Fecha Fin Póliza:</strong> {request.policies?.end_date ? format(new Date(request.policies.end_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                        <p><strong>Fecha del Siniestro:</strong> {request.event_date ? format(new Date(request.event_date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</p>
                        <p><strong>Fecha Solicitud:</strong> {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                        <p><strong>Monto Solicitado:</strong> <span className="font-bold">${request.amount_requested?.toFixed(2)}</span></p>
                        <p className="mt-2"><strong>Estado:</strong> <span className={`ml-2 px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>{formatStatus(request.status)}</span></p>
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
                        <h3 className="text-xl font-semibold text-indigo-800 mb-4">Documentos que Enviaste</h3>
                        {submittedDocs.length > 0 ? (
                            <ul className="bg-white rounded-lg p-4 border space-y-2">
                                {submittedDocs.map(doc => (
                                    <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                        <span>{doc.document_name}</span>
                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="bg-indigo-500 text-white font-bold py-1 px-3 rounded-full text-sm hover:bg-indigo-600">Ver Documento</a>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>No has subido ningún documento para esta solicitud.</p>}
                    </div>
                    {renderStatusDetails()}
                </div>
            </div>
        </div>
    );
}