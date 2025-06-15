import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from 'src/supabase/client';

import {
    Policy,
    InsuranceProduct,
    AgentProfile,
    Beneficiary,
    Dependent,
    getPolicyById,
    getInsuranceProductById,
    getAgentProfileById,
} from '../policies/policy_management';

import { 
    ClientProfile, 
    getClientProfileById 
} from '../clients/hooks/cliente_backend';

interface Document {
    id: string;
    policy_id: string;
    document_name: string;
    file_path: string;
    uploaded_at: string;
    file_url?: string;
    uploaded_by: string;
    document_type?: string;
}

async function getPolicyDocuments(policyId: string): Promise<{ data: Document[] | null; error: any }> {
    try {
        const { data, error } = await supabase
            .from('policy_documents')
            .select('*')
            .eq('policy_id', policyId)
            .order('uploaded_at', { ascending: false });

        if (error) {
            throw new Error(`Error al cargar documentos de la base de datos: ${error.message}`);
        }

        const documentsWithUrls = await Promise.all((data || []).map(async (doc: Document) => {
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(doc.file_path);
            return { ...doc, file_url: urlData?.publicUrl || '#' };
        }));

        return { data: documentsWithUrls, error: null };
    } catch (err) {
        console.error(`Error en getPolicyDocuments para policyId ${policyId}:`, err);
        return { data: null, error: err };
    }
}

export default function AdminPolicyDetail() {
    const { id: policyId } = useParams<{ id: string }>();
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [policyDocuments, setPolicyDocuments] = useState<Document[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [documentsError, setDocumentsError] = useState<string | null>(null);
    const [isDeletingDocument, setIsDeletingDocument] = useState<boolean>(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string; filePath: string; name: string } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllDetails = async () => {
            if (!policyId) {
                setError('ID de póliza no proporcionado.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setDocumentsError(null);
            setSuccessMessage(null);

            try {
                const { data: policyData, error: policyError } = await getPolicyById(policyId);
                if (policyError) {
                    setError('Error al cargar los detalles de la póliza.');
                    setLoading(false);
                    return;
                }
                if (!policyData) {
                    setError('Póliza no encontrada.');
                    setLoading(false);
                    return;
                }
                setPolicy(policyData);

                const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
                setProduct(productError ? null : productData);

                const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
                setClient(clientError ? null : clientData);

                if (policyData.agent_id) {
                    const { data: agentData, error: agentError } = await getAgentProfileById(policyData.agent_id);
                    setAgent(agentError ? null : agentData);
                } else {
                    setAgent(null);
                }

                setLoadingDocuments(true);
                const { data: docsData, error: docsError } = await getPolicyDocuments(policyData.id);
                if (docsError) {
                    setDocumentsError('Error al cargar los documentos de la póliza.');
                    setPolicyDocuments([]);
                } else {
                    setPolicyDocuments(docsData || []);
                }
                setLoadingDocuments(false);

            } catch (err: any) {
                console.error("Error general al cargar detalles de la póliza:", err);
                setError(`Ocurrió un error inesperado: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllDetails();
    }, [policyId]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (documentsError) {
            const timer = setTimeout(() => setDocumentsError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [documentsError]);

    const confirmDelete = (docId: string, filePath: string, docName: string) => {
        setDocToDelete({ id: docId, filePath: filePath, name: docName });
        setShowDeleteModal(true);
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;

        setIsDeletingDocument(true);
        setDocumentsError(null);
        setSuccessMessage(null);
        setShowDeleteModal(false);

        try {
            const { error: dbDeleteError } = await supabase
                .from('policy_documents')
                .delete()
                .eq('id', docToDelete.id);

            if (dbDeleteError) {
                throw new Error(`Error al eliminar el registro del documento: ${dbDeleteError.message}`);
            }

            const { error: storageDeleteError } = await supabase.storage
                .from('documents')
                .remove([docToDelete.filePath]);

            if (storageDeleteError) {
                console.error(`Error al eliminar el archivo de Storage: ${storageDeleteError.message}`);
            }

            setSuccessMessage(`Documento "${docToDelete.name}" eliminado exitosamente.`);
            setDocToDelete(null);
            
            if (policy?.id) { 
                const { data, error: docsError } = await getPolicyDocuments(policy.id);
                if (docsError) {
                    throw new Error(`Error al recargar documentos: ${docsError.message}`);
                }
                setPolicyDocuments(data || []);
            }
        } catch (err: any) {
            setDocumentsError(err instanceof Error ? err.message : 'Error desconocido al eliminar el documento.');
            console.error('Error durante la eliminación del documento:', err);
        } finally {
            setIsDeletingDocument(false);
        }
    };

    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        const trimmedS = s.trim().replace('_', ' ');
        if (trimmedS.length === 0) return 'N/A';
        return trimmedS.charAt(0).toUpperCase() + trimmedS.slice(1);
    };

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
                <p className="text-red-600 text-xl mb-4">{error}</p>
                <Link to="/admin/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                    Volver a Pólizas
                </Link>
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta póliza.</p>
                <Link to="/admin/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                    Volver a Pólizas
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Detalles de Póliza: {product ? product.name : 'Cargando...'}</h2>
                <div className="flex space-x-3">
                    <Link
                        to="/admin/dashboard/policies"
                        className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
                    >
                        Volver a Pólizas
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
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
                            ['cancelled', 'expired', 'rejected'].includes(policy.status) ? 'bg-red-100 text-red-800' :
                            'bg-gray-200 text-gray-800'
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

                <div className="bg-teal-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-teal-800 mb-4">Cliente de la Póliza</h3>
                    {client ? (
                        <>
                            <p className="mb-2"><strong className="font-medium">Nombre Completo:</strong> {client.full_name || 'N/A'}</p>
                            <p className="mb-2"><strong className="font-medium">Email:</strong> <a href={`mailto:${client.email}`} className="text-blue-700 hover:underline">{client.email || 'N/A'}</a></p>
                            {client.fecha_nacimiento && <p className="mb-2"><strong className="font-medium">Fecha de Nacimiento:</strong> {client.fecha_nacimiento}</p>}
                            {client.numero_identificacion && <p className="mb-2"><strong className="font-medium">Identificación:</strong> {client.tipo_identificacion}: {client.numero_identificacion}</p>}
                            {client.nacionalidad && <p className="mb-2"><strong className="font-medium">Nacionalidad:</strong> {client.nacionalidad}</p>}
                            {client.lugar_nacimiento && <p className="mb-2"><strong className="font-medium">Lugar de Nacimiento:</strong> {client.lugar_nacimiento}</p>}
                            {client.sexo && <p className="mb-2"><strong className="font-medium">Sexo:</strong> {client.sexo}</p>}
                            {client.estado_civil && <p className="mb-2"><strong className="font-medium">Estado Civil:</strong> {client.estado_civil}</p>}
                            {(client.estatura !== null && client.estatura !== undefined) && <p className="mb-2"><strong className="font-medium">Estatura:</strong> {client.estatura} cm</p>}
                            {(client.peso !== null && client.peso !== undefined) && <p className="mb-2"><strong className="font-medium">Peso:</strong> {client.peso} kg</p>}
                        </>
                    ) : (
                        <p className="text-gray-600">No se pudo cargar la información del cliente.</p>
                    )}
                </div>

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

                <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
                    {renderSpecificPolicyDetails()}
                </div>
                
                <div className="md:col-span-2 bg-purple-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-purple-800 mb-4">Documentos Subidos por el Cliente</h3>

                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{successMessage}</span>
                        </div>
                    )}
                    
                    {documentsError && (
                         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{documentsError}</span>
                        </div>
                    )}
                    
                    {loadingDocuments ? (
                        <div className="text-center text-gray-600">Cargando documentos de la póliza...</div>
                    ) : policyDocuments.length === 0 ? (
                        <div className="text-gray-600 italic">No hay documentos subidos para esta póliza.</div>
                    ) : (
                        <ul className="bg-white rounded-lg p-4 border border-gray-200">
                            {policyDocuments.map((doc) => (
                                <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200">
                                    <span className="text-gray-800 break-words flex-grow mr-4">
                                        {doc.document_type === 'signature' ? 'Firma' : doc.document_name}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out"
                                        >
                                            Ver
                                        </a>
                                        <button
                                            onClick={() => confirmDelete(doc.id, doc.file_path, doc.document_name)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isDeletingDocument}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {product?.admin_notes && (
                    <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg shadow-sm border-t border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Notas Adicionales del Producto</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{product.admin_notes}</p>
                    </div>
                )}
            </div>
            
            {showDeleteModal && docToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que deseas eliminar el documento "<span className="font-semibold">{docToDelete.name}</span>"? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                disabled={isDeletingDocument}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteDocument}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                disabled={isDeletingDocument}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}