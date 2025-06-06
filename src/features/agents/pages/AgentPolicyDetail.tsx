import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Policy, getPolicyById, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend';

/**
 * Componente para mostrar los detalles de una póliza específica para un agente.
 */
export default function AgentPolicyDetail() {
  const { id: policyId } = useParams<{ id: string }>(); // Obtiene el ID de la póliza de la URL
  const [policy, setPolicy] = useState<Policy | null>(null); // Estado para almacenar los detalles de la póliza
  const [client, setClient] = useState<ClientProfile | null>(null); // Estado para almacenar los detalles del cliente
  const [product, setProduct] = useState<InsuranceProduct | null>(null); // Estado para almacenar los detalles del producto
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error

  useEffect(() => {
    /**
     * Función asíncrona para cargar los detalles de la póliza, el cliente y el producto.
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

      // 2. Obtener los detalles del cliente asociado
      const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
      if (clientError) {
        console.error(`Error al obtener cliente con ID ${policyData.client_id}:`, clientError);
        // No bloqueamos si el cliente no se puede cargar, solo mostramos un mensaje
        setClient(null);
      } else {
        setClient(clientData);
      }

      // 3. Obtener los detalles del producto asociado
      const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
      if (productError) {
        console.error(`Error al obtener producto con ID ${policyData.product_id}:`, productError);
        // No bloqueamos si el producto no se puede cargar, solo mostramos un mensaje
        setProduct(null);
      } else {
        setProduct(productData);
      }

      setLoading(false);
    };

    fetchPolicyDetails();
  }, [policyId]); // Se ejecuta cada vez que el policyId cambia

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando detalles de la póliza...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-red-600 text-xl">{error}</p>
        <Link to="/agent/dashboard/policies" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Pólizas
        </Link>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-gray-600 text-xl">No se encontraron detalles para esta póliza.</p>
        <Link to="/agent/dashboard/policies" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Pólizas
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Detalles de la Póliza: {policy.policy_number}</h2>
        <Link
          to="/agent/dashboard/policies"
          className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
        >
          Volver al Listado
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

        {/* Sección del Cliente */}
        <div className="bg-green-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-green-800 mb-4">Información del Cliente</h3>
          {client ? (
            <>
              <p className="mb-2"><strong className="font-medium">Nombre Completo:</strong> {client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()}</p>
              <p className="mb-2"><strong className="font-medium">Email:</strong> {client.email}</p>
              <p className="mb-2"><strong className="font-medium">Identificación:</strong> {client.tipo_identificacion} - {client.numero_identificacion}</p>
              <p className="mb-2"><strong className="font-medium">Nacionalidad:</strong> {client.nacionalidad}</p>
              <p className="mb-2"><strong className="font-medium">Fecha de Nacimiento:</strong> {client.fecha_nacimiento}</p>
            </>
          ) : (
            <p className="text-gray-600">No se pudo cargar la información del cliente.</p>
          )}
        </div>

        {/* --- Sección de Detalles Adicionales del Seguro (Dinámica) --- */}
        {product && (
          <div className="md:col-span-2 bg-purple-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Detalles Adicionales del Seguro ({product.name})</h3>
            {product.type === 'life' && (
              // Detalles específicos para seguros de vida
              <div>
                <p className="mb-2"><strong className="font-medium">Monto de Cobertura:</strong> ${policy.coverage_amount?.toFixed(2) || 'N/A'}</p>
                <p className="mb-2"><strong className="font-medium">AD&D Incluido:</strong> {policy.ad_d_included ? 'Sí' : 'No'}</p>
                {policy.ad_d_included && <p className="mb-2"><strong className="font-medium">Cobertura AD&D:</strong> ${policy.ad_d_coverage?.toFixed(2) || 'N/A'}</p>}
                <p className="mb-2"><strong className="font-medium">Edad al Inscribirse:</strong> {policy.age_at_inscription || 'N/A'}</p>
                <p className="mb-2"><strong className="font-medium">Número de Beneficiarios:</strong> {policy.num_beneficiaries || 'N/A'}</p>
                {policy.beneficiaries && policy.beneficiaries.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-lg mb-2">Beneficiarios:</h4>
                    <ul className="list-disc list-inside ml-4">
                      {policy.beneficiaries.map((beneficiary, index) => (
                        <li key={index} className="mb-1">
                          {beneficiary.name} ({beneficiary.relationship}) - {beneficiary.percentage}%
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {policy.num_dependents && policy.num_dependents > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-lg mb-2">Dependientes (Vida):</h4>
                    <p className="mb-2"><strong className="font-medium">Número de Dependientes:</strong> {policy.num_dependents}</p>
                    {policy.dependents_details && policy.dependents_details.length > 0 && (
                      <ul className="list-disc list-inside ml-4">
                        {policy.dependents_details.map((dependent, index) => (
                          <li key={index} className="mb-1">
                            {dependent.name} ({dependent.relationship}) - Nacimiento: {dependent.birth_date}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {product.type === 'health' && (
              // Detalles específicos para seguros de salud
              <div>
                <p className="mb-2"><strong className="font-medium">Deducible:</strong> ${policy.deductible?.toFixed(2) || 'N/A'}</p>
                <p className="mb-2"><strong className="font-medium">Coaseguro:</strong> {policy.coinsurance ? `${policy.coinsurance}%` : 'N/A'}</p>
                <p className="mb-2"><strong className="font-medium">Máximo Anual:</strong> ${policy.max_annual?.toFixed(2) || 'N/A'}</p>
                <p className="mb-2"><strong className="font-medium">Cobertura Dental:</strong> {policy.has_dental ? 'Sí' : 'No'} {policy.has_dental_premium ? '(Premium)' : (policy.has_dental_basic ? '(Básico)' : '')}</p>
                <p className="mb-2"><strong className="font-medium">Cobertura Visión:</strong> {policy.has_vision ? 'Sí' : 'No'} {policy.has_vision_full ? '(Completa)' : (policy.has_vision_basic ? '(Básico)' : '')}</p>
                {policy.wellness_rebate && policy.wellness_rebate > 0 && (
                  <p className="mb-2"><strong className="font-medium">Reembolso Bienestar:</strong> ${policy.wellness_rebate.toFixed(2)}/mes</p>
                )}
                {policy.num_dependents_health && policy.num_dependents_health > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-lg mb-2">Dependientes (Salud):</h4>
                    <p className="mb-2"><strong className="font-medium">Número de Dependientes:</strong> {policy.num_dependents_health}</p>
                    {policy.dependents_details_health && policy.dependents_details_health.length > 0 && (
                      <ul className="list-disc list-inside ml-4">
                        {policy.dependents_details_health.map((dependent, index) => (
                          <li key={index} className="mb-1">
                            {dependent.name} ({dependent.relationship}) - Nacimiento: {dependent.birth_date}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Puedes añadir más bloques `product.type === 'other'` para otros tipos de seguro */}
            {product.type === 'other' && (
              <div>
                <p className="text-gray-600">No hay detalles específicos para este tipo de producto.</p>
              </div>
            )}
          </div>
        )}

        {/* Sección de Detalles del Contrato (si existen) - Mantenido para JSON genérico */}
        {policy.contract_details && Object.keys(policy.contract_details).length > 0 && (
          <div className="md:col-span-2 bg-purple-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Detalles Adicionales del Contrato (JSON Crudo)</h3>
            <pre className="bg-purple-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
              {JSON.stringify(policy.contract_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Botones de acción (ej. editar, cancelar, etc.) */}
      <div className="mt-8 flex justify-end gap-4">
        {/* Puedes añadir botones para editar la póliza aquí */}
        {/* <button
          className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition duration-300 shadow-md"
        >
          Editar Póliza
        </button> */}
        {/* <button
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-300 shadow-md"
        >
          Cancelar Póliza
        </button> */}
      </div>
    </div>
  );
}