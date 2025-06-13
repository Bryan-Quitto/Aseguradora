import { useEffect, useState } from 'react';
import { useParams, Link} from 'react-router-dom';
// Asegúrate de que esta importación sea CORRECTA y que tu archivo policy_management.ts
// contenga las definiciones de Policy, getPolicyById, InsuranceProduct, getInsuranceProductById, updatePolicy.
// La interfaz `Policy` en `policy_management.ts` DEBE incluir 'awaiting_signature' como un estado válido.
import { Policy, getPolicyById, InsuranceProduct, getInsuranceProductById, updatePolicy } from '../../policies/policy_management';
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend';
import { useAuth } from 'src/contexts/AuthContext';
import { enviarLinkFirma } from 'src/utils/enviarLinkFirma';


/**
 * Componente para mostrar los detalles de una solicitud de póliza pendiente
 * y permitir al agente revisarla y tomar una acción (aprobar/rechazar).
 */
export default function AgentApplicationDetail() {
  const { id: applicationId } = useParams<{ id: string }>(); // Obtiene el ID de la solicitud (póliza) de la URL
  const { user } = useAuth(); // Usamos el hook useAuth para obtener el usuario autenticado

  const [application, setApplication] = useState<Policy | null>(null); // La solicitud es una póliza
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [product, setProduct] = useState<InsuranceProduct | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null); // Mensaje para acciones (aprobado/rechazado)

  useEffect(() => {
    /**
     * Función asíncrona para cargar los detalles de la solicitud, el cliente y el producto.
     */
    const fetchApplicationDetails = async () => {
      if (!applicationId) {
        setError('ID de solicitud no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setActionMessage(null);

      // 1. Obtener los detalles de la póliza (solicitud)
      const { data: policyData, error: policyError } = await getPolicyById(applicationId);

      if (policyError) {
        console.error(`Error al obtener solicitud con ID ${applicationId}:`, policyError);
        setError('Error al cargar los detalles de la solicitud. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      // Manejar explícitamente el caso de policyData nulo antes de acceder a sus propiedades
      if (!policyData) {
        setError('Solicitud no encontrada.'); // Mensaje más específico
        setLoading(false);
        return;
      }

      // Permitir que se cargue si está pendiente o esperando firma
      if (policyData.status !== 'pending' && policyData.status !== 'awaiting_signature') {
        setError(`Solicitud no encontrada o no está pendiente/esperando firma. Estado actual: ${policyData.status}`);
        setLoading(false);
        return;
      }

      setApplication(policyData);

      // 2. Obtener los detalles del cliente asociado
      const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
      if (clientError) {
        console.error(`Error al obtener cliente para solicitud ${applicationId}:`, clientError);
        setClient(null);
      } else {
        setClient(clientData);
      }

      // 3. Obtener los detalles del producto asociado
      const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
      if (productError) {
        console.error(`Error al obtener producto para solicitud ${applicationId}:`, productError);
        setProduct(null);
      } else {
        setProduct(productData);
      }

      setLoading(false);
    };

    fetchApplicationDetails();
  }, [applicationId]); // Se ejecuta cada vez que el applicationId cambia

  /**
   * Maneja la acción de aprobar o rechazar una solicitud.
   * @param actionType 'approve' o 'reject'.
   */
  const handleStatusUpdate = async (actionType: 'approve' | 'reject') => {
    // Verificamos que tengamos la aplicación, el usuario autenticado y los datos del cliente
    if (!application || !user?.id || !client) { 
      setError('No se pudo procesar la solicitud. Faltan datos.');
      return;
    }

    setLoading(true);
    setError(null);
    setActionMessage(null);

    let newStatus: Policy['status']; // Usamos el tipo 'Policy['status']' para garantizar la compatibilidad
    let successMessage: string;
    let errorMessagePrefix: string;

    if (actionType === 'approve') {
      newStatus = 'awaiting_signature'; // ¡CAMBIO CLAVE! La póliza ahora espera la firma, no se activa de inmediato
      successMessage = `Solicitud ${application.policy_number} aprobada preliminarmente. Se ha enviado un enlace de firma al correo ${client.email}.`;
      errorMessagePrefix = 'aprobar';
    } else { // actionType === 'reject'
      newStatus = 'rejected';
      successMessage = `Solicitud ${application.policy_number} rechazada exitosamente.`;
      errorMessagePrefix = 'rechazar';
    }

    const updates: Partial<Policy> = { // Aseguramos que 'updates' sea compatible con 'Partial<Policy>'
      status: newStatus,
      updated_at: new Date().toISOString(), // Actualizar la fecha de modificación
    };

    try {
      const { data, error: updateError } = await updatePolicy(application.id, updates);

      if (updateError) {
        throw new Error(`Error al ${errorMessagePrefix} la solicitud: ${updateError.message}`);
      }

      if (data) {
        setApplication(data); // Actualiza el estado local de la aplicación para reflejar el nuevo estado

        // Si la póliza fue aprobada preliminarmente, enviar el magic link para firma
        if (actionType === 'approve' && client.email) {
          const { success, message } = await enviarLinkFirma(client.email, data.id); // data.id es el ID de la póliza

          if (!success) {
            setError(`La póliza fue aprobada preliminarmente pero hubo un error al enviar el enlace de firma: ${message}`);
            // OPCIONAL: Podrías considerar revertir el estado de la póliza a 'pending' si el email no se envía con éxito.
            // Esto implicaría otra llamada a updatePolicy aquí.
          } else {
            setActionMessage(successMessage);
          }
        } else { // Si fue rechazada, solo muestra el mensaje de rechazo
          setActionMessage(successMessage);
        }
      }
    } catch (err) {
      console.error('Error en handleStatusUpdate:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando detalles de la solicitud...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-red-600 text-xl mb-4">{error}</p>
        <Link to="/agent/dashboard/applications" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Solicitudes
        </Link>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta solicitud.</p>
        <Link to="/agent/dashboard/applications" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
          Volver a Solicitudes
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Revisar Solicitud: {application.policy_number}</h2>
        <Link
          to="/agent/dashboard/applications"
          className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
        >
          Volver a Solicitudes
        </Link>
      </div>

      {actionMessage && (
        <div className={`px-4 py-3 rounded relative mb-4 ${actionMessage.includes('exitosa') || actionMessage.includes('preliminarmente') ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`} role="alert">
          <strong className="font-bold">¡Mensaje!</strong>
          <span className="block sm:inline"> {actionMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
        {/* Sección de la Solicitud (Póliza) */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Información de la Solicitud</h3>
          <p className="mb-2"><strong className="font-medium">Número de Solicitud:</strong> {application.policy_number}</p>
          <p className="mb-2"><strong className="font-medium">Producto Solicitado:</strong> {product ? product.name : 'Cargando...'}</p>
          <p className="mb-2"><strong className="font-medium">Tipo de Producto:</strong> {product ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : 'Cargando...'}</p>
          <p className="mb-2"><strong className="font-medium">Fecha de Inicio Sugerida:</strong> {application.start_date}</p>
          <p className="mb-2"><strong className="font-medium">Fecha de Fin Sugerida:</strong> {application.end_date}</p>
          <p className="mb-2"><strong className="font-medium">Monto de Prima Sugerido:</strong> ${application.premium_amount.toFixed(2)} {application.payment_frequency.charAt(0).toUpperCase() + application.payment_frequency.slice(1)}</p>
          <p className="mb-2"><strong className="font-medium">Estado Actual:</strong>
            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              application.status === 'pending' || application.status === 'awaiting_signature'
                ? 'bg-yellow-100 text-yellow-800'
                : application.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
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
              <p className="mb-2"><strong className="font-medium">Sexo:</strong> {client.sexo}</p>
              <p className="mb-2"><strong className="font-medium">Estado Civil:</strong> {client.estado_civil}</p>
              <p className="mb-2"><strong className="font-medium">Estatura:</strong> {client.estatura} cm</p>
              <p className="mb-2"><strong className="font-medium">Peso:</strong> {client.peso} kg</p>
            </>
          ) : (
            <p className="text-gray-600">No se pudo cargar la información del cliente.</p>
          )}
        </div>

        {/* Sección de Detalles del Contrato (si existen) */}
        {application.contract_details && Object.keys(application.contract_details).length > 0 && (
          <div className="md:col-span-2 bg-purple-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Detalles Adicionales del Contrato (JSON)</h3>
            <pre className="bg-purple-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
              {JSON.stringify(application.contract_details, null, 2)}
            </pre>
          </div>
        )}

        {/* Sección de Detalles de Cobertura del Producto (si existen) */}
        {product?.coverage_details && Object.keys(product.coverage_details).length > 0 && (
          <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Detalles de Cobertura del Producto</h3>
            <pre className="bg-yellow-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
              {JSON.stringify(product.coverage_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {application.status === 'pending' || application.status === 'awaiting_signature' ? (
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => handleStatusUpdate('reject')}
            disabled={loading}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Rechazando...' : 'Rechazar Solicitud'}
          </button>
          <button
            onClick={() => handleStatusUpdate('approve')}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Aprobando...' : 'Aprobar Solicitud'}
          </button>
        </div>
      ) : (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-gray-700">
          <p>Esta solicitud ya no está pendiente de aprobación.</p>
        </div>
      )}
    </div>
  );
}