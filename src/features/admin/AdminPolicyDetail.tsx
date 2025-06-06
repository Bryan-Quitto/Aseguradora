import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Policy,
  getPolicyById,
  InsuranceProduct,
  getInsuranceProductById,
  updatePolicy,
  deletePolicy,
} from '../policies/policy_management';

// !!! IMPORTANTE: IMPORTA ClientProfile DESDE EL ARCHIVO DONDE ESTÁ DEFINIDA
import { ClientProfile, getClientProfileById } from '../clients/hooks/cliente_backend'; // ✅ Esta es la forma correcta

/**
 * Componente para mostrar los detalles de una póliza específica para un ADMINISTRADOR.
 * Incluye información detallada de la póliza, el cliente asociado y el producto de seguro.
 * Ofrece funcionalidades adicionales para el administrador, como la edición o cancelación.
 */
export default function AdminPolicyDetail() {
  const { id: policyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [product, setProduct] = useState<InsuranceProduct | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicyDetails = async () => {
      if (!policyId) {
        setError('ID de póliza no proporcionado. No se puede cargar los detalles.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPolicy(null);
      setClient(null);
      setProduct(null);

      try {
        const { data: policyData, error: policyError } = await getPolicyById(policyId);

        if (policyError) {
          console.error(`Error al obtener póliza con ID ${policyId}:`, policyError);
          setError('Error al cargar los detalles de la póliza. Por favor, inténtalo de nuevo.');
          setLoading(false);
          return;
        }

        if (!policyData) {
          setError('Póliza no encontrada. Verifique el ID proporcionado.');
          setLoading(false);
          return;
        }

        setPolicy(policyData);

        if (policyData.client_id) {
          const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
          if (clientError) {
            console.warn(`Advertencia: Error al obtener cliente con ID ${policyData.client_id}:`, clientError);
            setClient(null);
          } else {
            setClient(clientData); // <-- Aquí es donde fallaba antes, ahora clientData es ClientProfile | null
          }
        } else {
          setClient(null);
        }

        if (policyData.product_id) {
          const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
          if (productError) {
            console.warn(`Advertencia: Error al obtener producto con ID ${policyData.product_id}:`, productError);
            setProduct(null);
          } else {
            setProduct(productData);
          }
        } else {
          setProduct(null);
        }

      } catch (e: any) {
        console.error("Error inesperado en fetchPolicyDetails:", e);
        setError('Ocurrió un error inesperado. Por favor, contacta a soporte.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyDetails();
  }, [policyId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-blue-50 rounded-xl p-8 shadow-inner">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-blue-700 text-xl font-medium">Cargando detalles de la póliza...</p>
        <p className="text-gray-500 text-sm mt-2">Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-red-50 rounded-xl p-8 shadow-inner text-center">
        <p className="text-red-700 text-2xl font-bold mb-4">¡Error al cargar la póliza! 😟</p>
        <p className="text-red-600 text-lg mb-6">{error}</p>
        <Link to="/admin/dashboard/policies" className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition duration-300 shadow-md transform hover:scale-105">
          Volver al Listado de Pólizas
        </Link>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-gray-50 rounded-xl p-8 shadow-inner text-center">
        <p className="text-gray-700 text-2xl font-bold mb-4">Póliza no encontrada. 🤔</p>
        <p className="text-gray-600 text-lg mb-6">El ID de póliza proporcionado no corresponde a ninguna póliza existente.</p>
        <Link to="/admin/dashboard/policies" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md transform hover:scale-105">
          Volver al Listado de Pólizas
        </Link>
      </div>
    );
  }

  const handleEditPolicy = () => {
    navigate(`/admin/dashboard/policies/${policyId}/edit`);
  };

  const handleChangePolicyStatus = async (newStatus: 'active' | 'pending' | 'cancelled' | 'expired' | 'rejected') => {
    if (!window.confirm(`¿Estás seguro de cambiar el estado de la póliza a "${newStatus}"?`)) {
      return;
    }
    try {
      const { data, error: updateError } = await updatePolicy(policy.id, { status: newStatus });
      if (updateError) {
        alert(`Error al actualizar el estado: ${updateError.message}`);
      } else {
        setPolicy(data);
        alert(`Estado de la póliza actualizado a "${newStatus}" con éxito.`);
      }
    } catch (e: any) {
      alert(`Error inesperado al cambiar estado: ${e.message}`);
    } finally {
      // setLoadingAction(false);
    }
  };

  const handleDeletePolicy = async () => {
    if (!window.confirm('¡ADVERTENCIA! Estás a punto de ELIMINAR esta póliza de forma permanente. ¿Estás seguro?')) {
      return;
    }
    try {
      const { success, error: deleteError } = await deletePolicy(policy.id);
      if (deleteError) {
        alert(`Error al eliminar la póliza: ${deleteError.message}`);
      } else if (success) {
        alert('Póliza eliminada con éxito.');
        navigate('/admin/dashboard/policies');
      }
    } catch (e: any) {
      alert(`Error inesperado al eliminar: ${e.message}`);
    } finally {
      // setLoadingAction(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 mx-auto transform transition-all duration-300 ease-in-out hover:shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-4xl font-extrabold text-blue-800 mb-4 md:mb-0">
          Póliza: {product ? product.name : 'Detalle de Póliza'}
          <span className="block text-lg font-normal text-gray-500 mt-1">Nº: {policy.policy_number}</span>
        </h2>
        <Link
          to="/admin/dashboard/policies"
          className="inline-flex items-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition duration-300 shadow-md transform hover:scale-105"
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>
          Volver al Listado
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-700">
        {/* Policy Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-7 rounded-lg shadow-md border border-blue-200">
          <h3 className="text-2xl font-semibold text-blue-800 mb-5 border-b pb-3 border-blue-300">Información General de la Póliza</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Número de Póliza:</dt>
              <dd className="mt-1 text-lg font-semibold text-blue-900">{policy.policy_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Producto:</dt>
              <dd className="mt-1 text-lg font-semibold">{product ? product.name : 'No disponible'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo de Producto:</dt>
              <dd className="mt-1 text-lg font-medium">{product ? (product.type.charAt(0).toUpperCase() + product.type.slice(1)) : 'No disponible'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fechas de Vigencia:</dt>
              <dd className="mt-1 text-lg font-medium">{policy.start_date} al {policy.end_date}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Monto de Prima:</dt>
              <dd className="mt-1 text-lg font-semibold text-green-700">${policy.premium_amount.toFixed(2)} <span className="text-base font-normal text-gray-600">({policy.payment_frequency.charAt(0).toUpperCase() + policy.payment_frequency.slice(1)})</span></dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado:</dt>
              <dd className="mt-1">
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full shadow-sm ${
                  policy.status === 'active' ? 'bg-green-200 text-green-900' :
                  policy.status === 'pending' ? 'bg-yellow-200 text-yellow-900' :
                  policy.status === 'cancelled' ? 'bg-red-200 text-red-900' :
                  policy.status === 'expired' ? 'bg-gray-300 text-gray-900' :
                  'bg-red-200 text-red-900'
                }`}>
                  {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                </span>
              </dd>
            </div>
            {policy.contract_details && (
              (() => {
                let parsedDetails: Record<string, any> | null = null;
                if (typeof policy.contract_details === 'string') {
                  try {
                    parsedDetails = JSON.parse(policy.contract_details);
                  } catch (e) {
                    console.warn("Error parsing contract_details as JSON:", e);
                    return null;
                  }
                } else if (typeof policy.contract_details === 'object' && policy.contract_details !== null) {
                  parsedDetails = policy.contract_details;
                }

                if (parsedDetails && parsedDetails.description) {
                  return (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Descripción (de Contrato):</dt>
                      <dd className="mt-1 text-base italic text-gray-600">{parsedDetails.description}</dd>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </dl>
        </div>

        {/* Client Section */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 p-7 rounded-lg shadow-md border border-green-200">
          <h3 className="text-2xl font-semibold text-green-800 mb-5 border-b pb-3 border-green-300">Información del Cliente</h3>
          {client ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre Completo:</dt>
                <dd className="mt-1 text-lg font-semibold">{client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email:</dt>
                <dd className="mt-1 text-lg font-medium text-blue-700">{client.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Identificación:</dt>
                <dd className="mt-1 text-lg font-medium">{client.tipo_identificacion} - {client.numero_identificacion}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nacionalidad:</dt>
                <dd className="mt-1 text-lg font-medium">{client.nacionalidad}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Nacimiento:</dt>
                <dd className="mt-1 text-lg font-medium">{client.fecha_nacimiento}</dd>
              </div>
              <div className="mt-4 pt-3 border-t border-green-300">
                {client.user_id && ( // <-- Cambiado 'client.id' a 'client.user_id'
                  <Link to={`/admin/dashboard/clients/${client.user_id}`} className="text-green-700 hover:text-green-900 text-sm font-semibold inline-flex items-center"> {/* <-- Cambiado 'client.id' a 'client.user_id' */}
                    Ver Perfil Completo del Cliente
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </Link>
                )}
              </div>
            </dl>
          ) : (
            <p className="text-gray-600 italic">No se pudo cargar la información del cliente o no está disponible.</p>
          )}
        </div>

        {/* --- Dynamic Insurance Product Details Section --- */}
        {product && (
          <div className="md:col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 p-7 rounded-lg shadow-md border border-purple-200">
            <h3 className="text-2xl font-semibold text-purple-800 mb-5 border-b pb-3 border-purple-300">
              Detalles Específicos del Producto: {product.name}
            </h3>
            <dl className="space-y-3">
              {/* Specific details for life insurance */}
              {product.type === 'life' && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Monto de Cobertura:</dt>
                    <dd className="mt-1 text-lg font-medium">${policy.coverage_amount?.toFixed(2) || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">AD&D Incluido:</dt>
                    <dd className="mt-1 text-lg font-medium">{policy.ad_d_included ? 'Sí' : 'No'}</dd>
                  </div>
                  {policy.ad_d_included && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cobertura AD&D:</dt>
                      <dd className="mt-1 text-lg font-medium">${policy.ad_d_coverage?.toFixed(2) || 'N/A'}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Edad al Inscribirse:</dt>
                    <dd className="mt-1 text-lg font-medium">{policy.age_at_inscription || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de Beneficiarios:</dt>
                    <dd className="mt-1 text-lg font-medium">{policy.num_beneficiaries || 'N/A'}</dd>
                  </div>
                  {policy.beneficiaries && policy.beneficiaries.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-300">
                      <dt className="text-lg font-semibold text-purple-700 mb-2">Beneficiarios:</dt>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {policy.beneficiaries.map((beneficiary, index) => (
                          <li key={index} className="text-base">
                            <span className="font-medium">{beneficiary.name}</span> ({beneficiary.relationship}) - {beneficiary.percentage}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {policy.num_dependents && policy.num_dependents > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-300">
                      <dt className="text-lg font-semibold text-purple-700 mb-2">Dependientes (Vida):</dt>
                      <p className="mb-2"><strong className="font-medium">Total:</strong> {policy.num_dependents}</p>
                      {policy.dependents_details && policy.dependents_details.length > 0 && (
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          {policy.dependents_details.map((dependent, index) => (
                            <li key={index} className="text-base">
                              <span className="font-medium">{dependent.name}</span> ({dependent.relationship}) - Nacimiento: {dependent.birth_date}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Specific details for health insurance */}
              {product.type === 'health' && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Deducible:</dt>
                    <dd className="mt-1 text-lg font-medium">${policy.deductible?.toFixed(2) || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Coaseguro:</dt>
                    <dd className="mt-1 text-lg font-medium">{policy.coinsurance ? `${policy.coinsurance}%` : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Máximo Anual:</dt>
                    <dd className="mt-1 text-lg font-medium">${policy.max_annual?.toFixed(2) || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cobertura Dental:</dt>
                    <dd className="mt-1 text-lg font-medium">
                      {policy.has_dental ? 'Sí' : 'No'}
                      {policy.has_dental_premium ? ' (Premium)' : (policy.has_dental_basic ? ' (Básico)' : '')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cobertura Visión:</dt>
                    <dd className="mt-1 text-lg font-medium">
                      {policy.has_vision ? 'Sí' : 'No'}
                      {policy.has_vision_full ? ' (Completa)' : (policy.has_vision_basic ? ' (Básico)' : '')}
                    </dd>
                  </div>
                  {policy.wellness_rebate && policy.wellness_rebate > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reembolso Bienestar:</dt>
                      <dd className="mt-1 text-lg font-medium">${policy.wellness_rebate.toFixed(2)}/mes</dd>
                    </div>
                  )}
                  {policy.num_dependents_health && policy.num_dependents_health > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-300">
                      <dt className="text-lg font-semibold text-purple-700 mb-2">Dependientes (Salud):</dt>
                      <p className="mb-2"><strong className="font-medium">Total:</strong> {policy.num_dependents_health}</p>
                      {policy.dependents_details_health && policy.dependents_details_health.length > 0 && (
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          {policy.dependents_details_health.map((dependent, index) => (
                            <li key={index} className="text-base">
                              <span className="font-medium">{dependent.name}</span> ({dependent.relationship}) - Nacimiento: {dependent.birth_date}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Auto Insurance Details - Nota: Tu `InsuranceProduct` solo tiene 'life', 'health', 'other'.
                  Si quieres 'auto', debes añadirlo a la interfaz `InsuranceProduct`.
                  Por ahora, lo he añadido como un caso si lo agregas más tarde. */}
              {product.type === 'other' && product.name.toLowerCase().includes('auto') && (
                <>
                  {/* Estos campos no existen en tu interfaz Policy actual.
                      Tendrás que añadirlos a la interfaz Policy si son relevantes para "auto". */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Marca:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Modelo:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Año:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de VIN:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cobertura de Colisión:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cobertura Completa:</dt>
                    <dd className="mt-1 text-lg font-medium">{'N/A'}</dd>
                  </div>
                </>
              )}

              {/* If no specific details */}
              {!(product.type === 'life' || product.type === 'health') && (
                <p className="text-gray-600 italic">No hay detalles específicos configurados para este tipo de producto.</p>
              )}
            </dl>
          </div>
        )}

        {/* Contract Details Section (raw JSON) */}
        {policy.contract_details && (
          <div className="md:col-span-2 bg-gray-50 p-7 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-800 mb-5 border-b pb-3 border-gray-300">
              Detalles Adicionales del Contrato (JSON Crudo)
            </h3>
            <pre className="bg-gray-100 p-5 rounded-md text-sm overflow-x-auto font-mono leading-relaxed text-gray-800 border border-gray-200">
              {typeof policy.contract_details === 'string'
                ? (() => {
                    try {
                      return JSON.stringify(JSON.parse(policy.contract_details), null, 2);
                    } catch (e) {
                      return policy.contract_details; // Si no es un JSON válido, muestra el string tal cual
                    }
                  })()
                : JSON.stringify(policy.contract_details, null, 2)}
            </pre>
            <p className="text-xs text-gray-500 mt-2 italic">
              Este campo contiene información adicional no estructurada que podría ser relevante.
            </p>
          </div>
        )}
      </div>

      {/* --- Admin Action Buttons --- */}
      <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-4">
        {/* Edit Policy Link */}
        <Link
          to={`/admin/dashboard/policies/${policyId}/edit`}
          className="inline-flex items-center px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-105"
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z"></path></svg>
          Editar Póliza
        </Link>

        {/* Dropdown/Buttons to change status */}
        <div className="relative inline-block text-left">
          <button
            id="status-options-menu"
            aria-haspopup="true"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => document.getElementById('status-dropdown')?.classList.toggle('hidden')}
          >
            Cambiar Estado
            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div id="status-dropdown" className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden z-10" role="menu" aria-orientation="vertical" aria-labelledby="status-options-menu">
            <div className="py-1" role="none">
              {/* Options to change status */}
              {policy.status !== 'active' && (
                <button
                  onClick={() => handleChangePolicyStatus('active')}
                  className="block px-4 py-2 text-sm text-gray-700 w-full text-left hover:bg-gray-100"
                  role="menuitem"
                >
                  Activar
                </button>
              )}
              {policy.status !== 'pending' && (
                <button
                  onClick={() => handleChangePolicyStatus('pending')}
                  className="block px-4 py-2 text-sm text-gray-700 w-full text-left hover:bg-gray-100"
                  role="menuitem"
                >
                  Pendiente
                </button>
              )}
              {policy.status !== 'cancelled' && (
                <button
                  onClick={() => handleChangePolicyStatus('cancelled')}
                  className="block px-4 py-2 text-sm text-gray-700 w-full text-left hover:bg-gray-100"
                  role="menuitem"
                >
                  Cancelar
                </button>
              )}
              {policy.status !== 'expired' && (
                <button
                  onClick={() => handleChangePolicyStatus('expired')}
                  className="block px-4 py-2 text-sm text-gray-700 w-full text-left hover:bg-gray-100"
                  role="menuitem"
                >
                  Expirar
                </button>
              )}
              {policy.status !== 'rejected' && (
                <button
                  onClick={() => handleChangePolicyStatus('rejected')}
                  className="block px-4 py-2 text-sm text-gray-700 w-full text-left hover:bg-gray-100"
                  role="menuitem"
                >
                  Rechazar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Delete Policy Button */}
        <button
          onClick={handleDeletePolicy}
          className="inline-flex items-center px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-300 shadow-lg transform hover:scale-105"
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path></svg>
          Eliminar Póliza
        </button>
      </div>
    </div>
  );
}