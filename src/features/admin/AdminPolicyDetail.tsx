import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from 'src/supabase/client'; // Importa el cliente de Supabase real

// Importa las funciones de manejo de datos y las interfaces desde el archivo central policy_management.ts
import {
    Policy,
    InsuranceProduct,
    ClientProfile,
    AgentProfile,
    Beneficiary,
    Dependent,
    getPolicyById,
    getInsuranceProductById,
    getClientProfileById,
    getAgentProfileById,
} from '../policies/policy_management';

// Define la interfaz Document (si no está ya exportada desde policy_management.ts o un archivo de tipos compartido)
interface Document {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string; // URL pública para descarga
}

/**
 * Función para obtener documentos de la póliza desde Supabase Storage.
 * Es similar a la función en AgentPolicyDetail, asegurando la consistencia.
 */
async function getPolicyDocuments(policyId: string): Promise<{ data: Document[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('policy_documents') // Asegúrate de que tu tabla se llame 'policy_documents'
      .select('*')
      .eq('policy_id', policyId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Error al cargar documentos de la base de datos: ${error.message}`);
    }

    // Generar URLs públicas para cada documento
    const documentsWithUrls = await Promise.all((data || []).map(async (doc: Document) => {
      const { data: urlData } = supabase.storage
        .from('documents') // Asegúrate de que tu bucket de almacenamiento se llame 'documents'
        .getPublicUrl(doc.file_path);
      return { ...doc, file_url: urlData?.publicUrl || '#' };
    }));

    return { data: documentsWithUrls, error: null };
  } catch (err) {
    console.error(`Error en getPolicyDocuments para policyId ${policyId}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Componente para mostrar los detalles de una póliza específica para un administrador.
 * Muestra información de la póliza, el producto, el cliente y el agente asociados.
 */
export default function AdminPolicyDetail() {
    const { id: policyId } = useParams<{ id: string }>(); // Obtiene el ID de la póliza de la URL
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // NUEVOS ESTADOS PARA DOCUMENTOS
    const [policyDocuments, setPolicyDocuments] = useState<Document[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [documentsError, setDocumentsError] = useState<string | null>(null);

    /**
     * Hook useEffect para cargar todos los datos relevantes al montar el componente.
     */
    useEffect(() => {
        const fetchAllDetails = async () => {
            if (!policyId) {
                setError('ID de póliza no proporcionado.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null); // Limpiar error principal
            setDocumentsError(null); // Limpiar error de documentos

            try {
                // 1. Obtener los detalles de la póliza (usando la función importada)
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

                // 2. Obtener los detalles del producto asociado (usando la función importada)
                const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
                if (productError) {
                    console.error(`Error al obtener producto con ID ${policyData.product_id}:`, productError);
                    setProduct(null);
                } else {
                    setProduct(productData);
                }

                // 3. Obtener los detalles del cliente asociado (usando la función importada)
                const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
                if (clientError) {
                    console.error(`Error al obtener cliente con ID ${policyData.client_id}:`, clientError);
                    setClient(null);
                } else {
                    setClient(clientData);
                }

                // 4. Obtener los detalles del agente asociado (si existe) (usando la función importada)
                if (policyData.agent_id) {
                    const { data: agentData, error: agentError } = await getAgentProfileById(policyData.agent_id);
                    if (agentError) {
                        console.error(`Error al obtener agente con ID ${policyData.agent_id}:`, agentError);
                        setAgent(null);
                    } else {
                        setAgent(agentData);
                    }
                } else {
                    setAgent(null);
                }

                // 5. NUEVO: Obtener los documentos asociados a la póliza
                setLoadingDocuments(true);
                const { data: docsData, error: docsError } = await getPolicyDocuments(policyData.id);
                if (docsError) {
                    console.error(`Error al obtener documentos para la póliza ${policyData.id}:`, docsError);
                    setDocumentsError('Error al cargar los documentos de la póliza.');
                    setPolicyDocuments([]);
                } else {
                    setPolicyDocuments(docsData || []);
                }
                setLoadingDocuments(false);

            } catch (err: any) {
                // Captura cualquier error inesperado en la cadena de fetches
                console.error("Error general al cargar detalles de la póliza:", err);
                setError(`Ocurrió un error inesperado: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllDetails();
    }, [policyId]);

    // Helper para capitalizar la primera letra de cualquier cadena (más genérico)
    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        const trimmedS = s.trim();
        if (trimmedS.length === 0) return 'N/A';
        return trimmedS.charAt(0).toUpperCase() + trimmedS.slice(1);
    };

    // Helper para renderizar los detalles específicos de cada tipo de póliza
    const renderSpecificPolicyDetails = () => {
        if (!policy || !product) {
            return <p className="text-gray-600 italic">Cargando detalles específicos...</p>;
        }

        switch (product.type) {
            case 'health':
                return (
                    <>
                        <h3 className="text-xl font-semibold text-green-800 mb-4">Detalles del Plan de Salud</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <p className="mb-2"><strong className="font-medium">Deducible:</strong> ${policy.deductible?.toFixed(2) || 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">Coaseguro:</strong> {policy.coinsurance || 'N/A'}%</p>
                            <p className="mb-2"><strong className="font-medium">Máximo Desembolsable Anual:</strong> ${policy.max_annual?.toFixed(2) || 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">Reembolso por Bienestar:</strong> {policy.wellness_rebate ? `${policy.wellness_rebate}%` : 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">Edad de Inscripción:</strong> {policy.age_at_inscription || 'N/A'} años</p>
                            <p className="mb-2"><strong className="font-medium">Dental Básico:</strong> {policy.has_dental_basic ? 'Sí' : 'No'}</p>
                            <p className="mb-2"><strong className="font-medium">Dental Premium:</strong> {policy.has_dental_premium ? 'Sí' : 'No'}</p>
                            <p className="mb-2"><strong className="font-medium">Visión Básico:</strong> {policy.has_vision_basic ? 'Sí' : 'No'}</p>
                            <p className="mb-2"><strong className="font-medium">Visión Completo:</strong> {policy.has_vision_full ? 'Sí' : 'No'}</p>
                        </div>
                        
                        {policy.dependents_details && policy.dependents_details.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                                <p className="font-medium mb-2">Dependientes Incluidos ({policy.num_dependents || policy.dependents_details.length}):</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {policy.dependents_details.map((dep: Dependent, index: number) => (
                                        <li key={dep.id || index} className="text-sm">
                                            {dep.first_name1} {dep.first_name2} {dep.last_name1} {dep.last_name2} (Cédula: {dep.id_card}, Edad: {dep.age} años) - Relación: {dep.relation === 'Otro' ? dep.custom_relation : dep.relation}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                );
            case 'life':
                return (
                    <>
                        <h3 className="text-xl font-semibold text-red-800 mb-4">Detalles del Seguro de Vida</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <p className="mb-2"><strong className="font-medium">Monto de Cobertura:</strong> ${policy.coverage_amount?.toFixed(2) || 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">AD&D Incluido:</strong> {policy.ad_d_included ? 'Sí' : 'No'}</p>
                            {policy.ad_d_included && (
                                <p className="mb-2"><strong className="font-medium">Cobertura AD&D:</strong> ${policy.ad_d_coverage?.toFixed(2) || 'N/A'}</p>
                            )}
                            <p className="mb-2"><strong className="font-medium">Reembolso por Bienestar:</strong> {policy.wellness_rebate ? `${policy.wellness_rebate}%` : 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">Edad al Inscribirse:</strong> {policy.age_at_inscription || 'N/A'} años</p>
                        </div>

                        {policy.beneficiaries && policy.beneficiaries.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                                <p className="font-medium mb-2">Beneficiarios ({policy.num_beneficiaries || policy.beneficiaries.length}):</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {policy.beneficiaries.map((b: Beneficiary, index: number) => (
                                        <li key={b.id || index} className="text-sm">
                                            {b.first_name1} {b.first_name2} {b.last_name1} {b.last_name2} (Cédula: {b.id_card}) - Relación: {b.relation === 'Otro' ? b.custom_relation : b.relation} - {b.percentage}%
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                );
            default:
                return (
                    <>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Detalles Adicionales del Producto</h3>
                        <p className="text-gray-600 italic">No hay detalles específicos estructurados para este tipo de póliza.</p>
                    </>
                );
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Detalles de Póliza: {policy?.policy_number || 'Cargando...'}</h2>
                <div className="flex space-x-3">
                    <Link
                        to="/admin/dashboard/policies"
                        className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
                    >
                        Volver a Pólizas
                    </Link>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center h-64">
                    <p className="text-blue-600 text-xl">Cargando detalles de la póliza...</p>
                </div>
            )}

            {error && (
                <div className="flex flex-col justify-center items-center h-64">
                    <p className="text-red-600 text-xl mb-4">{error}</p>
                    <Link to="/admin/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                        Volver a Pólizas
                    </Link>
                </div>
            )}

            {!loading && !error && !policy && (
                <div className="flex flex-col justify-center items-center h-64">
                    <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta póliza.</p>
                    <Link to="/admin/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                        Volver a Pólizas
                    </Link>
                </div>
            )}

            {policy && !loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                    {/* Sección de la Póliza */}
                    <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General de la Póliza</h3>
                        <p className="mb-2"><strong className="font-medium">Número de Póliza:</strong> {policy.policy_number}</p>
                        <p className="mb-2"><strong className="font-medium">Producto:</strong> {product ? product.name : 'Cargando...'}</p>
                        <p className="mb-2"><strong className="font-medium">Tipo de Producto:</strong> {product ? capitalize(product.type) : 'Cargando...'}</p>
                        <p className="mb-2"><strong className="font-medium">Fecha de Inicio:</strong> {policy.start_date}</p>
                        <p className="mb-2"><strong className="font-medium">Fecha de Fin:</strong> {policy.end_date}</p>
                        <p className="mb-2"><strong className="font-medium">Monto de Prima:</strong> ${policy.premium_amount?.toFixed(2) || 'N/A'}</p>
                        <p className="mb-2"><strong className="font-medium">Frecuencia de Pago:</strong> {capitalize(policy.payment_frequency)}</p>
                        <p className="mb-2"><strong className="font-medium">Estado:</strong>
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                policy.status === 'pending' || policy.status === 'awaiting_signature' ? 'bg-yellow-100 text-yellow-800' :
                                policy.status === 'cancelled' || policy.status === 'expired' || policy.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-200 text-gray-800' // Fallback para estados no mapeados
                            }`}>
                                {capitalize(policy.status)}
                            </span>
                        </p>
                        <p className="mb-2"><strong className="font-medium">Edad al Inscribirse:</strong> {policy.age_at_inscription || 'N/A'} años</p>
                        {policy.contract_details && (
                            <div className="mt-4 border-t pt-4">
                                <p className="font-medium mb-2">Detalles del Contrato (Notas del Agente):</p>
                                <p className="text-sm bg-blue-100 p-3 rounded-md whitespace-pre-wrap">{policy.contract_details}</p>
                            </div>
                        )}
                    </div>

                    {/* Sección del Cliente */}
                    <div className="bg-teal-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-teal-800 mb-4">Cliente de la Póliza</h3>
                        {client ? (
                            <>
                                <p className="mb-2"><strong className="font-medium">Nombre:</strong> {client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()}</p>
                                <p className="mb-2"><strong className="font-medium">Email:</strong> <a href={`mailto:${client.email}`} className="text-blue-700 hover:underline">{client.email}</a></p>
                                {client.phone_number && <p className="mb-2"><strong className="font-medium">Teléfono:</strong> {client.phone_number}</p>}
                            </>
                        ) : (
                            <p className="text-gray-600">No se pudo cargar la información del cliente.</p>
                        )}
                    </div>

                    {/* Sección del Agente */}
                    <div className="bg-orange-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-orange-800 mb-4">Agente Asignado</h3>
                        {agent ? (
                            <>
                                <p className="mb-2"><strong className="font-medium">Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
                                <p className="mb-2"><strong className="font-medium">Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
                                {agent.phone_number && <p className="mb-2"><strong className="font-medium">Teléfono:</strong> {agent.phone_number}</p>}
                            </>
                        ) : (
                            <p className="text-gray-600">No hay un agente asignado o no se pudo cargar su información.</p>
                        )}
                    </div>

                    {/* Sección de Detalles Específicos del Contrato (dinámico) */}
                    <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
                        {renderSpecificPolicyDetails()}
                    </div>
                    
                    {/* Sección de Documentos de la Póliza */}
                    <div className="md:col-span-2 bg-purple-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-purple-800 mb-4">Documentos Subidos por el Cliente</h3>
                        {loadingDocuments ? (
                            <div className="text-center text-gray-600">Cargando documentos de la póliza...</div>
                        ) : documentsError ? (
                            <div className="text-red-600">Error: {documentsError}</div>
                        ) : policyDocuments.length === 0 ? (
                            <div className="text-gray-600 italic">No hay documentos subidos para esta póliza.</div>
                        ) : (
                            <ul className="bg-white rounded-lg p-4 border border-gray-200">
                                {policyDocuments.map((doc) => (
                                    <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200">
                                        <span className="text-gray-800 break-words flex-grow mr-4">{doc.document_name}</span>
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out"
                                        >
                                            Ver
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Sección de Notas del Administrador del Producto (Descripción del final) */}
                    {product?.admin_notes && (
                        <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg shadow-sm border-t border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Notas Adicionales del Producto</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{product.admin_notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}