import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/useAuth';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import { getAllReimbursementRequests } from 'src/features/reimbursements/reimbursement_management';

type ApiResultType = Awaited<ReturnType<typeof getAllReimbursementRequests>>;
type EnhancedReimbursementRequest = ApiResultType['data'] extends (infer U)[] | null ? U : never;

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'approved': return 'bg-green-100 text-green-800';
        case 'in_review': return 'bg-blue-100 text-blue-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'more_info_needed': return 'bg-orange-100 text-orange-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function AdminReimbursementList() {
    const [reimbursements, setReimbursements] = useState<EnhancedReimbursementRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchCedula, setSearchCedula] = useState('');
    const { userRole } = useAuth();

    useEffect(() => {
        const fetchAllData = async () => {
            if (!userRole || (userRole !== 'admin' && userRole !== 'superadministrator')) {
                setError("Acceso denegado. No tienes los permisos necesarios.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data, error: requestsError } = await getAllReimbursementRequests();
                if (requestsError) throw requestsError;
                
                setReimbursements(data || []);
            } catch (err: any) {
                setError(`Error al cargar los datos: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (userRole) {
            fetchAllData();
        }
    }, [userRole]);

    const filteredReimbursements = reimbursements.filter((request) => {
        const cedula = request.profiles?.numero_identificacion || '';
        return searchCedula === '' || cedula.startsWith(searchCedula);
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando solicitudes y verificando permisos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-center mt-10">
                <h2 className="text-2xl font-bold mb-4">Error</h2>
                <p className="mb-4 text-lg">{error}</p>
                <Link
                    to="/admin/dashboard"
                    className="mt-6 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg shadow-md"
                >
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-7xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Gestión de Reembolsos</h2>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por cédula del cliente..."
                    className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={searchCedula}
                    maxLength={10}
                    inputMode="numeric"
                    pattern="\d*"
                    onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setSearchCedula(value);
                    }}
                />
            </div>

            {filteredReimbursements.length === 0 ? (
                <p className="text-lg text-gray-600 text-center py-10">
                    No se encontraron solicitudes de reembolso.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº de Póliza</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Solicitud</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Solicitado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Aprobado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReimbursements.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.profiles?.full_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.profiles?.numero_identificacion || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.policies?.policy_number || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.amount_requested ? `$${request.amount_requested.toFixed(2)}` : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{request.status === 'approved' && request.amount_approved ? `$${request.amount_approved.toFixed(2)}` : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>
                                            {formatStatus(request.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-4">
                                        <Link to={`/admin/dashboard/reimbursements/${request.id}`} className="text-blue-600 hover:text-blue-900">Revisar</Link>
                                        {['pending', 'in_review', 'more_info_needed', 'approved', 'rejected'].includes(request.status) && (
                                            <Link to={`/admin/dashboard/reimbursements/${request.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                                                Editar
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