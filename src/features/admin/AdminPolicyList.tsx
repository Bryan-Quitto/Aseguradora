import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Policy, getAllPolicies } from '../policies/policy_management'; // Asegúrate de que esta ruta sea correcta

export default function AdminPolicyList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await getAllPolicies();
        if (error) {
          setError('No se pudieron cargar las pólizas: ' + error.message); // Mejorar el mensaje de error
        } else {
          setPolicies(data || []);
        }
      } catch (e: any) {
        setError('Ocurrió un error inesperado al cargar las pólizas: ' + e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []); // El array vacío asegura que se ejecuta una sola vez al montar el componente

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-blue-600 text-lg">Cargando pólizas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 text-center">
        <h2 className="text-3xl font-bold text-blue-700 mb-6">Todas las Pólizas</h2>
        <p className="text-gray-600">No hay pólizas registradas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Todas las Pólizas</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Premium</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.policy_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    policy.status === 'active' ? 'bg-green-100 text-green-800' :
                    policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    policy.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {policy.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.start_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.end_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.premium_amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    to={`/admin/dashboard/policies/${policy.id}`}
                    className="text-blue-600 hover:text-blue-900 ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ver Detalles
                    <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}