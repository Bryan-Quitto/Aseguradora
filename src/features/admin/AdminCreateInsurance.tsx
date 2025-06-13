import React, { useState } from 'react';
// La única importación de supabase que necesitas es esta.
// Viene del archivo que acabamos de configurar.
import { supabase } from '../../supabase/client';

/**
 * Componente React para que un administrador pueda crear un nuevo producto de seguro.
 * Permite introducir los detalles del producto y sus coberturas asociadas de forma dinámica.
 */
const AdminCreateInsurance: React.FC = () => {
    // Estados para los campos básicos del formulario de 'insurance_products'
    const [name, setName] = useState<string>('');
    const [type, setType] = useState<string>('life'); // 'life' o 'health'
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
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState<boolean>(false);

    // --- ¡IMPORTANTE! ---
    // El hook useEffect para inicializar Supabase se ha ELIMINADO.
    // Esa lógica ahora reside completamente en `src/supabase/client.ts`.
    // El componente ahora es más limpio y solo se encarga de su propia lógica.

    /**
     * Maneja el envío del formulario para crear un nuevo producto de seguro.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setIsError(false);

        // Esta validación ahora debería pasar siempre, porque si supabase
        // no se pudiera inicializar, la app fallaría al cargar `client.ts`
        // gracias al `throw new Error` que añadimos.
        if (!supabase) {
            setMessage("El cliente de Supabase no está inicializado. Error crítico en la configuración.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // --- Validaciones Frontend ---
        // (El resto de tus validaciones aquí, que ya estaban correctas)
        if (!name.trim()) {
            setMessage("El nombre del producto es requerido.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (!description.trim()) {
            setMessage("La descripción es requerida.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (parseFloat(basePremium) <= 0 || isNaN(parseFloat(basePremium))) {
            setMessage("La prima base debe ser un número positivo.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (durationMonths && (parseInt(durationMonths) <= 0 || isNaN(parseInt(durationMonths)))) {
            setMessage("La duración en meses debe ser un número entero positivo.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (!termsAndConditions.trim()) {
            setMessage("Los términos y condiciones son requeridos.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // Validaciones específicas para cada tipo de seguro
        if (type === 'life') {
            if (coverageAmount && (parseFloat(coverageAmount) <= 0 || isNaN(parseFloat(coverageAmount)))) {
                setMessage("El monto de cobertura de vida debe ser un número positivo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (adDCoverageAmount && (parseFloat(adDCoverageAmount) <= 0 || isNaN(parseFloat(adDCoverageAmount)))) {
                setMessage("El monto de cobertura AD&D debe ser un número positivo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (wellnessRebatePercentage && (parseFloat(wellnessRebatePercentage) < 0 || parseFloat(wellnessRebatePercentage) > 100 || isNaN(parseFloat(wellnessRebatePercentage)))) {
                setMessage("El porcentaje de reembolso de bienestar debe estar entre 0 y 100.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (maxAgeForInscription && (parseInt(maxAgeForInscription) <= 0 || isNaN(parseInt(maxAgeForInscription)))) {
                setMessage("La edad máxima de inscripción debe ser un número entero positivo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (maxBeneficiaries && (parseInt(maxBeneficiaries) < 0 || isNaN(parseInt(maxBeneficiaries)))) {
                setMessage("El número máximo de beneficiarios debe ser un número entero no negativo.");
                setIsError(true);
                setLoading(false);
                return;
            }
        } else if (type === 'health') {
            if (deductible && (parseFloat(deductible) < 0 || isNaN(parseFloat(deductible)))) {
                setMessage("El deducible debe ser un número no negativo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (coinsurancePercentage && (parseFloat(coinsurancePercentage) < 0 || parseFloat(coinsurancePercentage) > 100 || isNaN(parseFloat(coinsurancePercentage)))) {
                setMessage("El porcentaje de coaseguro debe estar entre 0 y 100.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (maxAnnualOutOfPocket && (parseFloat(maxAnnualOutOfPocket) < 0 || isNaN(parseFloat(maxAnnualOutOfPocket)))) {
                setMessage("El gasto máximo anual de bolsillo debe ser un número no negativo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (wellnessRebatePercentage && (parseFloat(wellnessRebatePercentage) < 0 || parseFloat(wellnessRebatePercentage) > 100 || isNaN(parseFloat(wellnessRebatePercentage)))) {
                setMessage("El porcentaje de reembolso de bienestar debe estar entre 0 y 100.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (maxAgeForInscription && (parseInt(maxAgeForInscription) <= 0 || isNaN(parseInt(maxAgeForInscription)))) {
                setMessage("La edad máxima de inscripción debe ser un número entero positivo.");
                setIsError(true);
                setLoading(false);
                return;
            }
            if (maxDependents && (parseInt(maxDependents) < 0 || isNaN(parseInt(maxDependents)))) {
                setMessage("El número máximo de dependientes debe ser un número entero no negativo.");
                setIsError(true);
                setLoading(false);
                return;
            }
        }
        // --- Fin Validaciones Frontend ---


        // Construye el objeto coverage_details incluyendo solo los campos relevantes
        const finalCoverageDetails: { [key: string]: any } = {};

        if (type === 'life') {
            // Solo si el campo tiene un valor, lo incluimos y lo parseamos
            if (coverageAmount) finalCoverageDetails.coverage_amount = parseFloat(coverageAmount);
            finalCoverageDetails.ad_d_included = adDIncluded;
            if (adDCoverageAmount) finalCoverageDetails.ad_d_coverage_amount = parseFloat(adDCoverageAmount);
            if (wellnessRebatePercentage) finalCoverageDetails.wellness_rebate_percentage = parseFloat(wellnessRebatePercentage);
            if (maxAgeForInscription) finalCoverageDetails.max_age_for_inscription = parseInt(maxAgeForInscription);
            if (maxBeneficiaries) finalCoverageDetails.max_beneficiaries = parseInt(maxBeneficiaries);
        } else if (type === 'health') {
            if (deductible) finalCoverageDetails.deductible = parseFloat(deductible);
            if (coinsurancePercentage) finalCoverageDetails.coinsurance_percentage = parseInt(coinsurancePercentage);
            if (maxAnnualOutOfPocket) finalCoverageDetails.max_annual_out_of_pocket = parseFloat(maxAnnualOutOfPocket);
            finalCoverageDetails.includes_dental_basic = includesDentalBasic;
            finalCoverageDetails.includes_dental_premium = includesDentalPremium;
            finalCoverageDetails.includes_vision_basic = includesVisionBasic;
            finalCoverageDetails.includes_vision_full = includesVisionFull;
            if (wellnessRebatePercentage) finalCoverageDetails.wellness_rebate_percentage = parseFloat(wellnessRebatePercentage);
            if (maxAgeForInscription) finalCoverageDetails.max_age_for_inscription = parseInt(maxAgeForInscription);
            if (maxDependents) finalCoverageDetails.max_dependents = parseInt(maxDependents);
        }

        const newProduct = {
            name,
            type,
            description,
            duration_months: durationMonths ? parseInt(durationMonths) : null,
            base_premium: parseFloat(basePremium), // Ya validado como número positivo
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
                .insert([newProduct]);

            if (error) {
                throw error;
            }

            setMessage("Producto de seguro creado exitosamente.");
            setIsError(false);
            // Limpiar el formulario después del éxito
            setName('');
            setDescription('');
            setDurationMonths('');
            setBasePremium('');
            setCurrency('USD'); // Resetear a valor por defecto
            setTermsAndConditions('');
            setIsActive(true);
            setAdminNotes('');
            setFixedPaymentFrequency('monthly'); // Resetear a valor por defecto

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
            setMaxDependents('');

            // Ocultar el mensaje de éxito después de 3 segundos
            setTimeout(() => setMessage(null), 3000);

        } catch (error: any) {
            console.error("Error al crear producto de seguro:", error);
            setMessage(`Error al crear producto de seguro: ${error.message}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
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
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Producto <span className="text-red-500">*</span></label>
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
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo de Seguro <span className="text-red-500">*</span></label>
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value);
                                    // Limpiar los estados de los campos específicos del otro tipo de seguro
                                    if (e.target.value === 'life') {
                                        setDeductible('');
                                        setCoinsurancePercentage('');
                                        setMaxAnnualOutOfPocket('');
                                        setIncludesDentalBasic(false);
                                        setIncludesDentalPremium(false);
                                        setIncludesVisionBasic(false);
                                        setIncludesVisionFull(false);
                                        setMaxDependents('');
                                    } else if (e.target.value === 'health') {
                                        setCoverageAmount('');
                                        setAdDIncluded(false);
                                        setAdDCoverageAmount('');
                                        setMaxBeneficiaries('');
                                    }
                                    // wellnessRebatePercentage y maxAgeForInscription aplican a ambos, no se limpian aquí.
                                }}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="life">Vida</option>
                                <option value="health">Salud</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción <span className="text-red-500">*</span></label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            required
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
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Ej: 24 (para 2 años)"
                            />
                        </div>
                    </div>

                    {/* Detalles de Prima, Moneda y Frecuencia de Pago Fija */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Precios y Frecuencia de Pago Fija</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="basePremium" className="block text-sm font-medium text-gray-700">Prima Base <span className="text-red-500">*</span></label>
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
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Moneda <span className="text-red-500">*</span></label>
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
                            <label htmlFor="fixedPaymentFrequency" className="block text-sm font-medium text-gray-700">Frecuencia de Pago Fija <span className="text-red-500">*</span></label>
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
                        <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">Términos y Condiciones <span className="text-red-500">*</span></label>
                        <textarea
                            id="termsAndConditions"
                            value={termsAndConditions}
                            onChange={(e) => setTermsAndConditions(e.target.value)}
                            rows={4}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Detalles sobre la letra pequeña del seguro."
                        ></textarea>
                    </div>

                    {/* Sección de Detalles de Cobertura Específicos (Renderizado Condicional) */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Detalles de Cobertura Específicos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {type === 'life' && (
                            <>
                                <div>
                                    <label htmlFor="coverageAmount" className="block text-sm font-medium text-gray-700">Monto de Cobertura (Vida)</label>
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
                                <div className="flex items-center col-span-full md:col-span-1">
                                    <input
                                        id="adDIncluded"
                                        type="checkbox"
                                        checked={adDIncluded}
                                        onChange={(e) => setAdDIncluded(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="adDIncluded" className="ml-2 block text-sm text-gray-900">Incluye Muerte y Desmembramiento Accidental (AD&D)</label>
                                </div>
                                {adDIncluded && (
                                    <div>
                                        <label htmlFor="adDCoverageAmount" className="block text-sm font-medium text-gray-700">Monto de Cobertura AD&D</label>
                                        <input
                                            type="number"
                                            id="adDCoverageAmount"
                                            value={adDCoverageAmount}
                                            onChange={(e) => setAdDCoverageAmount(e.target.value)}
                                            step="0.01"
                                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="Ej: 50000"
                                        />
                                    </div>
                                )}
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
                                    <label htmlFor="maxBeneficiaries" className="block text-sm font-medium text-gray-700">Máx. Beneficiarios</label>
                                    <input
                                        type="number"
                                        id="maxBeneficiaries"
                                        value={maxBeneficiaries}
                                        onChange={(e) => setMaxBeneficiaries(e.target.value)}
                                        min="1"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej: 5"
                                    />
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
                            Notas internas para el administrador
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