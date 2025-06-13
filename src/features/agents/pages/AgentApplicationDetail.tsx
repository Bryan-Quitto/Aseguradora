import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Policy, getPolicyById, InsuranceProduct, getInsuranceProductById, updatePolicy } from '../../policies/policy_management';
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend';
import { useAuth } from 'src/contexts/AuthContext';
import { enviarLinkFirma } from 'src/utils/enviarLinkFirma';
import { supabase } from 'src/supabase/client'; // Importa el cliente de Supabase

// Define tipos para los documentos
interface PolicyDocument {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string; // URL pública para descarga
}

// Helper para renderizar los detalles
// Mapea las claves del JSON a etiquetas legibles en español
const detailLabels: { [key: string]: string } = {
  deductible: 'Deducible Anual',
  max_annual_out_of_pocket: 'Gasto Máximo Anual (Out-of-Pocket)',
  coinsurance_percentage: 'Coaseguro',
  max_dependents: 'Máximo de Dependientes',
  max_age_for_inscription: 'Edad Máxima para Inscripción',
  wellness_rebate_percentage: 'Reembolso por Bienestar',
  includes_dental_basic: 'Incluye Dental Básico',
  includes_dental_premium: 'Incluye Dental Premium',
  includes_vision_basic: 'Incluye Visión Básica',
  includes_vision_full: 'Incluye Visión Completa',
};

// Formatea los valores para que sean más legibles
const formatDetailValue = (key: string, value: any): string => {
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  if (key.includes('_percentage')) {
    return `${value}%`;
  }
  if (['deductible', 'max_annual_out_of_pocket'].includes(key)) {
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
};

/**
 * Componente para mostrar los detalles de una solicitud de póliza pendiente
 * y permitir al agente revisarla y tomar una acción (aprobar/rechazar).
 */
export default function AgentApplicationDetail() {
  const { id: applicationId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [application, setApplication] = useState<Policy | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [product, setProduct] = useState<InsuranceProduct | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]); // Estado para los documentos de la póliza
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false); // Nuevo estado de carga para documentos

  useEffect(() => {
    const fetchApplicationDetails = async () => {
      if (!applicationId) {
        setError('ID de solicitud no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setActionMessage(null);

      const { data: policyData, error: policyError } = await getPolicyById(applicationId);

      if (policyError) {
        console.error(`Error al obtener solicitud con ID ${applicationId}:`, policyError);
        setError('Error al cargar los detalles de la solicitud. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (!policyData) {
        setError('Solicitud no encontrada.');
        setLoading(false);
        return;
      }

      // Solo restringir a 'pending' y 'awaiting_signature' si es un flujo de APLICACIONES
      // Si este componente también se usará para ver pólizas "aceptadas", se podría remover esta restricción.
      // Para este caso de "AgentApplicationDetail", mantenemos la restricción por definición.
      if (policyData.status !== 'pending' && policyData.status !== 'awaiting_signature') {
        setError(`Solicitud no encontrada o no está pendiente/esperando firma. Estado actual: ${policyData.status}`);
        setLoading(false);
        return;
      }

      setApplication(policyData);

      const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
      if (clientError) {
        console.error(`Error al obtener cliente para solicitud ${applicationId}:`, clientError);
        setClient(null);
      } else {
        setClient(clientData);
      }

      const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
      if (productError) {
        console.error(`Error al obtener producto para solicitud ${applicationId}:`, productError);
        setProduct(null);
      } else {
        setProduct(productData);
      }

      // **Cargar documentos al obtener los detalles de la aplicación**
      await fetchDocumentsForPolicy(applicationId);

      setLoading(false);
    };

    fetchApplicationDetails();
  }, [applicationId]);

  // Función para cargar los documentos de una póliza específica
  const fetchDocumentsForPolicy = async (policyId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error: docsError } = await supabase
        .from('policy_documents')
        .select('*')
        .eq('policy_id', policyId)
        .order('uploaded_at', { ascending: false });

      if (docsError) {
        throw new Error(`Error al cargar documentos: ${docsError.message}`);
      }

      const documentsWithUrls = await Promise.all((data || []).map(async (doc: PolicyDocument) => {
        const { data: urlData } = supabase.storage
          .from('documents') // Asegúrate de que el bucket se llame 'documents' en Supabase Storage
          .getPublicUrl(doc.file_path);
        return { ...doc, file_url: urlData?.publicUrl || '#' };
      }));
      setDocuments(documentsWithUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al recargar los documentos.');
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleStatusUpdate = async (actionType: 'approve' | 'reject') => {
    if (!application || !user?.id || !client) { 
      setError('No se pudo procesar la solicitud. Faltan datos.');
      return;
    }

    setLoading(true);
    setError(null);
    setActionMessage(null);

    let newStatus: Policy['status'];
    let successMessage: string;
    let errorMessagePrefix: string;

    if (actionType === 'approve') {
      newStatus = 'awaiting_signature';
      successMessage = `Solicitud ${application.policy_number} aprobada preliminarmente. Se ha enviado un enlace de firma al correo ${client.email}.`;
      errorMessagePrefix = 'aprobar';
    } else {
      newStatus = 'rejected';
      successMessage = `Solicitud ${application.policy_number} rechazada exitosamente.`;
      errorMessagePrefix = 'rechazar';
    }

    const updates: Partial<Policy> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error: updateError } = await updatePolicy(application.id, updates);

      if (updateError) {
        throw new Error(`Error al ${errorMessagePrefix} la solicitud: ${updateError.message}`);
      }

      if (data) {
        setApplication(data);

        if (actionType === 'approve' && client.email) {
          const { success, message } = await enviarLinkFirma(client.email, data.id);

          if (!success) {
            setError(`La póliza fue aprobada preliminarmente pero hubo un error al enviar el enlace de firma: ${message}`);
          } else {
            setActionMessage(successMessage);
          }
        } else {
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
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Revisar Solicitud: {product ? product.name : 'Cargando...'}</h2>
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
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Detalles Adicionales del Contrato</h3>
            <div className="space-y-2">
              {Object.entries(application.contract_details).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-purple-200 last:border-b-0">
                  <span className="font-medium text-purple-900">{detailLabels[key] || key.replace(/_/g, ' ')}:</span>
                  <span className="text-right">{formatDetailValue(key, value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Detalles de Cobertura del Producto (si existen) */}
        {product?.coverage_details && Object.keys(product.coverage_details).length > 0 && (
          <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Detalles de Cobertura del Producto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {Object.entries(product.coverage_details).map(([key, value]) => {
                if (detailLabels[key]) {
                  return (
                    <div key={key} className="flex justify-between items-center text-sm py-1.5 border-b border-yellow-200">
                      <span className="font-medium text-yellow-900">{detailLabels[key]}:</span>
                      <span className="font-semibold text-right">{formatDetailValue(key, value)}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* Sección de Documentos Subidos por el Cliente */}
        <div className="md:col-span-2 bg-indigo-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-indigo-800 mb-4">Documentos Subidos por el Cliente</h3>
          {loadingDocuments ? (
            <div className="text-center text-gray-600 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mr-3"></div>
              Cargando documentos...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-gray-600 italic">No hay documentos subidos por el cliente para esta solicitud.</div>
          ) : (
            <ul className="bg-white rounded-lg p-4 border border-indigo-200">
              {documents.map((doc) => (
                <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-indigo-200">
                  <span className="text-gray-800 break-words flex-grow mr-4">{doc.document_name}</span>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out"
                  >
                    Ver
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
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