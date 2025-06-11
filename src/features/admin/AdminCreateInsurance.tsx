import React, { useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js'; // Comentado ya que no se puede resolver en este entorno

// *** Mocks para dependencias no disponibles en este entorno aislado ***
// Mock de Supabase Client para evitar errores de importación y simular la interacción con Supabase
const createClient = (url: string, key: string) => {
    console.log("Supabase client mocked. URL:", url, "Key:", key);
    return {
        from: (tableName: string) => ({
            insert: async (data: any[]) => {
                console.log(`Mock: Insertando en la tabla '${tableName}' los datos:`, data);
                return { error: null, data: data }; // Simula una inserción exitosa
            }
        })
    };
};
// *** Fin de Mocks ***

// Declara las variables globales proporcionadas por el entorno Canvas (si aplica)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Instancia del cliente de Supabase (ahora es el mock)
let supabase: any = null;

/**
 * Componente React para que un administrador pueda crear un nuevo producto de seguro.
 * Permite introducir los detalles del producto y sus coberturas asociadas de forma dinámica.
 */
const AdminCreateInsurance: React.FC = () => {
    // Estados para los campos básicos del formulario de 'insurance_products'
    const [name, setName] = useState<string>('');
    const [type, setType] = useState<string>('life'); // 'life' o 'health'
    const [description, setDescription] = useState<string>('');
    // Cambiado de defaultTermMonths a durationMonths para reflejar duración fija
    const [durationMonths, setDurationMonths] = useState<string>('');
    const [basePremium, setBasePremium] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [termsAndConditions, setTermsAndConditions] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [adminNotes, setAdminNotes] = useState<string>(''); // Nuevo estado para notas de texto plano
    // Nuevo estado para la frecuencia de pago fija por producto
    const [fixedPaymentFrequency, setFixedPaymentFrequency] = useState<string>('monthly');

    // Estados para los campos dentro de 'coverage_details' (JSONB)
    // Se mantienen todos los estados, su visibilidad será controlada por el renderizado condicional
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
    // Nuevo estado para el máximo de dependientes en seguros de salud
    const [maxDependents, setMaxDependents] = useState<string>('');

    // Estados para manejar la UI (carga, mensajes de éxito/error)
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState<boolean>(false);

    /**
     * Hook useEffect para inicializar el cliente de Supabase una sola vez al cargar el componente.
     * Asegura que el cliente de Supabase esté listo antes de realizar operaciones.
     */
    useEffect(() => {
        const initializeSupabaseClient = async () => {
            try {
                // Usamos valores placeholder ya que import.meta.env no está disponible directamente en este entorno de compilación
                const supabaseUrl = 'TU_URL_DE_SUPABASE_AQUI';
                const supabaseAnonKey = 'TU_CLAVE_ANON_DE_SUPABASE_AQUI';

                if (!supabase) {
                    supabase = createClient(supabaseUrl, supabaseAnonKey);
                    console.log("Cliente de Supabase inicializado (mock).");
                }
            } catch (error) {
                console.error("Error al inicializar Supabase:", error);
                setMessage("Error al inicializar la aplicación. Verifique la configuración de Supabase.");
                setIsError(true);
            }
        };

        initializeSupabaseClient();
    }, []);

    /**
     * Maneja el envío del formulario para crear un nuevo producto de seguro.
     * Combina los datos de los estados y los envía a Supabase.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setIsError(false);

        if (!supabase) {
            setMessage("El cliente de Supabase no está inicializado. Por favor, recargue la página o verifique la configuración.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // Construye el objeto coverage_details incluyendo solo los campos relevantes
        // según el tipo de seguro seleccionado.
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
            finalCoverageDetails.max_dependents = maxDependents ? parseInt(maxDependents) : null; // Añadido max_dependents para salud
        }

        const newProduct = {
            name,
            type,
            description,
            duration_months: durationMonths ? parseInt(durationMonths) : null, // Ahora es duration_months
            base_premium: parseFloat(basePremium),
            currency,
            terms_and_conditions: termsAndConditions,
            is_active: isActive,
            coverage_details: finalCoverageDetails,
            admin_notes: adminNotes,
            fixed_payment_frequency: fixedPaymentFrequency, // Añadido la frecuencia de pago fija
        };

        try {
            const { error } = await supabase
                .from('insurance_products')
                .insert([newProduct]);

            if (error) {
                throw error;
            }

            setMessage("Producto de seguro creado exitosamente.");
            setIsError(false);
            // Limpiar el formulario después del éxito
            setName('');
            setDescription('');
            setDurationMonths(''); // Limpiar el campo de duración
            setBasePremium('');
            setTermsAndConditions('');
            setIsActive(true);
            setAdminNotes('');
            setFixedPaymentFrequency('monthly'); // Resetear la frecuencia de pago fija

            // Limpiar estados de coverage_details
            setCoverageAmount('');
            setDeductible('');
            setCoinsurancePercentage('');
            setMaxAnnualOutOfPocket('');
            setIncludesDentalBasic(false);
            setIncludesDentalPremium(false);
            setIncludesVisionBasic(false);
            setIncludesVisionFull(false);
            setAdDIncluded(false);
            setAdDCoverageAmount('');
            setWellnessRebatePercentage('');
            setMaxAgeForInscription('');
            setMaxBeneficiaries('');
            setMaxDependents(''); // Limpiar el nuevo campo

        } catch (error: any) {
            console.error("Error al crear producto de seguro:", error);
            setMessage(`Error al crear producto de seguro: ${error.message}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4"> {/* Cambiado el fondo a un azul muy claro */}
            {/* El borde se ha cambiado a turquesa menta claro */}
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full border" style={{ borderColor: '#7DDCDD' }}>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Crear Nuevo Producto de Seguro
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
                    <div className="grid grid-cols-1 gap-6"> {/* Se convierte a 1 columna */}
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

                    {/* Botón de Envío */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando...' : 'Crear Producto de Seguro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminCreateInsurance;