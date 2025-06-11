import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Importa los componentes de lista de beneficiarios y dependientes y sus interfaces
import BeneficiaryInputList from '../../policies/components/BeneficiaryInputList';
import { Beneficiary } from '../../policies/components/BeneficiaryInput';
import DependentInputList from '../../policies/components/DependentInputList';
import { Dependent } from '../../policies/components/DependentInput';

// Importa las funciones de manejo de datos y las interfaces desde un archivo centralizado
// Es crucial que 'policy_management.ts' (o similar) exista y contenga estas definiciones y funciones.
import {
    Policy,
    InsuranceProduct,
    ClientProfile,
    getPolicyById,
    getInsuranceProductById,
    getClientProfileById,
    updatePolicy, // Función para actualizar la póliza
} from '../../policies/policy_management'; // Asegúrate de que esta ruta sea correcta

/**
 * Componente para que un agente edite los detalles de una póliza específica.
 */
export default function AgentEditPolicy() {
    // Usar 'policyId' directamente del useParams
    const { policyId } = useParams<{ policyId: string }>(); 
    const navigate = useNavigate(); // Para la navegación después de la edición

    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);

    // Estados para los campos editables
    const [status, setStatus] = useState<Policy['status']>('pending');
    const [contractDetails, setContractDetails] = useState<string>('');
    const [ageAtInscription, setAgeAtInscription] = useState<string>('');
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [dependents, setDependents] = useState<Dependent[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    /**
     * Hook useEffect para cargar los datos de la póliza.
     */
    useEffect(() => {
        const fetchPolicyData = async () => {
            if (!policyId) {
                setError('ID de póliza no proporcionado.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setMessage(null); // Limpiar mensajes al cargar nueva póliza

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
                setStatus(policyData.status);
                setContractDetails(policyData.contract_details || '');
                setAgeAtInscription(policyData.age_at_inscription?.toString() || '');
                setBeneficiaries(policyData.beneficiaries || []);
                setDependents(policyData.dependents_details || []);

                // 2. Obtener los detalles del producto asociado
                const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
                if (productError) {
                    console.error(`Error al obtener producto con ID ${policyData.product_id}:`, productError);
                    setProduct(null);
                } else {
                    setProduct(productData);
                }

                // 3. Obtener los detalles del cliente asociado
                const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
                if (clientError) {
                    console.error(`Error al obtener cliente con ID ${policyData.client_id}:`, clientError);
                    setClient(null);
                } else {
                    setClient(clientData);
                }

            } catch (err: any) {
                console.error("Error general al cargar datos de póliza:", err);
                setError(`Error inesperado al cargar la póliza: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchPolicyData();
    }, [policyId]); // Dependencia: re-ejecutar cuando cambie policyId

    /**
     * Maneja el envío del formulario para actualizar la póliza.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null); // Limpiar mensaje previo
        setError(null); // Limpiar error previo

        if (!policyId) {
            setError("Error: ID de póliza no disponible para guardar.");
            setSaving(false);
            return;
        }
        if (!policy) {
            setError("Error: Póliza no cargada para guardar.");
            setSaving(false);
            return;
        }
        // Validar que 'product' no sea null antes de acceder a sus propiedades
        if (!product) {
            setError("Error: Producto de seguro no cargado. No se pueden validar los campos específicos.");
            setSaving(false);
            return;
        }

        // Validaciones específicas para cada tipo de póliza
        // Las declaramos con tipo explícito `| null` para el caso de que deban ser nulas
        let updatedBeneficiaries: Beneficiary[] | null = beneficiaries;
        let updatedDependents: Dependent[] | null = dependents;
        let updatedNumBeneficiaries: number | null = beneficiaries.length;
        let updatedNumDependents: number | null = dependents.length;

        if (product.type === 'life') {
            const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => {
                const percentage = typeof b.percentage === 'number' ? b.percentage : 0;
                return sum + percentage;
            }, 0);

            if (beneficiaries.length === 0) {
                setError("Debe añadir al menos un beneficiario para una póliza de vida.");
                setSaving(false);
                return;
            }
            if (totalBeneficiaryPercentage !== 100) {
                setError(`La suma de los porcentajes de los beneficiarios debe ser 100%. Actualmente es ${totalBeneficiaryPercentage}%.`);
                setSaving(false);
                return;
            }
            if (product.coverage_details?.max_beneficiaries !== null && product.coverage_details?.max_beneficiaries !== 0 && beneficiaries.length > (product.coverage_details?.max_beneficiaries ?? Infinity)) {
                setError(`El número de beneficiarios excede el límite permitido por el producto (${product.coverage_details.max_beneficiaries}).`);
                setSaving(false);
                return;
            }
            // Para pólizas de vida, los dependientes deben ser null
            updatedBeneficiaries = beneficiaries;
            updatedNumBeneficiaries = beneficiaries.length;
            updatedDependents = null; 
            updatedNumDependents = null; 

        } else if (product.type === 'health') {
            // Validar dependientes
            if (product.coverage_details?.max_dependents !== null && dependents.length > (product.coverage_details?.max_dependents ?? Infinity)) {
                setError(`El número de dependientes excede el límite permitido por el producto (${product.coverage_details.max_dependents}).`);
                setSaving(false);
                return;
            }
            if (product.coverage_details?.max_dependents === 0 && dependents.length > 0) {
                setError("Este producto de seguro de salud no permite dependientes.");
                setSaving(false);
                return;
            }
            // Para pólizas de salud, los beneficiarios deben ser null
            updatedDependents = dependents;
            updatedNumDependents = dependents.length;
            updatedBeneficiaries = null; 
            updatedNumBeneficiaries = null; 
        }

        // Preparar los datos para la actualización
        const updatedPolicyData = {
            status: status,
            contract_details: contractDetails,
            age_at_inscription: ageAtInscription ? parseInt(ageAtInscription) : null,
            beneficiaries: updatedBeneficiaries,
            num_beneficiaries: updatedNumBeneficiaries,
            dependents_details: updatedDependents,
            num_dependents: updatedNumDependents,
            // Las otras columnas que son fijas por el producto o automáticas no se modifican aquí
        };

        try {
            // Llamar a la función updatePolicy que encapsula la lógica de Supabase
            const { error: updateError } = await updatePolicy(policyId, updatedPolicyData);

            if (updateError) {
                throw updateError;
            }

            setMessage("Póliza actualizada exitosamente.");
            // Navegar de vuelta a la página de detalles después de guardar
            navigate(`/agent/dashboard/policies/${policyId}`);

        } catch (err: any) {
            console.error("Error al actualizar póliza:", err);
            setError(`Error al actualizar póliza: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Helper para Capitalizar la primera letra de la frecuencia de pago
    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    // Determinar maxBeneficiaries y maxDependents para los componentes de lista
    const policyMaxBeneficiaries: number | null = product?.coverage_details?.max_beneficiaries ?? null;
    const policyMaxDependents: number | null = product?.coverage_details?.max_dependents ?? null;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando detalles de la póliza...</p>
            </div>
        );
    }

    if (error && !policy) { // Muestra error si no se pudo cargar la póliza inicialmente
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <p className="text-red-600 text-xl mb-4">{error}</p>
                <Link to="/agent/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                    Volver a Pólizas
                </Link>
            </div>
        );
    }

    if (!policy) { // Si loading es false pero policy es null
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <p className="text-gray-600 text-xl mb-4">No se encontraron detalles para esta póliza.</p>
                <Link to="/agent/dashboard/policies" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                    Volver a Pólizas
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-700">Editar Póliza: {policy.policy_number}</h2>
                {/* Botón para volver a la lista de pólizas (similar al del administrador) */}
                <Link
                    to="/agent/dashboard/policies" // Navega a la lista de pólizas
                    className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition duration-300 shadow-md"
                >
                    Volver a Pólizas
                </Link>
            </div>

            {message && (
                <div
                    className={`p-4 mb-4 rounded-lg text-white ${error ? 'bg-red-500' : 'bg-green-500'}`}
                >
                    {message}
                </div>
            )}
            {error && !message && ( // Mostrar error solo si no hay un mensaje de éxito también
                <div className="p-4 mb-4 rounded-lg text-white bg-red-500">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sección de Información General y del Cliente (solo lectura) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                    <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4">Información General de la Póliza</h3>
                        <p className="mb-2"><strong className="font-medium">Número de Póliza:</strong> {policy.policy_number}</p>
                        <p className="mb-2"><strong className="font-medium">Producto:</strong> {product ? product.name : 'Cargando...'}</p>
                        <p className="mb-2"><strong className="font-medium">Tipo de Producto:</strong> {product ? capitalize(product.type) : 'Cargando...'}</p>
                        <p className="mb-2"><strong className="font-medium">Fecha de Inicio:</strong> {policy.start_date}</p>
                        <p className="mb-2"><strong className="font-medium">Fecha de Fin:</strong> {policy.end_date}</p>
                        <p className="mb-2"><strong className="font-medium">Monto de Prima:</strong> ${policy.premium_amount.toFixed(2)}</p>
                        <p className="mb-2"><strong className="font-medium">Frecuencia de Pago:</strong> {capitalize(policy.payment_frequency)}</p>
                    </div>

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
                </div>

                {/* Campos Editables */}
                <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Detalles Editables de la Póliza</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Estado de la Póliza */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado de la Póliza</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Policy['status'])}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="active">Activa</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="expired">Expirada</option>
                            <option value="rejected">Rechazada</option>
                        </select>
                    </div>
                    {/* Edad al Inscribirse */}
                    <div>
                        <label htmlFor="ageAtInscription" className="block text-sm font-medium text-gray-700">Edad al Inscribirse</label>
                        <input
                            type="number"
                            id="ageAtInscription"
                            value={ageAtInscription}
                            onChange={(e) => setAgeAtInscription(e.target.value)}
                            min="0"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Edad del asegurado"
                        />
                    </div>
                    {/* Detalles del Contrato */}
                    <div className="md:col-span-2">
                        <label htmlFor="contractDetails" className="block text-sm font-medium text-gray-700">Detalles del Contrato (Notas del Agente)</label>
                        <textarea
                            id="contractDetails"
                            value={contractDetails}
                            onChange={(e) => setContractDetails(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Notas específicas del contrato o cualquier detalle adicional para el agente."
                        ></textarea>
                    </div>
                </div>

                {/* Sección de Coberturas Definidas por el Producto (solo lectura) */}
                <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Coberturas del Producto (Fijas)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-100 p-4 rounded-md">
                    {product?.type === 'life' && (
                        <>
                            <p><strong className="font-medium">Monto Cobertura Principal:</strong> ${policy.coverage_amount?.toFixed(2) || 'N/A'}</p>
                            <p><strong className="font-medium">AD&D Incluido:</strong> {policy.ad_d_included ? 'Sí' : 'No'}</p>
                            {policy.ad_d_included && <p><strong className="font-medium">Cobertura AD&D:</strong> ${policy.ad_d_coverage?.toFixed(2) || 'N/A'}</p>}
                            <p><strong className="font-medium">Reembolso Bienestar:</strong> {policy.wellness_rebate ? `${policy.wellness_rebate}%` : 'N/A'}</p>
                            <p><strong className="font-medium">Máx. Beneficiarios Permitidos:</strong> {policyMaxBeneficiaries === 0 ? 'Ilimitado' : policyMaxBeneficiaries || 'N/A'}</p>
                        </>
                    )}
                    {product?.type === 'health' && (
                        <>
                            <p><strong className="font-medium">Deducible:</strong> ${policy.deductible?.toFixed(2) || 'N/A'}</p>
                            <p><strong className="font-medium">Coaseguro:</strong> {policy.coinsurance || 'N/A'}%</p>
                            <p><strong className="font-medium">Máx. Desembolsable Anual:</strong> ${policy.max_annual?.toFixed(2) || 'N/A'}</p>
                            <p><strong className="font-medium">Reembolso Bienestar:</strong> {policy.wellness_rebate ? `${policy.wellness_rebate}%` : 'N/A'}</p>
                            <p><strong className="font-medium">Dental Básico:</strong> {policy.has_dental_basic ? 'Sí' : 'No'}</p>
                            <p><strong className="font-medium">Dental Premium:</strong> {policy.has_dental_premium ? 'Sí' : 'No'}</p>
                            <p><strong className="font-medium">Visión Básico:</strong> {policy.has_vision_basic ? 'Sí' : 'No'}</p>
                            <p><strong className="font-medium">Visión Completo:</strong> {policy.has_vision_full ? 'Sí' : 'No'}</p>
                            <p><strong className="font-medium">Máx. Dependientes Permitidos:</strong> {policyMaxDependents === 0 ? 'No permitidos' : policyMaxDependents || 'N/A'}</p>
                        </>
                    )}
                </div>

                {/* Sección de Beneficiarios o Dependientes */}
                {product?.type === 'life' && (
                    <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Beneficiarios de la Póliza</h4>
                        <BeneficiaryInputList
                            beneficiaries={beneficiaries}
                            onChange={setBeneficiaries}
                            maxBeneficiaries={policyMaxBeneficiaries}
                        />
                    </div>
                )}
                {product?.type === 'health' && (
                    <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Dependientes de la Póliza</h4>
                        {policyMaxDependents !== null && policyMaxDependents === 0 ? (
                            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                                <strong className="font-bold">Información:</strong>
                                <span className="block sm:inline"> Este producto de seguro no permite dependientes.</span>
                            </div>
                        ) : (
                            <DependentInputList
                                dependents={dependents}
                                onChange={setDependents}
                                maxDependents={policyMaxDependents}
                            />
                        )}
                    </div>
                )}

                {/* Botón de Guardar Cambios y Cancelar */}
                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                        type="button" // Cambiado a type="button" para evitar envío de formulario
                        onClick={() => navigate('/agent/dashboard/policies')} // Navega a la lista de pólizas
                        className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}