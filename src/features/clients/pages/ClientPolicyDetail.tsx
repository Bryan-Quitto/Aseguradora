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
  const [contractDetailsParsed, setContractDetailsParsed] = useState<Record<string, any> | null>(null); // Estado para los detalles del contrato parseados

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
      console.log("ClientPolicyDetail: Fetching details for policy ID:", policyId); // LOG 1

      // 1. Obtener los detalles de la póliza
      const { data: policyData, error: policyError } = await getPolicyById(policyId);
      console.log("ClientPolicyDetail: Policy data response:", { policyData, policyError }); // LOG 3

      if (policyError) {
        console.error(`Error al obtener póliza con ID ${policyId}:`, policyError);
        setError('Error al cargar los detalles de la póliza. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

if (!policyData) {
  setError('Póliza no encontrada.');
  setLoading(false);
  console.log("ClientPolicyDetail: Policy data is null (not found)."); // LOG 4
  return;
}

      setPolicy(policyData);

      // Parsear contract_details si existen
      if (policyData.contract_details) {
        try {
          const parsedDetails = JSON.parse(policyData.contract_details);
          setContractDetailsParsed(parsedDetails);
        } catch (parseError) {
          console.error("Error al parsear contract_details:", parseError);
          // Opcional: Establecer un error visible al usuario si el JSON es inválido
        }
      } else {
        setContractDetailsParsed(null);
      }

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

  // --- Lógica para póliza inactiva ---
  if (policy.status !== 'active') {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Póliza {policy.policy_number} Inactiva</h2>
        <p className="mb-4 text-lg">
          El estado actual de tu póliza es <span className="font-semibold text-red-800">"{policy.status.toUpperCase()}"</span>.
          Para ver los detalles completos y **activar** tu póliza, por favor, contacta a tu agente asignado.
        </p>
        {agent && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold text-red-800 mb-2">Detalles de tu Agente:</p>
            <p><strong className="font-medium">Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
            <p><strong className="font-medium">Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
            {agent.phone_number && <p><strong className="font-medium">Teléfono:</strong> {agent.phone_number}</p>}
          </div>
        )}
        {!agent && policy.agent_id && (
          <p className="mt-4 text-sm text-red-600">No se pudo cargar la información del agente asignado.</p>
        )}
        {!policy.agent_id && (
          <p className="mt-4 text-sm text-red-600">Esta póliza aún no tiene un agente asignado. Por favor, contacta a soporte si necesitas asistencia para activarla.</p>
        )}
        <Link
          to="/client/dashboard/policies"
          className="mt-8 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg shadow-md"
        >
          Volver a Mis Pólizas
        </Link>
      </div>
    );
  }

  // Helper para renderizar los detalles específicos de cada tipo de póliza
  const renderSpecificPolicyDetails = () => {
    if (!product || !contractDetailsParsed) {
      return <p className="text-gray-600 italic">No hay detalles específicos del contrato disponibles o el producto no ha sido cargado.</p>;
    }

    // Usamos product.type para determinar qué detalles mostrar
    switch (product.type) {
      case 'health':
        return (
          <>
            <h3 className="text-xl font-semibold text-green-800 mb-4">Detalles del Plan de Salud</h3>
            <p className="mb-2"><strong className="font-medium">Deducible:</strong> ${contractDetailsParsed.deductible?.toFixed(2) || 'N/A'}</p>
            <p className="mb-2"><strong className="font-medium">Coaseguro:</strong> {contractDetailsParsed.coinsurance || 'N/A'}%</p>
            <p className="mb-2"><strong className="font-medium">Máximo Desembolsable Anual:</strong> ${contractDetailsParsed.max_annual?.toFixed(2) || 'N/A'}</p>
            <p className="mb-2"><strong className="font-medium">Cobertura Dental:</strong> {contractDetailsParsed.has_dental_premium ? 'Premium' : contractDetailsParsed.has_dental_basic ? 'Básica' : 'No Incluida'}</p>
            <p className="mb-2"><strong className="font-medium">Cobertura de Visión:</strong> {contractDetailsParsed.wants_vision ? 'Sí' : 'No'}</p>

            {contractDetailsParsed.num_dependents > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="font-medium mb-2">Dependientes Incluidos ({contractDetailsParsed.num_dependents}):</p>
                <ul className="list-disc list-inside">
                  {contractDetailsParsed.dependents_details?.map((dep: any, index: number) => (
                    <li key={index} className="text-sm">
                      {dep.name} ({dep.relationship}) - Nacimiento: {dep.birth_date}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {contractDetailsParsed.wellness_rebate && (
                <p className="mb-2"><strong className="font-medium">Reembolso por Bienestar:</strong> ${contractDetailsParsed.wellness_rebate.toFixed(2)}/mes</p>
            )}
          </>
        );
      case 'life':
        return (
          <>
            <h3 className="text-xl font-semibold text-red-800 mb-4">Detalles del Seguro de Vida</h3>
            <p className="mb-2"><strong className="font-medium">Monto de Cobertura:</strong> ${contractDetailsParsed.coverage_amount?.toFixed(2) || 'N/A'}</p>
            <p className="mb-2"><strong className="font-medium">AD&D Incluido:</strong> {contractDetailsParsed.ad_d_included ? 'Sí' : 'No'}</p>
            {contractDetailsParsed.ad_d_included && (
              <p className="mb-2"><strong className="font-medium">Cobertura AD&D:</strong> ${contractDetailsParsed.ad_d_coverage?.toFixed(2) || 'N/A'}</p>
            )}
            <p className="mb-2"><strong className="font-medium">Edad al Inscribirse:</strong> {contractDetailsParsed.age_at_inscription || 'N/A'} años</p>

            {contractDetailsParsed.num_beneficiaries > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="font-medium mb-2">Beneficiarios ({contractDetailsParsed.num_beneficiaries}):</p>
                <ul className="list-disc list-inside">
                  {contractDetailsParsed.beneficiaries?.map((b: any, index: number) => (
                    <li key={index} className="text-sm">
                      {b.name} ({b.relationship}) - {b.percentage}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      case 'other':
        return (
          <>
            <h3 className="text-xl font-semibold text-orange-800 mb-4">Detalles Adicionales (Otros Seguros)</h3>
            {/* Aquí puedes mostrar el JSON bruto si no hay una forma estructurada o un mensaje genérico */}
            {contractDetailsParsed && Object.keys(contractDetailsParsed).length > 0 ? (
              <pre className="bg-orange-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
                {JSON.stringify(contractDetailsParsed, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-600">No hay detalles específicos adicionales para este tipo de póliza.</p>
            )}
          </>
        );
      default:
        return (
          <p className="text-gray-600 italic">Tipo de producto no reconocido o sin detalles específicos a mostrar.</p>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
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
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General de la Póliza</h3>
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
              <p className="mb-2"><strong className="font-medium">Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
              {agent.phone_number && <p className="mb-2"><strong className="font-medium">Teléfono:</strong> {agent.phone_number}</p>}
              {/* Puedes añadir más detalles del agente aquí si son relevantes */}
            </>
          ) : (
            <p className="text-gray-600">No hay un agente asignado a esta póliza.</p>
          )}
        </div>

        {/* Sección de Detalles Específicos del Contrato (dinámico) */}
        {/* Solo se muestra si la póliza está activa para que el cliente pueda ver los detalles */}
        {policy.status === 'active' && (
            <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
                {renderSpecificPolicyDetails()}
            </div>
        )}
      </div>
    </div>
  );
}