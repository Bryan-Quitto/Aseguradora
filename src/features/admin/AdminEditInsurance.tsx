import React, { useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js'; // Comentado ya que no se puede resolver en este entorno
// import { useParams, useNavigate } from 'react-router-dom'; // Comentado, se usarán mocks

// *** Mocks para dependencias no disponibles en este entorno aislado ***
// Mock de Supabase Client para evitar errores de importación y simular la interacción con Supabase
const createClient = (url: string, key: string) => {
    console.log("Supabase client mocked. URL:", url, "Key:", key);
    return {
        from: (tableName: string) => ({
            select: (_columns: string) => ({ // 'columns' ahora es '_columns' para evitar la advertencia
                eq: (column: string, value: any) => ({
                    single: () => {
                        // Simula la carga de un producto existente para la edición
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                if (value === 'mock-product-id') { // Usar un ID de mock para simular un producto
                                    resolve({
                                        data: {
                                            id: 'mock-product-id',
                                            name: 'Póliza de Salud Familiar (Edit)',
                                            type: 'health',
                                            description: 'Cobertura de salud completa para la familia, versión editada.',
                                            duration_months: 12,
                                            coverage_details: {
                                                deductible: 750,
                                                coinsurance_percentage: 15,
                                                max_annual_out_of_pocket: 6000,
                                                includes_dental_basic: true,
                                                includes_dental_premium: false,
                                                includes_vision_basic: true,
                                                includes_vision_full: false,
                                                wellness_rebate_percentage: 10,
                                                max_age_for_inscription: 70,
                                                max_dependents: 5,
                                            },
                                            base_premium: 220,
                                            currency: 'USD',
                                            terms_and_conditions: 'T&C para salud familiar (editado)',
                                            is_active: true,
                                            admin_notes: 'Notas de administrador para producto editado.',
                                            fixed_payment_frequency: 'quarterly',
                                            created_at: new Date().toISOString(),
                                            updated_at: new Date().toISOString(),
                                        },
                                        error: null,
                                    });
                                } else {
                                    resolve({ data: null, error: { message: 'Producto no encontrado (mock)' } });
                                }
                            }, 500);
                        });
                    }
                })
            }),
            update: async (data: any) => {
                console.log(`Mock: Actualizando en la tabla '${tableName}' los datos:`, data);
                return { error: null, data: data }; // Simula una actualización exitosa
            }
        })
    };
};

// Mock de useParams y useNavigate
const useParams = () => ({ id: 'mock-product-id' }); // Retorna un ID fijo para el mock
const useNavigate = () => ((path: string) => console.log('Mock navigate to:', path)); // Simula la navegación
// *** Fin de Mocks ***

// Declara las variables globales proporcionadas por el entorno Canvas (si aplica)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Instancia del cliente de Supabase (ahora es el mock)
let supabase: any = null;

// Interfaz para el producto de seguro, coincidiendo con la tabla 'insurance_products'
interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other'; // 'life' o 'health'
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
        [key: string]: any; // Permite otras propiedades
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

/**
 * Componente React para que un administrador pueda editar un producto de seguro existente.
 * Carga los detalles del producto por su ID y permite su modificación.
 */
const AdminEditInsurance: React.FC = () => {
    // Eliminado el argumento de tipo de useParams para compatibilidad con el mock
    const { id } = useParams();
    const navigate = useNavigate(); // Para la navegación programática

    // Estados para los campos básicos del formulario de 'insurance_products'
    const [name, setName] = useState<string>('');
    const [type, setType] = useState<string>('life');
    const [description, setDescription] = useState<string>('');
    const [durationMonths, setDurationMonths] = useState<string>('');
    const [basePremium, setBasePremium] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [termsAndConditions, setTermsAndConditions] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [adminNotes, setAdminNotes] = useState<string>('');
    const [fixedPaymentFrequency, setFixedPaymentFrequency] = useState<string>('monthly');

    // Estados para los campos dentro de 'coverage_details' (JSONB)
    const [coverageAmount, setCoverageAmount] = useState<string>('');
    const [deductible, setDeductible] = useState<string>('');
    const [coinsurancePercentage, setCoinsurancePercentage] = useState<string>('');
    const [maxAnnualOutOfPocket, setMaxAnnualOutOfPocket] = useState<string>('');
    const [includesDentalBasic, setIncludesDentalBasic] = useState<boolean>(false);
    const [includesDentalPremium, setIncludesDentalPremium] = useState<boolean>(false);
    const [includesVisionBasic, setIncludesVisionBasic] = useState<boolean>(false);
    const [includesVisionFull, setIncludesVisionFull] = useState<boolean>(false);
    const [adDIncluded, setAdDIncluded] = useState<boolean>(false);
    const [adDCoverageAmount, setAdDCoverageAmount] = useState<string>('');
    const [wellnessRebatePercentage, setWellnessRebatePercentage] = useState<string>('');
    const [maxAgeForInscription, setMaxAgeForInscription] = useState<string>('');
    const [maxBeneficiaries, setMaxBeneficiaries] = useState<string>('');
    const [maxDependents, setMaxDependents] = useState<string>('');

    // Estados para manejar la UI (carga, mensajes de éxito/error)
    const [loading, setLoading] = useState<boolean>(true); // Inicia en true para la carga inicial de datos
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState<boolean>(false); // Correctly declared for boolean flag

    /**
     * Hook useEffect para inicializar el cliente de Supabase y cargar los datos del producto
     * al montar el componente o cuando cambia el ID del producto.
     */
    useEffect(() => {
        const initializeSupabaseAndFetchProduct = async () => {
            try {
                // Inicialización de Supabase si no está globalmente disponible
                if (!supabase) {
                    // Usamos valores placeholder ya que import.meta.env no está disponible
                    const supabaseUrl = 'YOUR_SUPABASE_URL';
                    const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
                    supabase = createClient(supabaseUrl, supabaseAnonKey);
                    console.log("Cliente de Supabase inicializado (mock) en AdminEditInsurance.");
                }

                // Aunque 'id' se obtiene de useParams, el mock siempre devolverá 'mock-product-id'
                // Para el propósito de visualización en Canvas, esto es suficiente.
                // En una aplicación real, 'id' provendría de la URL.
                if (!id) {
                    setMessage("ID del producto no proporcionado.");
                    setIsError(true);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setIsError(false); // Corrected: use setIsError to clear error state
                setMessage(null); // Clear previous messages

                // Cargar los datos del producto existente
                const { data, error: fetchError } = await supabase
                    .from('insurance_products')
                    .select('*')
                    .eq('id', id)
                    .single(); // Espera un solo resultado

                if (fetchError) {
                    console.error('Error al cargar el producto de seguro:', fetchError);
                    setMessage('Error al cargar el producto de seguro: ' + fetchError.message); // Use setMessage for the string
                    setIsError(true);
                } else if (data) {
                    // Rellenar los estados con los datos del producto
                    setName(data.name);
                    setType(data.type);
                    setDescription(data.description || '');
                    setDurationMonths(data.duration_months?.toString() || '');
                    setBasePremium(data.base_premium?.toString() || '');
                    setCurrency(data.currency || 'USD');
                    setTermsAndConditions(data.terms_and_conditions || '');
                    setIsActive(data.is_active);
                    setAdminNotes(data.admin_notes || '');
                    setFixedPaymentFrequency(data.fixed_payment_frequency || 'monthly');

                    // Rellenar los estados de coverage_details
                    const details = data.coverage_details || {};
                    setCoverageAmount(details.coverage_amount?.toString() || '');
                    setDeductible(details.deductible?.toString() || '');
                    setCoinsurancePercentage(details.coinsurance_percentage?.toString() || '');
                    setMaxAnnualOutOfPocket(details.max_annual_out_of_pocket?.toString() || '');
                    setIncludesDentalBasic(details.includes_dental_basic || false);
                    setIncludesDentalPremium(details.includes_dental_premium || false);
                    setIncludesVisionBasic(details.includes_vision_basic || false);
                    setIncludesVisionFull(details.includes_vision_full || false);
                    setAdDIncluded(details.ad_d_included || false);
                    setAdDCoverageAmount(details.ad_d_coverage_amount?.toString() || '');
                    setWellnessRebatePercentage(details.wellness_rebate_percentage?.toString() || '');
                    setMaxAgeForInscription(details.max_age_for_inscription?.toString() || '');
                    setMaxBeneficiaries(details.max_beneficiaries?.toString() || '');
                    setMaxDependents(details.max_dependents?.toString() || '');
                } else {
                    setMessage("Producto de seguro no encontrado.");
                    setIsError(true);
                }
            } catch (err: any) {
                console.error("Error fatal al cargar datos:", err);
                setMessage("Error fatal al cargar datos: " + err.message); // Use setMessage for the string
                setIsError(true);
            } finally {
                setLoading(false);
            }
        };

        initializeSupabaseAndFetchProduct();
    }, [id]); // Dependencia del ID para recargar si cambia

    /**
     * Maneja el envío del formulario para actualizar el producto de seguro.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setIsError(false);

        if (!supabase || !id) {
            setMessage("Error: Cliente de Supabase no inicializado o ID del producto no proporcionado.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // Construye el objeto coverage_details incluyendo solo los campos relevantes
        const finalCoverageDetails: { [key: string]: any } = {};

        if (type === 'life') {
            finalCoverageDetails.coverage_amount = coverageAmount ? parseFloat(coverageAmount) : null;
            finalCoverageDetails.ad_d_included = adDIncluded;
            finalCoverageDetails.ad_d_coverage_amount = adDCoverageAmount ? parseFloat(adDCoverageAmount) : null;
            finalCoverageDetails.wellness_rebate_percentage = wellnessRebatePercentage ? parseFloat(wellnessRebatePercentage) : null;
            finalCoverageDetails.max_age_for_inscription = maxAgeForInscription ? parseInt(maxAgeForInscription) : null;
            finalCoverageDetails.max_beneficiaries = maxBeneficiaries ? parseInt(maxBeneficiaries) : null;
        } else if (type === 'health') {
            finalCoverageDetails.deductible = deductible ? parseFloat(deductible) : null;
            finalCoverageDetails.coinsurance_percentage = coinsurancePercentage ? parseInt(coinsurancePercentage) : null;
            finalCoverageDetails.max_annual_out_of_pocket = maxAnnualOutOfPocket ? parseFloat(maxAnnualOutOfPocket) : null;
            finalCoverageDetails.includes_dental_basic = includesDentalBasic;
            finalCoverageDetails.includes_dental_premium = includesDentalPremium;
            finalCoverageDetails.includes_vision_basic = includesVisionBasic;
            finalCoverageDetails.includes_vision_full = includesVisionFull;
            finalCoverageDetails.wellness_rebate_percentage = wellnessRebatePercentage ? parseFloat(wellnessRebatePercentage) : null;
            finalCoverageDetails.max_age_for_inscription = maxAgeForInscription ? parseInt(maxAgeForInscription) : null;
            finalCoverageDetails.max_dependents = maxDependents ? parseInt(maxDependents) : null;
        }

        const updatedProduct = {
            name,
            type,
            description,
            duration_months: durationMonths ? parseInt(durationMonths) : null,
            base_premium: parseFloat(basePremium),
            currency,
            terms_and_conditions: termsAndConditions,
            is_active: isActive,
            coverage_details: finalCoverageDetails,
            admin_notes: adminNotes,
            fixed_payment_frequency: fixedPaymentFrequency,
        };

        try {
            const { error } = await supabase
                .from('insurance_products')
                .update(updatedProduct) // Utiliza .update() en lugar de .insert()
                .eq('id', id); // Filtra por el ID para actualizar el registro correcto

            if (error) {
                throw error;
            }

            setMessage("Producto de seguro actualizado exitosamente.");
            setIsError(false);
            // Opcional: podrías navegar de vuelta a la lista de productos
            // navigate('/admin/dashboard/insurance-products');
        } catch (error: any) {
            console.error("Error al actualizar producto de seguro:", error);
            setMessage(`Error al actualizar producto de seguro: ${error.message}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando detalles del producto...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">¡Error!</strong>
                <span className="block sm:inline"> {message}</span>
                <button onClick={() => navigate('/admin/dashboard/insurance-products')} className="ml-4 text-sm underline">Volver a la lista</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4"> {/* Fondo azul muy claro */}
            {/* El borde se ha cambiado a turquesa menta claro */}
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full border" style={{ borderColor: '#7DDCDD' }}>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Editar Producto de Seguro
                </h2>

                {message && (
                    <div
                        className={`p-4 mb-4 rounded-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`}
                    >
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Detalles Básicos del Producto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Ej: Seguro de Vida Premium"
                            />
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo de Seguro</label>
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="life">Vida</option>
                                <option value="health">Salud</option>
                                <option value="other">Otro</option> {/* Agregué 'other' ya que está en tu esquema */}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Una descripción detallada de lo que cubre este seguro."
                        ></textarea>
                    </div>

                    {/* Duración Fija del Producto */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Duración de la Póliza (en meses)</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">Duración Fija (Meses)</label>
                            <input
                                type="number"
                                id="durationMonths"
                                value={durationMonths}
                                onChange={(e) => setDurationMonths(e.target.value)}
                                min="1"
                                required
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Ej: 24 (para 2 años)"
                            />
                        </div>
                    </div>

                    {/* Detalles de Prima, Moneda y Frecuencia de Pago Fija */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Precios y Frecuencia de Pago Fija</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="basePremium" className="block text-sm font-medium text-gray-700">Prima Base</label>
                            <input
                                type="number"
                                id="basePremium"
                                value={basePremium}
                                onChange={(e) => setBasePremium(e.target.value)}
                                required
                                step="0.01"
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Ej: 150.00"
                            />
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Moneda</label>
                            <select
                                id="currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="fixedPaymentFrequency" className="block text-sm font-medium text-gray-700">Frecuencia de Pago Fija</label>
                            <select
                                id="fixedPaymentFrequency"
                                value={fixedPaymentFrequency}
                                onChange={(e) => setFixedPaymentFrequency(e.target.value)}
                                required
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="monthly">Mensual</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="annually">Anual</option>
                            </select>
                        </div>
                    </div>

                    {/* Términos y Condiciones */}
                    <div>
                        <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">Términos y Condiciones</label>
                        <textarea
                            id="termsAndConditions"
                            value={termsAndConditions}
                            onChange={(e) => setTermsAndConditions(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Detalles sobre la letra pequeña del seguro."
                        ></textarea>
                    </div>

                    {/* Descripción Adicional (Notas del Administrador) */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Notas Adicionales del Administrador</h3>
                    <div>
                        <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700">
                            Descripción Adicional de Cobertura (texto plano)
                        </label>
                        <textarea
                            id="adminNotes"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={6}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Escribe aquí cualquier detalle adicional o nota interna sobre este producto de seguro."
                        ></textarea>
                        <p className="mt-2 text-sm text-gray-500">
                            Este campo es para notas internas del administrador sobre el producto, no es un campo estructurado.
                        </p>
                    </div>

                    {/* Estado Activo del Producto */}
                    <div className="flex items-center pt-4 border-t border-gray-200">
                        <input
                            id="isActive"
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Producto Activo</label>
                    </div>


                    {/* Sección de Detalles de Cobertura Específicos (Renderizado Condicional) */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Detalles de Cobertura Específicos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {type === 'life' && (
                            <>
                                {/* Campos específicos para Seguros de Vida */}
                                <div>
                                    <label htmlFor="coverageAmount" className="block text-sm font-medium text-gray-700">Monto de Cobertura Principal</label>
                                    <input
                                        type="number"
                                        id="coverageAmount"
                                        value={coverageAmount}
                                        onChange={(e) => setCoverageAmount(e.target.value)}
                                        step="0.01"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 100000"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="adDCoverageAmount" className="block text-sm font-medium text-gray-700">Monto Cobertura AD&D</label>
                                    <input
                                        type="number"
                                        id="adDCoverageAmount"
                                        value={adDCoverageAmount}
                                        onChange={(e) => setAdDCoverageAmount(e.target.value)}
                                        step="0.01"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 20000"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="wellnessRebatePercentage" className="block text-sm font-medium text-gray-700">Reembolso Bienestar (%)</label>
                                    <input
                                        type="number"
                                        id="wellnessRebatePercentage"
                                        value={wellnessRebatePercentage}
                                        onChange={(e) => setWellnessRebatePercentage(e.target.value)}
                                        min="0" max="100"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxAgeForInscription" className="block text-sm font-medium text-gray-700">Edad Máx. de Inscripción</label>
                                    <input
                                        type="number"
                                        id="maxAgeForInscription"
                                        value={maxAgeForInscription}
                                        onChange={(e) => setMaxAgeForInscription(e.target.value)}
                                        min="0"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 65"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxBeneficiaries" className="block text-sm font-medium text-gray-700">Máx. de Beneficiarios (0-5)</label>
                                    <input
                                        type="number"
                                        id="maxBeneficiaries"
                                        value={maxBeneficiaries}
                                        onChange={(e) => setMaxBeneficiaries(e.target.value)}
                                        min="0"
                                        max="5"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="adDIncluded"
                                        type="checkbox"
                                        checked={adDIncluded}
                                        onChange={(e) => setAdDIncluded(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="adDIncluded" className="ml-2 block text-sm text-gray-900">Incluye AD&D</label>
                                </div>
                            </>
                        )}

                        {type === 'health' && (
                            <>
                                {/* Campos específicos para Seguros de Salud */}
                                <div>
                                    <label htmlFor="deductible" className="block text-sm font-medium text-gray-700">Deducible (Salud)</label>
                                    <input
                                        type="number"
                                        id="deductible"
                                        value={deductible}
                                        onChange={(e) => setDeductible(e.target.value)}
                                        step="0.01"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="coinsurancePercentage" className="block text-sm font-medium text-gray-700">Coaseguro (%)</label>
                                    <input
                                        type="number"
                                        id="coinsurancePercentage"
                                        value={coinsurancePercentage}
                                        onChange={(e) => setCoinsurancePercentage(e.target.value)}
                                        min="0" max="100"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 20"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxAnnualOutOfPocket" className="block text-sm font-medium text-gray-700">Gasto Máximo Anual de Bolsillo</label>
                                    <input
                                        type="number"
                                        id="maxAnnualOutOfPocket"
                                        value={maxAnnualOutOfPocket}
                                        onChange={(e) => setMaxAnnualOutOfPocket(e.target.value)}
                                        step="0.01"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5000"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="wellnessRebatePercentage" className="block text-sm font-medium text-gray-700">Reembolso Bienestar (%)</label>
                                    <input
                                        type="number"
                                        id="wellnessRebatePercentage"
                                        value={wellnessRebatePercentage}
                                        onChange={(e) => setWellnessRebatePercentage(e.target.value)}
                                        min="0" max="100"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxAgeForInscription" className="block text-sm font-medium text-gray-700">Edad Máx. de Inscripción</label>
                                    <input
                                        type="number"
                                        id="maxAgeForInscription"
                                        value={maxAgeForInscription}
                                        onChange={(e) => setMaxAgeForInscription(e.target.value)}
                                        min="0"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 65"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxDependents" className="block text-sm font-medium text-gray-700">Máx. de Dependientes (0 para no permitir)</label>
                                    <input
                                        type="number"
                                        id="maxDependents"
                                        value={maxDependents}
                                        onChange={(e) => setMaxDependents(e.target.value)}
                                        min="0"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5 o 0"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="includesDentalBasic"
                                        type="checkbox"
                                        checked={includesDentalBasic}
                                        onChange={(e) => setIncludesDentalBasic(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="includesDentalBasic" className="ml-2 block text-sm text-gray-900">Incluye Dental Básico</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="includesDentalPremium"
                                        type="checkbox"
                                        checked={includesDentalPremium}
                                        onChange={(e) => setIncludesDentalPremium(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="includesDentalPremium" className="ml-2 block text-sm text-gray-900">Incluye Dental Premium</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="includesVisionBasic"
                                        type="checkbox"
                                        checked={includesVisionBasic}
                                        onChange={(e) => setIncludesVisionBasic(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="includesVisionBasic" className="ml-2 block text-sm text-gray-900">Incluye Visión Básico</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="includesVisionFull"
                                        type="checkbox"
                                        checked={includesVisionFull}
                                        onChange={(e) => setIncludesVisionFull(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="includesVisionFull" className="ml-2 block text-sm text-gray-900">Incluye Visión Completo</label>
                                </div>
                            </>
                        )}
                        {type !== 'life' && type !== 'health' && (
                            <div className="md:col-span-2 lg:col-span-3 text-center text-gray-500 py-4">
                                No hay detalles de cobertura específicos para este tipo de seguro.
                            </div>
                        )}
                    </div>

                    {/* Botón de Envío */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Actualizando...' : 'Actualizar Producto de Seguro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditInsurance;