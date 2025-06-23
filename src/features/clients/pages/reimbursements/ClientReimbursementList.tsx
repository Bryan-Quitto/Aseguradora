import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import {
    getReimbursementRequestsByClientId,
    getPolicyInfoById,
    ReimbursementRequest,
    PolicyInfo
} from 'src/features/reimbursements/reimbursement_management';

const getStatusStyles = (status: string) => {
    const styles: { [key: string]: string } = {
        approved: 'bg-green-100 text-green-800',
        in_review: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800',
        more_info_needed: 'bg-orange-100 text-orange-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
};

const formatStatus = (status: string) => status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function ClientReimbursementList() {
    const { user } = useAuth();
    const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
    const [policyDetails, setPolicyDetails] = useState<Map<string, PolicyInfo>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReimbursements = async () => {
            if (!user?.id) {
                setError('No se pudo identificar al cliente.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data: requestsData, error: requestsError } = await getReimbursementRequestsByClientId(user.id);
                if (requestsError) throw requestsError;
                if (!requestsData) {
                    setReimbursements([]);
                    setLoading(false);
                    return;
                }

                setReimbursements(requestsData);

                const policyIds = new Set(requestsData.map(r => r.policy_id));
                const newPolicyDetails = new Map<string, PolicyInfo>();

                for (const id of policyIds) {
                    const { data } = await getPolicyInfoById(id);
                    if (data) newPolicyDetails.set(id, data);
                }
                setPolicyDetails(newPolicyDetails);

            } catch (err: any) {
                setError(`Error al cargar tus solicitudes: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchReimbursements();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando tus solicitudes de reembolso...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-red-600 text-xl">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Mis Reembolsos</h2>
                <Link
                    to="/client/dashboard/reimbursements/new"
                    className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
                >
                    Solicitar Nuevo Reembolso
                </Link>
            </div>

            {reimbursements.length === 0 ? (
                <p className="text-lg text-gray-600 text-center py-10">
                    Aún no has realizado ninguna solicitud de reembolso. ¿Te gustaría <Link to="/client/dashboard/reimbursements/new" className="text-blue-600 hover:underline">crear una ahora</Link>?
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha de Solicitud
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Póliza
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Monto Solicitado
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reimbursements.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {policyDetails.get(request.policy_id)?.policy_number || 'Cargando...'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {request.amount_requested ? `$${request.amount_requested.toFixed(2)}` : 'No especificado'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>
                                            {formatStatus(request.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            to={`/client/dashboard/reimbursements/${request.id}`}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Ver Detalles
                                        </Link>
                                        
                                        {request.status !== 'approved' && (
                                            <Link
                                                to={`/client/dashboard/reimbursements/${request.id}/edit`}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                {request.status === 'rejected' || request.status === 'more_info_needed'
                                                    ? 'Corregir'
                                                    : 'Editar'
                                                }
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}