import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { Policy, getPoliciesByAgentId, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend'; // Importa getClientProfileById

// Extiende Policy para incluir numero_identificacion
type PolicyWithCedula = Policy & { numero_identificacion: string };

/**
 * Componente para listar las pólizas gestionadas por un agente.
 */
export default function AgentPolicyList() {
  const { profile, user } = useAuth(); // Obtiene el perfil del agente autenticado y el objeto user
  // Cambia el tipo del estado policies:
  const [policies, setPolicies] = useState<PolicyWithCedula[]>([]); // Estado para almacenar las pólizas
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map()); // Mapa para almacenar nombres de clientes
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map()); // Mapa para almacenar nombres de productos
  const [searchCedula, setSearchCedula] = useState('');

  useEffect(() => {
    /**
     * Función asíncrona para cargar las pólizas del agente y los nombres asociados.
     */
    const fetchPoliciesAndDetails = async () => {
      if (!user?.id) {
        setError('No se pudo cargar el ID del agente.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Obtener las pólizas del agente
      const { data: policiesData, error: policiesError } = await getPoliciesByAgentId(user.id);

      if (policiesError) {
        console.error('Error al obtener pólizas:', policiesError);
        setError('Error al cargar las pólizas. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (policiesData) {
        // Crear conjuntos para IDs únicos de clientes y productos
        const uniqueClientIds = new Set(policiesData.map(p => p.client_id));
        const uniqueProductIds = new Set(policiesData.map(p => p.product_id));

        // Cargar nombres y cédulas de clientes
        const newClientNames = new Map<string, string>(clientNames);
        const cedulasPorCliente = new Map<string, string>();
        for (const clientId of uniqueClientIds) {
          if (!newClientNames.has(clientId) || !cedulasPorCliente.has(clientId)) {
            const { data: clientData, error: clientError } = await getClientProfileById(clientId);
            if (clientError) {
              newClientNames.set(clientId, 'Cliente Desconocido');
              cedulasPorCliente.set(clientId, '');
            } else if (clientData) {
              newClientNames.set(clientId, clientData.full_name || `${clientData.primer_nombre || ''} ${clientData.primer_apellido || ''}`.trim() || 'Nombre no disponible');
              cedulasPorCliente.set(clientId, clientData.numero_identificacion || '');
            }
          }
        }
        setClientNames(newClientNames);

        // Agrega la cédula al objeto policy
        const policiesWithCedula = policiesData.map(policy => ({
          ...policy,
          numero_identificacion: cedulasPorCliente.get(policy.client_id) || ''
        }));
        setPolicies(policiesWithCedula);

        // Cargar nombres de productos
        const newProductNames = new Map<string, string>(productNames);
        for (const productId of uniqueProductIds) {
          if (!newProductNames.has(productId)) { // Evitar recargar si ya está en el mapa
            const { data: productData, error: productError } = await getInsuranceProductById(productId);
            if (productError) {
              console.error(`Error al obtener producto ${productId}:`, productError);
              newProductNames.set(productId, 'Producto Desconocido');
            } else if (productData) {
              newProductNames.set(productId, productData.name);
            }
          }
        }
        setProductNames(newProductNames);
      }
      setLoading(false);
    };

    fetchPoliciesAndDetails();
  }, [user?.id]); // Dependencia del user_id del perfil para recargar si cambia

  // Filtrar pólizas por número_identificacion (cedula)
  const filteredPolicies = policies.filter((policy) => {
    return searchCedula === '' || policy.numero_identificacion.startsWith(searchCedula);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando pólizas...</p>
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
        <h2 className="text-3xl font-bold text-blue-700">Pólizas gestionadas</h2>
        <Link
          to="/agent/dashboard/policies/new"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          Crear nueva póliza
        </Link>
      </div>

      {/* Barra de búsqueda ahora ocupa todo el ancho */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por cédula..."
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={searchCedula}
          maxLength={10}
          inputMode="numeric"
          pattern="\d*"
          onChange={e => {
            // Solo permite números y máximo 10 caracteres
            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
            setSearchCedula(value);
          }}
        />
      </div>

      {filteredPolicies.length === 0 ? (
        <p className="text-lg text-gray-600 text-center py-10">
          No hay pólizas que coincidan con la búsqueda.
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
                  Cédula
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
              {filteredPolicies.map((policy) => {
                return (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {policy.policy_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {clientNames.get(policy.client_id) || 'Cargando...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {policy.numero_identificacion}
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
                        to={`/agent/dashboard/policies/${policy.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Ver Detalles
                      </Link>
                      <Link
                        to={`/agent/dashboard/policies/${policy.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Editar
                      </Link>
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