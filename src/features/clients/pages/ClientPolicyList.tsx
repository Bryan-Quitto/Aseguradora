import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { Policy, getPoliciesByClientId } from '../../policies/policy_management';

export default function ClientPolicyList() {
    const { user } = useAuth();
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolicies = async () => {
            if (!user?.id) {
                setError('No se pudo identificar al cliente.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const { data, error: policiesError } = await getPoliciesByClientId(user.id);

            if (policiesError) {
                setError('Error al cargar tus pólizas.');
                setPolicies([]);
            } else {
                setPolicies(data || []);
            }

            setLoading(false);
        };

        if (user?.id) {
            fetchPolicies();
        }
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando tus pólizas...</p>
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

    const capitalizeStatus = (status: Policy['status'] | undefined | null) => {
        if (!status) return 'Desconocido';
        const trimmedStatus = status.trim().replace('_', ' ');
        if (trimmedStatus.length === 0) return 'Desconocido';
        return trimmedStatus.charAt(0).toUpperCase() + trimmedStatus.slice(1);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Mis Pólizas</h2>
                <Link
                    to="/client/dashboard/policies/new"
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
                >
                    Contratar Póliza
                </Link>
            </div>

            {policies.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-lg text-gray-600">No tienes pólizas contratadas aún.</p>
                     <Link to="/client/dashboard/policies/new" className="mt-4 inline-block bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                        Contratar mi primera póliza
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Póliza</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Prima</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {policies.map((policy) => (
                                <tr key={policy.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{policy.policy_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {policy.insurance_products?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {typeof policy.premium_amount === 'number' ? `$${policy.premium_amount.toFixed(2)}` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                            policy.status === 'pending' || policy.status === 'awaiting_signature' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {capitalizeStatus(policy.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            to={`/client/dashboard/policies/${policy.id}`}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Ver Detalles
                                        </Link>
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