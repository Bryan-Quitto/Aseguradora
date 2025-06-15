import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from 'src/supabase/client'; // Importar supabase

import { 
    getPolicyById, 
    getInsuranceProductById, 
    getAgentProfileById, 
    Policy, 
    InsuranceProduct, 
    AgentProfile, 
    Beneficiary, 
    Dependent
} from '../../policies/policy_management';

import { 
    ClientProfile,
    getClientProfileById
} from '../../clients/hooks/cliente_backend';

// Interfaz para los detalles del rechazo que vienen de la base de datos
interface RejectionDetail {
  id: string;
  reasons: string[];
  comments: Record<string, string>;
  rejected_at: string;
}

// Mapeo de códigos de razón a texto legible y amigable para el cliente
const rejectionReasonLabels: { [key: string]: string } = {
  invalid_document: 'Documento(s) Inválido(s) o Ilegible(s)',
  missing_document: 'Falta(n) Documento(s) Requerido(s)',
  inconsistent_data: 'Información Inconsistente',
  invalid_signature: 'Firma Inválida o Inconsistente',
  not_eligible: 'No Cumple con los Requisitos del Producto',
  other_reason: 'Otra Razón'
};

export default function ClientPolicyDetail() {
    const { id: policyId } = useParams<{ id: string }>();
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null); 
    const [rejectionDetails, setRejectionDetails] = useState<RejectionDetail | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolicyDetails = async () => {
            if (!policyId) {
                setError('ID de póliza no proporcionado.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setRejectionDetails(null);

            try {
                const { data: policyData, error: policyError } = await getPolicyById(policyId);
                if (policyError) throw new Error('Error al cargar los detalles de la póliza. Por favor, inténtalo de nuevo.');
                if (!policyData) throw new Error('Póliza no encontrada.');
                
                setPolicy(policyData);

                if (policyData.status === 'rejected') {
                    const { data: rejectionData, error: rejectionError } = await supabase
                        .from('policy_rejections')
                        .select('*')
                        .eq('policy_id', policyData.id)
                        .order('rejected_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (rejectionError) {
                        console.warn("No se encontraron detalles específicos de rechazo para esta póliza.");
                    } else {
                        setRejectionDetails(rejectionData);
                    }
                }

                const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
                if (productError) console.error(`Error al obtener producto con ID ${policyData.product_id}:`, productError);
                setProduct(productData);

                if (policyData.agent_id) {
                    const { data: agentData, error: agentError } = await getAgentProfileById(policyData.agent_id);
                    if (agentError) console.error(`Error al obtener agente con ID ${policyData.agent_id}:`, agentError);
                    setAgent(agentData);
                }

                const { data: clientProfileData, error: clientProfileError } = await getClientProfileById(policyData.client_id);
                if (clientProfileError) console.error(`Error al obtener perfil del cliente con ID ${policyData.client_id}:`, clientProfileError);
                setClientProfile(clientProfileData);

            } catch (err: any) {
                setError(err.message || "Ocurrió un error inesperado al cargar la póliza.");
            } finally {
                setLoading(false);
            }
        };

        fetchPolicyDetails();
    }, [policyId]);

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

    if (policy.status === 'rejected') {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-8 rounded-xl shadow-lg w-full max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">Tu Solicitud fue Rechazada</h2>
                <p className="mb-6">Lamentamos informarte que tu solicitud para la póliza <strong>{product?.name || 'de seguro'}</strong> (Nº {policy.policy_number}) no pudo ser aprobada en su estado actual. A continuación, se detallan los motivos. Por favor, revisa la información y contacta a tu agente si tienes alguna pregunta o para corregir los problemas y volver a intentarlo.</p>
                
                {rejectionDetails ? (
                    <div className="bg-white p-4 rounded-lg border border-red-200 space-y-3">
                        <h3 className="font-semibold text-lg text-red-900">Motivos del Rechazo:</h3>
                        <ul className="list-disc list-inside space-y-3">
                            {rejectionDetails.reasons.map(reasonCode => (
                                <li key={reasonCode}>
                                    <span className="font-semibold">{rejectionReasonLabels[reasonCode] || reasonCode.replace(/_/g, ' ')}</span>
                                    {rejectionDetails.comments[reasonCode] && (
                                        <blockquote className="pl-5 text-sm italic text-gray-700 border-l-2 border-red-300 bg-red-50 rounded p-2 mt-1">
                                            "{rejectionDetails.comments[reasonCode]}"
                                        </blockquote>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="font-semibold p-4 bg-white rounded-lg border border-red-200">Tu solicitud requiere correcciones. Por favor, contacta a tu agente para obtener más detalles sobre los pasos a seguir.</p>
                )}
                
                {agent && (
                    <div className="mt-6 p-4 bg-red-100 rounded-lg border border-red-200">
                        <p className="font-semibold mb-2">Contacta a tu Agente Asignado:</p>
                        <p><strong>Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
                        <p><strong>Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
                        {agent.phone_number && <p><strong>Teléfono:</strong> {agent.phone_number}</p>}
                    </div>
                )}
                <Link to="/client/dashboard/policies" className="mt-8 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg shadow-md">Volver a Mis Pólizas</Link>
            </div>
        );
    }
    
    if (policy.status !== 'active' && policy.status !== 'awaiting_signature') {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-8 py-6 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4">Póliza Inactiva</h2>
                <p className="mb-4 text-lg">
                    El estado actual de tu póliza es <span className="font-semibold">"{policy.status.toUpperCase().replace('_', ' ')}"</span>. Para ver los detalles completos y firmarla, por favor, espera a que tu agente asignado revise tu poliza.
                </p>
                {agent && (
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-900">
                        <p className="font-semibold mb-2">Detalles de tu Agente:</p>
                        <p><strong>Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
                        <p><strong>Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
                        {agent.phone_number && <p><strong>Teléfono:</strong> {agent.phone_number}</p>}
                    </div>
                )}
                <Link to="/client/dashboard/policies" className="mt-8 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">Volver a Mis Pólizas</Link>
            </div>
        );
    }

    const renderSpecificPolicyDetails = () => {
        if (!product) {
            return <p className="text-gray-600 italic">Cargando detalles del producto...</p>;
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
                        
                        {policy.dependents_details && Array.isArray(policy.dependents_details) && policy.dependents_details.length > 0 ? (
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
                        ) : (
                            <p className="mt-4 text-gray-600">No hay dependientes registrados.</p>
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

                        {policy.beneficiaries && Array.isArray(policy.beneficiaries) && policy.beneficiaries.length > 0 ? (
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
                        ) : (
                            <p className="mt-4 text-gray-600">No hay beneficiarios registrados.</p>
                        )}
                    </>
                );
            default:
                return (
                    <>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Detalles del Producto</h3>
                        <p className="text-gray-600 italic">No hay detalles específicos para este tipo de póliza.</p>
                    </>
                );
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Detalles de Mi Póliza: {product ? product.name : 'Cargando...'}</h2>
                <Link
                    to="/client/dashboard/policies"
                    className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
                >
                    Volver a Mis Pólizas
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General</h3>
                    <p><strong className="font-medium">Número de Póliza:</strong> {policy.policy_number}</p>
                    <p><strong className="font-medium">Producto:</strong> {product ? product.name : 'Cargando...'}</p>
                    <p><strong className="font-medium">Tipo:</strong> {product ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : 'Cargando...'}</p>
                    <p><strong className="font-medium">Fecha de Inicio:</strong> {policy.start_date}</p>
                    <p><strong className="font-medium">Fecha de Fin:</strong> {policy.end_date}</p>
                    <p><strong className="font-medium">Prima:</strong> ${policy.premium_amount.toFixed(2)} {policy.payment_frequency.charAt(0).toUpperCase() + policy.payment_frequency.slice(1)}</p>
                    <p><strong className="font-medium">Estado:</strong>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            policy.status === 'active' ? 'bg-green-100 text-green-800' :
                            ['pending', 'awaiting_signature'].includes(policy.status) ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                        }`}>
                            {policy.status.charAt(0).toUpperCase() + policy.status.slice(1).replace('_', ' ')}
                        </span>
                    </p>
                </div>

                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-indigo-800 mb-4">Mi Información Personal</h3>
                    {clientProfile ? (
                        <>
                            <p><strong className="font-medium">Nombre:</strong> {clientProfile.full_name || 'N/A'}</p>
                            <p><strong className="font-medium">Email:</strong> <a href={`mailto:${clientProfile.email}`} className="text-blue-700 hover:underline">{clientProfile.email || 'N/A'}</a></p>
                            <p><strong className="font-medium">Nacimiento:</strong> {clientProfile.fecha_nacimiento}</p>
                            <p><strong className="font-medium">Identificación:</strong> {clientProfile.tipo_identificacion}: {clientProfile.numero_identificacion}</p>
                            <p><strong className="font-medium">Nacionalidad:</strong> {clientProfile.nacionalidad}</p>
                        </>
                    ) : (
                        <p>Cargando perfil...</p>
                    )}
                </div>

                <div className="bg-purple-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-purple-800 mb-4">Agente Asignado</h3>
                    {agent ? (
                        <>
                            <p><strong className="font-medium">Nombre:</strong> {agent.full_name || `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}</p>
                            <p><strong className="font-medium">Email:</strong> <a href={`mailto:${agent.email}`} className="text-blue-700 hover:underline">{agent.email}</a></p>
                            {agent.phone_number && <p><strong className="font-medium">Teléfono:</strong> {agent.phone_number}</p>}
                        </>
                    ) : (
                        <p>No hay un agente asignado a esta póliza.</p>
                    )}
                </div>

                {(policy.status === 'active' || policy.status === 'awaiting_signature') && (
                    <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
                        {renderSpecificPolicyDetails()}
                    </div>
                )}
            </div>
            
            {product?.admin_notes && (
                <div className="mt-6 bg-gray-50 p-6 rounded-lg shadow-sm border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Notas Adicionales del Producto</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{product.admin_notes}</p>
                </div>
            )}
        </div>
    );
}