import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { Policy, getPoliciesByAgentId, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management'; // Ruta corregida
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend'; // Ruta corregida

/**
 * Componente para listar las solicitudes de seguro que un agente debe revisar.
 * Este componente carga las pólizas con estado 'pending' y permite al agente
 * revisarlas y, en una futura implementación, cambiar su estado.
 */
export default function AgentApplicationList() {
  const { user } = useAuth(); // Desestructuramos solo 'user' ya que su ID es lo que necesitamos para las llamadas a la DB
  const [pendingApplications, setPendingApplications] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    /**
     * Función asíncrona para cargar las solicitudes de póliza pendientes.
     * Filtra las pólizas con estado 'pending' y obtiene los nombres de clientes y productos asociados.
     */
    const fetchPendingApplications = async () => {
      if (!user?.id) { // Usamos user?.id para obtener el ID del usuario autenticado
        setError('No se pudo cargar el ID del agente. Asegúrate de estar logueado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Obtener todas las pólizas gestionadas por el agente.
      // Si la función de backend pudiera filtrar por status, sería más eficiente.
      const { data: policiesData, error: policiesError } = await getPoliciesByAgentId(user.id); // Usamos user.id

      if (policiesError) {
        console.error('Error al obtener pólizas para revisión:', policiesError);
        setError('Error al cargar las solicitudes. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (policiesData) {
        // Filtrar solo las pólizas que están en estado 'pending'
        const filteredApplications = policiesData.filter(policy => policy.status === 'pending');
        setPendingApplications(filteredApplications);

        // Crear conjuntos para IDs únicos de clientes y productos de las aplicaciones pendientes
        const uniqueClientIds = new Set(filteredApplications.map(p => p.client_id));
        const uniqueProductIds = new Set(filteredApplications.map(p => p.product_id));

        // Cargar nombres de clientes
        const newClientNames = new Map<string, string>(clientNames);
        const clientPromises = Array.from(uniqueClientIds).map(async (clientId) => {
          if (!newClientNames.has(clientId)) {
            const { data: clientData, error: clientError } = await getClientProfileById(clientId);
            if (clientError) {
              console.error(`Error al obtener cliente ${clientId}:`, clientError);
              newClientNames.set(clientId, 'Cliente Desconocido');
            } else if (clientData) {
              newClientNames.set(clientId, clientData.full_name || `${clientData.primer_nombre || ''} ${clientData.primer_apellido || ''}`.trim() || 'Nombre no disponible');
            }
          }
        });
        await Promise.all(clientPromises); // Esperar a que se carguen todos los nombres de clientes
        setClientNames(newClientNames);

        // Cargar nombres de productos
        const newProductNames = new Map<string, string>(productNames);
        const productPromises = Array.from(uniqueProductIds).map(async (productId) => {
          if (!newProductNames.has(productId)) {
            const { data: productData, error: productError } = await getInsuranceProductById(productId);
            if (productError) {
              console.error(`Error al obtener producto ${productId}:`, productError);
              newProductNames.set(productId, 'Producto Desconocido');
            } else if (productData) {
              newProductNames.set(productId, productData.name);
            }
          }
        });
        await Promise.all(productPromises); // Esperar a que se carguen todos los nombres de productos
        setProductNames(newProductNames);
      }
      setLoading(false);
    };

    fetchPendingApplications();
  }, [user?.id]); // La dependencia ahora es user?.id

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando solicitudes pendientes...</p>
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
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl border border-blue-100 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Solicitudes de póliza pendientes</h2>
        {/* Podrías añadir un botón para ver todas las pólizas, o para filtrar */}
      </div>

      {pendingApplications.length === 0 ? (
        <p className="text-lg text-gray-600 text-center py-10">
          No hay solicitudes de póliza pendientes de revisión en este momento.
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
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto Solicitado
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
              {pendingApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {app.policy_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {clientNames.get(app.client_id) || 'Cargando...'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {productNames.get(app.product_id) || 'Cargando...'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/agent/dashboard/applications/${app.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Revisar
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