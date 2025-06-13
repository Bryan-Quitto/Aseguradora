// src\features\clients\pages\ClientPolicyDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Importa directamente desde tu archivo centralizado de Supabase
import { 
    getPolicyById, 
    getInsuranceProductById, 
    getAgentProfileById,
    Policy,          // Importa la interfaz Policy
    InsuranceProduct, // Importa la interfaz InsuranceProduct
    AgentProfile,     // Importa la interfaz AgentProfile
    Beneficiary,      // Importa la interfaz Beneficiary
    Dependent         // Importa la interfaz Dependent
} from '../../policies/policy_management'; // Ajusta la ruta si es necesario

export default function ClientPolicyDetail() {
    const { id: policyId } = useParams<{ id: string }>();
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [agent, setAgent] = useState<AgentProfile | null>(null);
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

            try {
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
                // console.log("Fetched Policy Data:", policyData); // <--- PARA DEPURACIÓN: Descomenta para verificar el formato de beneficiaries/dependents_details aquí

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

            } catch (err: any) {
                console.error("Error general al cargar la póliza:", err);
                setError("Ocurrió un error inesperado al cargar la póliza.");
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

    // --- Lógica para póliza inactiva ---
    if (policy.status !== 'active') {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4">Póliza { product ? product.name : 'Cargando...'} Inactiva</h2>
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
        if (!product) {
            return <p className="text-gray-600 italic">No se ha podido cargar la información del producto asociado.</p>;
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
                        
                        {/* Validación clave para .map(): Asegura que dependents_details existe y es un array con elementos */}
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
                            <p className="mt-4 text-gray-600">No hay dependientes registrados para esta póliza de salud.</p>
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

                        {/* Validación clave para .map(): Asegura que beneficiaries existe y es un array con elementos */}
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
                            <p className="mt-4 text-gray-600">No hay beneficiarios registrados para esta póliza de vida.</p>
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
                <h2 className="text-3xl font-bold text-blue-700">Detalles de Mi Póliza: {product ? product.name : 'Cargando...'}</h2>
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
            
            {/* Sección de Notas del Administrador del Producto (Descripción del final) */}
            {product?.admin_notes && (
                <div className="mt-6 bg-gray-50 p-6 rounded-lg shadow-sm border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Notas Adicionales del Producto</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{product.admin_notes}</p>
                </div>
            )}
        </div>
    );
}