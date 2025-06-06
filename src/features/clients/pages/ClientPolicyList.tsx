import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { Policy, getPoliciesByClientId, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';

/**
 * Componente para listar las pólizas contratadas por un cliente.
 */
export default function ClientPolicyList() {
  const { profile, user } = useAuth(); // Obtiene el perfil del cliente autenticado y el objeto user
  const [policies, setPolicies] = useState<Policy[]>([]); // Estado para almacenar las pólizas
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map()); // Mapa para almacenar nombres de productos

  // --- DEBUGGING: Log cuando el componente se renderiza ---
  console.log('ClientPolicyList: Componente ClientPolicyList renderizado.');

  useEffect(() => {
    // --- DEBUGGING: Log cuando el useEffect se dispara ---
    console.log('ClientPolicyList: useEffect disparado.');

    /**
     * Función asíncrona para cargar las pólizas del cliente y los nombres de los productos asociados.
     */
    const fetchPoliciesAndDetails = async () => {
      // --- DEBUGGING: Log el ID del usuario ---
      console.log('ClientPolicyList: user ID:', user?.id);

      if (!user?.id) {
        setError('No se pudo cargar el ID del cliente.');
        setLoading(false);
        // --- DEBUGGING: Log error por falta de user ID ---
        console.error('ClientPolicyList: user ID no proporcionado, no se pueden cargar pólizas.');
        return;
      }

      setLoading(true);
      setError(null);

      // Obtener las pólizas del cliente
      const { data: policiesData, error: policiesError } = await getPoliciesByClientId(user.id);

      if (policiesError) {
        console.error('ClientPolicyList: Error al obtener pólizas del cliente:', policiesError);
        setError('Error al cargar tus pólizas. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (policiesData) {
        // --- DEBUGGING: Log las pólizas cargadas ---
        console.log('ClientPolicyList: Pólizas cargadas:', policiesData);
        setPolicies(policiesData);

        // Crear un conjunto para IDs únicos de productos
        const uniqueProductIds = new Set(policiesData.map(p => p.product_id));
        // --- DEBUGGING: Log IDs de productos únicos ---
        console.log('ClientPolicyList: IDs de productos únicos:', Array.from(uniqueProductIds));


        // Cargar nombres de productos
        const newProductNames = new Map<string, string>(productNames);
        for (const productId of uniqueProductIds) {
          if (!newProductNames.has(productId)) {
            const { data: productData, error: productError } = await getInsuranceProductById(productId);
            if (productError) {
              console.error(`ClientPolicyList: Error al obtener producto ${productId}:`, productError);
              newProductNames.set(productId, 'Producto Desconocido');
            } else if (productData) {
              newProductNames.set(productId, productData.name);
            }
          }
        }
        setProductNames(newProductNames);
        // --- DEBUGGING: Log nombres de productos cargados ---
        console.log('ClientPolicyList: Nombres de productos cargados:', newProductNames);
      }
      setLoading(false);
      console.log('ClientPolicyList: Carga de pólizas finalizada.');
    };

    fetchPoliciesAndDetails();
  }, [user?.id]); // Dependencia del user_id del perfil para recargar si cambia

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

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Mis Pólizas</h2>
        <Link
          to="/client/dashboard/policies/new"
          className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
        >
          Contratar Nueva Póliza
        </Link>
      </div>

      {policies.length === 0 ? (
        <p className="text-lg text-gray-600 text-center py-10">
          No tienes pólizas contratadas aún. ¿Te gustaría <Link to="/client/dashboard/policies/new" className="text-blue-600 hover:underline">contratar una nueva</Link>?
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Póliza
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Prima
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
              {policies.map((policy: Policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.policy_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {productNames.get(policy.product_id) || 'Cargando...'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ${policy.premium_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      policy.status === 'active' ? 'bg-green-100 text-green-800' :
                      policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      policy.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      policy.status === 'expired' ? 'bg-gray-400 text-gray-900' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/client/dashboard/policies/${policy.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Ver detalles
                    </Link>
                    <Link
  to={`/client/dashboard/policies/${policy.id}/edit`} // <--- ¡CAMBIO AQUÍ!
  className="text-indigo-600 hover:text-indigo-900"
>
  Editar
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