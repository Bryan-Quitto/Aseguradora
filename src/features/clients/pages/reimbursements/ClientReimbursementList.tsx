import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import { getReimbursementRequestsByClientId } from 'src/features/reimbursements/reimbursement_management';

type ApiResultType = Awaited<ReturnType<typeof getReimbursementRequestsByClientId>>;
type EnhancedReimbursementRequest = ApiResultType['data'] extends (infer U)[] | null ? U : never;

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
    const [reimbursements, setReimbursements] = useState<EnhancedReimbursementRequest[]>([]);
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
                const { data, error: requestsError } = await getReimbursementRequestsByClientId(user.id);
                if (requestsError) throw requestsError;
                
                setReimbursements(data || []);
            } catch (err: any) {
                setError(`Error al cargar tus solicitudes: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchReimbursements();
        }
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
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Mis Reembolsos</h2>
                <Link
                    to="/client/dashboard/reimbursements/new"
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
                >
                    Nueva Solicitud
                </Link>
            </div>

            {reimbursements.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-lg text-gray-600">Aún no has realizado ninguna solicitud de reembolso.</p>
                    <Link to="/client/dashboard/reimbursements/new" className="mt-4 inline-block bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                        Crear mi primera solicitud
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Solicitud</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Póliza</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Solicitado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Aprobado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reimbursements.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.policies?.policy_number || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.amount_requested ? `$${request.amount_requested.toFixed(2)}` : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">{request.status === 'approved' && request.amount_approved ? `$${request.amount_approved.toFixed(2)}` : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>
                                            {formatStatus(request.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-4">
                                        <Link to={`/client/dashboard/reimbursements/${request.id}`} className="text-blue-600 hover:text-blue-900">
                                            Ver Detalles
                                        </Link>
                                        {['rejected', 'more_info_needed'].includes(request.status) && (
                                            <Link to={`/client/dashboard/reimbursements/${request.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                                                Corregir
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