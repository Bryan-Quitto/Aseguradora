import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Policy, getPolicyById, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';
import { AgentProfile, getAgentProfileById } from '../../agents/hooks/agente_backend'; // Importa getAgentProfileById

/**
 * Componente para mostrar los detalles de una póliza específica para un cliente.
 */
export default function ClientPolicyDetail() {
  const { id: policyId } = useParams<{ id: string }>(); // Obtiene el ID de la póliza de la URL
  const [policy, setPolicy] = useState<Policy | null>(null); // Estado para almacenar los detalles de la póliza
  const [product, setProduct] = useState<InsuranceProduct | null>(null); // Estado para almacenar los detalles del producto
  const [agent, setAgent] = useState<AgentProfile | null>(null); // Estado para almacenar los detalles del agente
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error

  useEffect(() => {
    /**
     * Función asíncrona para cargar los detalles de la póliza, el producto y el agente.
     */
    const fetchPolicyDetails = async () => {
      if (!policyId) {
        setError('ID de póliza no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1. Obtener los detalles de la póliza
      const { data: policyData, error: policyError } = await getPolicyById(policyId);

      if (policyError) {
        console.error(`Error al obtener póliza con ID ${policyId}:`, policyError);
        setError('Error al cargar los detalles de la póliza. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (!policyData) {
        setError('Póliza no encontrada.');
        setLoading(false);
        return;
      }

      setPolicy(policyData);

      // 2. Obtener los detalles del producto asociado
      const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
      if (productError) {
        console.error(`Error al obtener producto con ID ${policyData.product_id}:`, productError);
        setProduct(null); // No bloqueamos si el producto no se puede cargar
      } else {
        setProduct(productData);
      }

      // 3. Obtener los detalles del agente asociado (si existe)
      if (policyData.agent_id) {
        const { data: agentData, error: agentError } = await getAgentProfileById(policyData.agent_id);
        if (agentError) {
          console.error(`Error al obtener agente con ID ${policyData.agent_id}:`, agentError);
          setAgent(null); // No bloqueamos si el agente no se puede cargar
        } else {
          setAgent(agentData);
        }
      } else {
        setAgent(null);
      }

      setLoading(false);
    };

    fetchPolicyDetails();
  }, [policyId]); // Se ejecuta cada vez que el policyId cambia

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando detalles de tu póliza...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-red-600 text-xl mb-4">{error}</p>
        <Link to="/client/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Mis Pólizas
        </Link>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta póliza.</p>
        <Link to="/client/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Mis Pólizas
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Detalles de Mi Póliza: {policy.policy_number}</h2>
        <Link
          to="/client/dashboard/policies"
          className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
        >
          Volver a Mis Pólizas
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
        {/* Sección de la Póliza */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Información de la Póliza</h3>
          <p className="mb-2"><strong className="font-medium">Número de Póliza:</strong> {policy.policy_number}</p>
          <p className="mb-2"><strong className="font-medium">Producto:</strong> {product ? product.name : 'Cargando...'}</p>
          <p className="mb-2"><strong className="font-medium">Tipo de Producto:</strong> {product ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : 'Cargando...'}</p>
          <p className="mb-2"><strong className="font-medium">Fecha de Inicio:</strong> {policy.start_date}</p>
          <p className="mb-2"><strong className="font-medium">Fecha de Fin:</strong> {policy.end_date}</p>
          <p className="mb-2"><strong className="font-medium">Monto de Prima:</strong> ${policy.premium_amount.toFixed(2)} {policy.payment_frequency.charAt(0).toUpperCase() + policy.payment_frequency.slice(1)}</p>
          <p className="mb-2"><strong className="font-medium">Estado:</strong>
            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              policy.status === 'active' ? 'bg-green-100 text-green-800' :
              policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
            </span>
          </p>
        </div>

        {/* Sección del Agente (si existe) */}
        <div className="bg-purple-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-purple-800 mb-4">Agente Asignado</h3>
          {agent ? (
            <>
              <p className="mb-2"><strong className="font-medium">Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
              <p className="mb-2"><strong className="font-medium">Email:</strong> {agent.email}</p>
              <p className="mb-2"><strong className="font-medium">Identificación:</strong> {agent.numero_identificacion}</p>
            </>
          ) : (
            <p className="text-gray-600">No hay un agente asignado a esta póliza.</p>
          )}
        </div>

        {/* Sección de Detalles del Contrato (si existen) */}
        {policy.contract_details && Object.keys(policy.contract_details).length > 0 && (
          <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Detalles Adicionales del Contrato</h3>
            <pre className="bg-yellow-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
              {JSON.stringify(policy.contract_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Botones de acción (ej. editar, cancelar, etc.) */}
      <div className="mt-8 flex justify-end gap-4">
        {/* Aquí podrías añadir botones para acciones del cliente, como solicitar cancelación */}
      </div>
    </div>
  );
}