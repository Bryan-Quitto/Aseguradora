import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// IMPORTANTE: Importa la instancia de supabase ya creada y configurada
import { supabase } from 'src/supabase/client'; // Asume que tienes este archivo configurado

// --- Interfaces de datos (estas las mantienes como están, son correctas) ---
interface Policy {
    id: string;
    policy_number: string;
    client_id: string;
    agent_id: string | null;
    product_id: string;
    start_date: string;
    end_date: string;
    // ¡Actualizado el tipo de status para incluir awaiting_signature y rejected!
    status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
    premium_amount: number;
    payment_frequency: 'monthly' | 'quarterly' | 'annually';
    contract_details: string | null; // Puede ser null para clientes
    created_at: string;
    updated_at: string;
    num_dependents: number | null;
    dependents_details: Dependent[] | null; // Array de objetos Dependent
    beneficiaries: Beneficiary[] | null; // Array de objetos Beneficiary
    age_at_inscription: number | null;
    ad_d_coverage: number | null;
    ad_d_included: boolean | null;
    coverage_amount: number | null;
    wellness_rebate: number | null;
    max_age_inscription: number | null;
    num_beneficiaries: number | null;
    deductible: number | null;
    coinsurance: number | null;
    max_annual: number | null;
    has_dental: boolean | null;
    has_dental_basic: boolean | null;
    has_dental_premium: boolean | null;
    has_vision: boolean | null;
    has_vision_basic: boolean | null;
    has_vision_full: boolean | null;
    wants_dental_premium: boolean | null;
    wants_vision: boolean | null;
}

interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null;
    coverage_details: {
        coverage_amount?: number;
        ad_d_included?: boolean;
        ad_d_coverage_amount?: number;
        wellness_rebate_percentage?: number;
        max_age_for_inscription?: number;
        max_beneficiaries?: number;
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        max_dependents?: number;
        [key: string]: any;
    };
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    created_at: string;
    updated_at: string;
}

interface Beneficiary {
    id?: string;
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    percentage: number;
}

interface Dependent {
    id?: string;
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    age: number;
}

interface ClientProfile {
    user_id: string;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    full_name: string | null;
    email: string | null;
    // Añade aquí cualquier otro campo relevante del perfil del cliente que quieras mostrar
}

// NUEVA INTERFAZ PARA DOCUMENTOS DE LA PÓLIZA
interface Document {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string; // URL pública para descarga
}

/**
 * Función para obtener póliza por ID desde Supabase.
 * Usa la instancia de supabase ya importada.
 */
async function getPolicyById(policyId: string): Promise<{ data: Policy | null; error: any }> {
    const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('id', policyId)
        .single();

    // --- CAMBIO CLAVE AQUÍ: Parsear los campos JSON si vienen como cadenas ---
    if (data) {
        // Asegúrate de que beneficiaries es un array
        if (typeof data.beneficiaries === 'string') {
            try {
                data.beneficiaries = JSON.parse(data.beneficiaries);
            } catch (e) {
                console.error("Error al parsear beneficiaries:", e, data.beneficiaries);
                data.beneficiaries = []; // O null, dependiendo de cómo quieras manejar un error de parseo
            }
        }
        // Asegúrate de que dependents_details es un array
        if (typeof data.dependents_details === 'string') {
            try {
                data.dependents_details = JSON.parse(data.dependents_details);
            } catch (e) {
                console.error("Error al parsear dependents_details:", e, data.dependents_details);
                data.dependents_details = []; // O null
            }
        }
        // Asegurarse de que si son null en la DB, sean arrays vacíos para .map()
        if (data.beneficiaries === null) {
            data.beneficiaries = [];
        }
        if (data.dependents_details === null) {
            data.dependents_details = [];
        }
    }
    // --- FIN DEL CAMBIO CLAVE ---

    return { data, error };
}

/**
 * Función para obtener producto de seguro por ID desde Supabase.
 * Usa la instancia de supabase ya importada.
 */
async function getInsuranceProductById(productId: string): Promise<{ data: InsuranceProduct | null; error: any }> {
    const { data, error } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('id', productId)
        .single();
    return { data, error };
}

/**
 * Función para obtener perfil de cliente por ID desde Supabase.
 * Usa la instancia de supabase ya importada.
 */
async function getClientProfileById(clientId: string): Promise<{ data: ClientProfile | null; error: any }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email')
        .eq('user_id', clientId)
        .single();
    if (error) {
        console.error(`Error al obtener perfil de cliente con ID ${clientId}:`, error.message);
        return { data: null, error };
    }
    return { data: data as ClientProfile, error: null };
}

/**
 * NUEVA FUNCIÓN: Obtiene documentos de la póliza desde Supabase Storage.
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
 * Componente para mostrar los detalles de una póliza específica para un agente.
 */
export default function AgentPolicyDetail() {
    const { id: policyId } = useParams<{ id: string }>();
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // NUEVOS ESTADOS PARA DOCUMENTOS
    const [policyDocuments, setPolicyDocuments] = useState<Document[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [documentsError, setDocumentsError] = useState<string | null>(null);

    useEffect(() => {
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

            // 3. Obtener los detalles del cliente asociado
            const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
            if (clientError) {
                console.error(`Error al obtener cliente con ID ${policyData.client_id}:`, clientError);
                setClient(null); // No bloqueamos si el cliente no se puede cargar
            } else {
                setClient(clientData);
            }

            // 4. NUEVO: Obtener los documentos asociados a la póliza
            setLoadingDocuments(true);
            const { data: docsData, error: docsError } = await getPolicyDocuments(policyData.id);
            if (docsError) {
                console.error(`Error al obtener documentos para la póliza ${policyData.id}:`, docsError);
                setDocumentsError('Error al cargar los documentos de la póliza.');
                setPolicyDocuments([]);
            } else {
                setPolicyDocuments(docsData || []);
            }
            setLoadingDocuments(false); // Finaliza la carga de documentos

            setLoading(false); // Finaliza la carga general
        };

        fetchPolicyDetails();
    }, [policyId]); // La dependencia policyId asegura que se recarga si la URL cambia

    // Helper para capitalizar la primera letra de cualquier cadena (AHORA MÁS GENÉRICO)
    const capitalizeStatus = (text: string | undefined | null) => {
        if (!text) {
            return 'Desconocido';
        }
        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            return 'Desconocido';
        }
        return trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);
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
                <h2 className="text-3xl font-bold text-blue-700">Detalles de Póliza: {product ? product.name : 'Cargando...'}</h2>
                <Link
                    to="/agent/dashboard/policies"
                    className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
                >
                    Volver a Pólizas
                </Link>
            </div>

            {loading && (
                <div className="flex justify-center items-center h-64">
                    <p className="text-blue-600 text-xl">Cargando detalles de la póliza...</p>
                </div>
            )}

            {error && (
                <div className="flex flex-col justify-center items-center h-64">
                    <p className="text-red-600 text-xl mb-4">{error}</p>
                    <Link to="/agent/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                        Volver a Pólizas
                    </Link>
                </div>
            )}

            {!loading && !error && !policy && (
                <div className="flex flex-col justify-center items-center h-64">
                    <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta póliza.</p>
                    <Link to="/agent/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
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
                        <p className="mb-2"><strong className="font-medium">Tipo de Producto:</strong> {product ? capitalizeStatus(product.type) : 'Cargando...'}</p> {/* Usar capitalizeStatus para tipo */}
                        <p className="mb-2"><strong className="font-medium">Fecha de Inicio:</strong> {policy.start_date}</p>
                        <p className="mb-2"><strong className="font-medium">Fecha de Fin:</strong> {policy.end_date}</p>
                        <p className="mb-2"><strong className="font-medium">Monto de Prima:</strong> ${policy.premium_amount?.toFixed(2) || 'N/A'} {policy.payment_frequency ? capitalizeStatus(policy.payment_frequency) : ''}</p> {/* Usar capitalizeStatus para payment_frequency */}
                        <p className="mb-2"><strong className="font-medium">Estado:</strong>
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                policy.status === 'pending' || policy.status === 'awaiting_signature' ? 'bg-yellow-100 text-yellow-800' :
                                policy.status === 'cancelled' || policy.status === 'expired' || policy.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-200 text-gray-800' // Fallback para estados no mapeados
                            }`}>
                                {capitalizeStatus(policy.status)}
                            </span>
                        </p>
                    </div>

                    {/* Sección del Cliente */}
                    <div className="bg-teal-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-teal-800 mb-4">Cliente de la Póliza</h3>
                        {client ? (
                            <>
                                <p className="mb-2"><strong className="font-medium">Nombre:</strong> {client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()}</p>
                                <p className="mb-2"><strong className="font-medium">Email:</strong> <a href={`mailto:${client.email}`} className="text-blue-700 hover:underline">{client.email}</a></p>
                                {/* Puedes añadir más detalles del cliente aquí si son relevantes */}
                            </>
                        ) : (
                            <p className="text-gray-600">No se pudo cargar la información del cliente.</p>
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