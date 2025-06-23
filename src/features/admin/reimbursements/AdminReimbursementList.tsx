import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import { 
    getAllReimbursementRequests, 
    ReimbursementRequest,
    getClientProfileById,
    getPolicyInfoById,
    ClientProfileInfo,
    PolicyInfo
} from 'src/features/reimbursements/reimbursement_management';

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'in_review':
            return 'bg-blue-100 text-blue-800';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'more_info_needed':
            return 'bg-orange-100 text-orange-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function AdminReimbursementList() {
    const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
    const [clientDetails, setClientDetails] = useState<Map<string, ClientProfileInfo>>(new Map());
    const [policyDetails, setPolicyDetails] = useState<Map<string, PolicyInfo>>(new Map());
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
                // 1. Obtener la lista plana de reembolsos
                const { data: requestsData, error: requestsError } = await getAllReimbursementRequests();
                if (requestsError) throw requestsError;
                if (!requestsData) return;

                setReimbursements(requestsData);

                // 2. Recopilar IDs únicos para clientes y pólizas
                const clientIds = new Set(requestsData.map(r => r.client_id));
                const policyIds = new Set(requestsData.map(r => r.policy_id));

                // 3. Obtener detalles de clientes y guardarlos en un mapa
                const newClientDetails = new Map<string, ClientProfileInfo>();
                for (const id of clientIds) {
                    const { data } = await getClientProfileById(id);
                    if (data) newClientDetails.set(id, data);
                }
                setClientDetails(newClientDetails);

                // 4. Obtener detalles de pólizas y guardarlos en un mapa
                const newPolicyDetails = new Map<string, PolicyInfo>();
                for (const id of policyIds) {
                    const { data } = await getPolicyInfoById(id);
                    if (data) newPolicyDetails.set(id, data);
                }
                setPolicyDetails(newPolicyDetails);

            } catch (err: any) {
                setError(`Error al cargar los datos: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [userRole]);

    const filteredReimbursements = reimbursements.filter((request) => {
        const clientInfo = clientDetails.get(request.client_id);
        const cedula = clientInfo?.numero_identificacion || '';
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
                    No se encontraron solicitudes de reembolso que coincidan con la búsqueda.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cédula
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nº de Póliza
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha Solicitud
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
                            {filteredReimbursements.map((request) => {
                                const clientInfo = clientDetails.get(request.client_id);
                                const policyInfo = policyDetails.get(request.policy_id);

                                const clientFullName = clientInfo?.full_name || 'Cargando...';
                                const clientCedula = clientInfo?.numero_identificacion || 'Cargando...';
                                const policyNumber = policyInfo?.policy_number || 'Cargando...';
                                const requestDate = format(new Date(request.request_date), "dd 'de' MMMM, yyyy", { locale: es });
                                const amount = request.amount_requested ? `$${request.amount_requested.toFixed(2)}` : 'No especificado';

                                return (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {clientFullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {clientCedula}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {policyNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {requestDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(request.status)}`}>
                                                {formatStatus(request.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            to={`/admin/dashboard/reimbursements/${request.id}`}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Revisar Solicitud
                                        </Link>
                                        
                                        {/* --- AÑADE ESTE NUEVO LINK AQUÍ --- */}
                                        {request.status !== 'approved' && (
                                            <Link
                                                to={`/admin/dashboard/reimbursements/${request.id}/edit`}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Editar
                                            </Link>
                                        )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}