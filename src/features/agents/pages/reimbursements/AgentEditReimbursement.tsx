import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import {
    getReimbursementRequestById,
    getSubmittedDocuments,
    deleteReimbursementDocument, // Importamos la nueva función
    ReimbursementRequestDetail,
    ReimbursementDocument
} from 'src/features/reimbursements/reimbursement_management';

export default function AgentEditReimbursement() {
    const { id: requestId } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [request, setRequest] = useState<ReimbursementRequestDetail | null>(null);
    const [submittedDocs, setSubmittedDocs] = useState<ReimbursementDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null); // ID del doc que se está eliminando
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchAllDetails = useCallback(async () => {
        if (!requestId || !user?.id) return;
        setLoading(true);
        setError(null);
        setActionMessage(null);

        try {
            const { data: requestData, error: requestError } = await getReimbursementRequestById(requestId);
            if (requestError || !requestData) throw new Error('No se pudo cargar la solicitud.');
            // @ts-ignore
            if (requestData.policies?.agent_id !== user.id) {
                setAccessDenied(true);
                throw new Error('Acceso no autorizado.');
            }
            setRequest(requestData);

            const { data: submittedData, error: submittedError } = await getSubmittedDocuments(requestId);
            if (submittedError) throw new Error('Error al cargar documentos subidos.');
            setSubmittedDocs(submittedData || []);
        } catch (err: any) {
            if (!accessDenied) setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [requestId, user?.id, accessDenied]);

    useEffect(() => {
        fetchAllDetails();
    }, [fetchAllDetails]);

    const handleDeleteDocument = async (docId: string, filePath: string, docName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el documento "${docName}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        setDeleting(docId);
        setActionMessage(null);

        try {
            await deleteReimbursementDocument(docId, filePath);
            setActionMessage({ type: 'success', text: `Documento "${docName}" eliminado correctamente.` });
            // Refrescar la lista de documentos
            setSubmittedDocs(prevDocs => prevDocs.filter(d => d.id !== docId));
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message });
        } finally {
            setDeleting(null);
        }
    };

    if (accessDenied) return <Navigate to="/agent/dashboard/reimbursements" replace />;
    if (loading) return <div className="text-center p-8">Cargando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!request) return <div className="text-center p-8">Solicitud no encontrada.</div>;

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Editar Documentos del Reembolso</h2>
                <Link to={`/agent/dashboard/reimbursements/${request.id}`} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">
                    Volver a Revisión
                </Link>
            </div>

            {actionMessage && <div className={`border px-4 py-3 rounded mb-4 ${actionMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}>{actionMessage.text}</div>}

            <div className="bg-blue-50 p-6 rounded-lg shadow-sm mb-6">
                <p><strong>Cliente:</strong> {request.profiles?.full_name}</p>
                <p><strong>Póliza:</strong> {request.policies?.policy_number}</p>
                <p><strong>Fecha Solicitud:</strong> {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-indigo-800 mb-4">Gestionar Documentos Subidos</h3>
                {submittedDocs.length > 0 ? (
                    <ul className="bg-white rounded-lg p-4 border space-y-2">
                        {submittedDocs.map(doc => (
                            <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                <span className="flex-1">{doc.document_name}</span>
                                <div className="flex items-center gap-3">
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Ver</a>
                                    <button 
                                        onClick={() => handleDeleteDocument(doc.id, doc.file_url, doc.document_name)}
                                        disabled={deleting === doc.id}
                                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {deleting === doc.id ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center text-gray-500 py-4">No hay documentos para gestionar en esta solicitud.</p>}
            </div>
        </div>
    );
}