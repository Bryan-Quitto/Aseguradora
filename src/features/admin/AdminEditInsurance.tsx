import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// 1. La única importación de Supabase que necesitas es esta.
import { supabase } from '../../supabase/client';

// Interfaz para el producto de seguro, coincidiendo con la tabla 'insurance_products'
// Nota: He quitado 'other' de 'type' para que coincida con la lógica del formulario.
// Si realmente necesitas 'other', deberás añadirlo en el JSX del <select>.
interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health';
    description: string | null;
    duration_months: number | null;
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    created_at: string;
    updated_at: string;
    coverage_details: {
        // Campos opcionales para ambos tipos
        wellness_rebate_percentage?: number;
        max_age_for_inscription?: number;
        // Campos de 'life'
        coverage_amount?: number;
        ad_d_included?: boolean;
        ad_d_coverage_amount?: number;
        max_beneficiaries?: number;
        // Campos de 'health'
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        max_dependents?: number;
        [key: string]: any; // Permite otras propiedades no definidas explícitamente
    };
}

/**
 * Componente React para que un administrador pueda editar un producto de seguro existente.
 * Carga los detalles del producto por su ID y permite su modificación.
 */
const AdminEditInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Obtiene el ID del producto de la URL
    const navigate = useNavigate(); // Para la navegación programática

    // Estados para los campos del formulario
    const [name, setName] = useState<string>('');
    const [type, setType] = useState<'life' | 'health'>('life');
    const [description, setDescription] = useState<string>('');
    const [durationMonths, setDurationMonths] = useState<string>('');
    const [basePremium, setBasePremium] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [termsAndConditions, setTermsAndConditions] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [adminNotes, setAdminNotes] = useState<string>('');
    const [fixedPaymentFrequency, setFixedPaymentFrequency] = useState<string>('monthly');

    // Estados para los campos de 'coverage_details' (JSONB)
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

    // Estados para manejar la UI
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState<boolean>(false);

    /**
     * Hook para cargar los datos del producto al montar el componente.
     * Ya no inicializa Supabase, solo lo usa.
     */
    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) {
                setMessage("ID del producto no proporcionado en la URL.");
                setIsError(true);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('insurance_products')
                    .select('*')
                    .eq('id', id)
                    .single<InsuranceProduct>(); // Usamos .single() y la interfaz para tipado

                if (error) throw error;

                if (data) {
                    // Rellenar los estados con los datos del producto
                    setName(data.name);
                    setType(data.type);
                    setDescription(data.description || '');
                    setDurationMonths(data.duration_months?.toString() || '');
                    setBasePremium(data.base_premium.toString());
                    setCurrency(data.currency);
                    setTermsAndConditions(data.terms_and_conditions || '');
                    setIsActive(data.is_active);
                    setAdminNotes(data.admin_notes || '');
                    setFixedPaymentFrequency(data.fixed_payment_frequency || 'monthly');

                    // Rellenar los estados de coverage_details
                    const details = data.coverage_details || {};
                    setWellnessRebatePercentage(details.wellness_rebate_percentage?.toString() || '');
                    setMaxAgeForInscription(details.max_age_for_inscription?.toString() || '');
                    
                    // Campos de Vida
                    setCoverageAmount(details.coverage_amount?.toString() || '');
                    setAdDIncluded(details.ad_d_included || false);
                    setAdDCoverageAmount(details.ad_d_coverage_amount?.toString() || '');
                    setMaxBeneficiaries(details.max_beneficiaries?.toString() || '');

                    // Campos de Salud
                    setDeductible(details.deductible?.toString() || '');
                    setCoinsurancePercentage(details.coinsurance_percentage?.toString() || '');
                    setMaxAnnualOutOfPocket(details.max_annual_out_of_pocket?.toString() || '');
                    setIncludesDentalBasic(details.includes_dental_basic || false);
                    setIncludesDentalPremium(details.includes_dental_premium || false);
                    setIncludesVisionBasic(details.includes_vision_basic || false);
                    setIncludesVisionFull(details.includes_vision_full || false);
                    setMaxDependents(details.max_dependents?.toString() || '');
                } else {
                    setMessage("Producto de seguro no encontrado.");
                    setIsError(true);
                }
            } catch (err: any) {
                console.error("Error al cargar producto de seguro:", err);
                setMessage(`Error al cargar los datos del producto: ${err.message}`);
                setIsError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]); // La dependencia del ID es correcta para recargar si cambia.

    /**
     * Maneja el envío del formulario para actualizar el producto de seguro.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setIsError(false);

        if (!id) {
            setMessage("Error crítico: ID del producto no disponible para la actualización.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // (Aquí puedes añadir las mismas validaciones que en el formulario de creación si lo deseas)

        // Construye el objeto coverage_details
        const finalCoverageDetails: InsuranceProduct['coverage_details'] = {
            wellness_rebate_percentage: wellnessRebatePercentage ? parseFloat(wellnessRebatePercentage) : undefined,
            max_age_for_inscription: maxAgeForInscription ? parseInt(maxAgeForInscription) : undefined,
        };

        if (type === 'life') {
            finalCoverageDetails.coverage_amount = coverageAmount ? parseFloat(coverageAmount) : undefined;
            finalCoverageDetails.ad_d_included = adDIncluded;
            finalCoverageDetails.ad_d_coverage_amount = adDCoverageAmount ? parseFloat(adDCoverageAmount) : undefined;
            finalCoverageDetails.max_beneficiaries = maxBeneficiaries ? parseInt(maxBeneficiaries) : undefined;
        } else if (type === 'health') {
            finalCoverageDetails.deductible = deductible ? parseFloat(deductible) : undefined;
            finalCoverageDetails.coinsurance_percentage = coinsurancePercentage ? parseInt(coinsurancePercentage) : undefined;
            finalCoverageDetails.max_annual_out_of_pocket = maxAnnualOutOfPocket ? parseFloat(maxAnnualOutOfPocket) : undefined;
            finalCoverageDetails.includes_dental_basic = includesDentalBasic;
            finalCoverageDetails.includes_dental_premium = includesDentalPremium;
            finalCoverageDetails.includes_vision_basic = includesVisionBasic;
            finalCoverageDetails.includes_vision_full = includesVisionFull;
            finalCoverageDetails.max_dependents = maxDependents ? parseInt(maxDependents) : undefined;
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
                .update(updatedProduct)
                .eq('id', id);

            if (error) throw error;

            setMessage("Producto de seguro actualizado exitosamente.");
            setIsError(false);
            setTimeout(() => setMessage(null), 3000); // Ocultar mensaje después de 3 segundos
        } catch (error: any) {
            console.error("Error al actualizar producto de seguro:", error);
            setMessage(`Error al actualizar el producto: ${error.message}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl font-semibold">Cargando detalles del producto...</p>
            </div>
        );
    }

    // El return de error se mantiene por si la carga inicial falla
    if (isError && !name) { // Solo muestra la pantalla de error total si no se cargaron datos
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">¡Error!</strong>
                <span className="block sm:inline"> {message}</span>
                <button onClick={() => navigate(-1)} className="ml-4 text-sm underline">Volver</button>
            </div>
        );
    }

    return (
        // 2. Estilo de fondo cambiado para que coincida con el componente de creación
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full border" style={{ borderColor: '#7DDCDD' }}>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Editar Producto de Seguro
                </h2>

                {message && (
                    <div className={`p-4 mb-4 rounded-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`}>
                        {message}
                    </div>
                )}

                {/* El resto del formulario es muy similar al de creación */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* El JSX del formulario va aquí y es prácticamente idéntico al que ya tenías.
                        He mantenido toda la estructura de tu formulario original. */}
                    
                    {/* Detalles Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo de Seguro</label>
                            <select id="type" value={type} onChange={(e) => setType(e.target.value as 'life' | 'health')} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="life">Vida</option>
                                <option value="health">Salud</option>
                            </select>
                        </div>
                    </div>
                    {/* ... (el resto del formulario igual que en tu código original) ... */}

                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Duración y Precios</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">Duración (Meses)</label>
                            <input type="number" id="durationMonths" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} min="1" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="basePremium" className="block text-sm font-medium text-gray-700">Prima Base</label>
                            <input type="number" id="basePremium" value={basePremium} onChange={(e) => setBasePremium(e.target.value)} required step="0.01" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Moneda</label>
                            <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="fixedPaymentFrequency" className="block text-sm font-medium text-gray-700">Frecuencia de Pago Fija</label>
                            <select id="fixedPaymentFrequency" value={fixedPaymentFrequency} onChange={(e) => setFixedPaymentFrequency(e.target.value)} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="monthly">Mensual</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="annually">Anual</option>
                            </select>
                        </div>
                    </div>

                    {/* Detalles de Cobertura Específicos */}
                    <h3 className="text-xl font-semibold text-gray-800 pt-4 border-t border-gray-200">Detalles de Cobertura</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Campos comunes a ambos tipos */}
                        <div>
                            <label htmlFor="wellnessRebatePercentage" className="block text-sm font-medium text-gray-700">Reembolso Bienestar (%)</label>
                            <input type="number" id="wellnessRebatePercentage" value={wellnessRebatePercentage} onChange={(e) => setWellnessRebatePercentage(e.target.value)} min="0" max="100" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div>
                            <label htmlFor="maxAgeForInscription" className="block text-sm font-medium text-gray-700">Edad Máx. Inscripción</label>
                            <input type="number" id="maxAgeForInscription" value={maxAgeForInscription} onChange={(e) => setMaxAgeForInscription(e.target.value)} min="0" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>

                        {type === 'life' && (
                            <>
                                <div>
                                    <label htmlFor="coverageAmount" className="block text-sm font-medium text-gray-700">Monto Cobertura (Vida)</label>
                                    <input type="number" id="coverageAmount" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)} step="0.01" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                <div className="flex items-center col-span-full md:col-span-1">
                                    <input id="adDIncluded" type="checkbox" checked={adDIncluded} onChange={(e) => setAdDIncluded(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                                    <label htmlFor="adDIncluded" className="ml-2 block text-sm text-gray-900">Incluye AD&D</label>
                                </div>
                                {adDIncluded && (
                                    <div>
                                        <label htmlFor="adDCoverageAmount" className="block text-sm font-medium text-gray-700">Monto Cobertura AD&D</label>
                                        <input type="number" id="adDCoverageAmount" value={adDCoverageAmount} onChange={(e) => setAdDCoverageAmount(e.target.value)} step="0.01" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="maxBeneficiaries" className="block text-sm font-medium text-gray-700">Máx. Beneficiarios</label>
                                    <input type="number" id="maxBeneficiaries" value={maxBeneficiaries} onChange={(e) => setMaxBeneficiaries(e.target.value)} min="0" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                            </>
                        )}

                        {type === 'health' && (
                            <>
                                <div>
                                    <label htmlFor="deductible" className="block text-sm font-medium text-gray-700">Deducible (Salud)</label>
                                    <input type="number" id="deductible" value={deductible} onChange={(e) => setDeductible(e.target.value)} step="0.01" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                <div>
                                    <label htmlFor="coinsurancePercentage" className="block text-sm font-medium text-gray-700">Coaseguro (%)</label>
                                    <input type="number" id="coinsurancePercentage" value={coinsurancePercentage} onChange={(e) => setCoinsurancePercentage(e.target.value)} min="0" max="100" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                <div>
                                    <label htmlFor="maxAnnualOutOfPocket" className="block text-sm font-medium text-gray-700">Gasto Máx. Anual</label>
                                    <input type="number" id="maxAnnualOutOfPocket" value={maxAnnualOutOfPocket} onChange={(e) => setMaxAnnualOutOfPocket(e.target.value)} step="0.01" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                <div>
                                    <label htmlFor="maxDependents" className="block text-sm font-medium text-gray-700">Máx. Dependientes</label>
                                    <input type="number" id="maxDependents" value={maxDependents} onChange={(e) => setMaxDependents(e.target.value)} min="0" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                <div className="flex items-center"><input id="includesDentalBasic" type="checkbox" checked={includesDentalBasic} onChange={(e) => setIncludesDentalBasic(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded"/><label htmlFor="includesDentalBasic" className="ml-2 block text-sm">Dental Básico</label></div>
                                <div className="flex items-center"><input id="includesDentalPremium" type="checkbox" checked={includesDentalPremium} onChange={(e) => setIncludesDentalPremium(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded"/><label htmlFor="includesDentalPremium" className="ml-2 block text-sm">Dental Premium</label></div>
                                <div className="flex items-center"><input id="includesVisionBasic" type="checkbox" checked={includesVisionBasic} onChange={(e) => setIncludesVisionBasic(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded"/><label htmlFor="includesVisionBasic" className="ml-2 block text-sm">Visión Básico</label></div>
                                <div className="flex items-center"><input id="includesVisionFull" type="checkbox" checked={includesVisionFull} onChange={(e) => setIncludesVisionFull(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded"/><label htmlFor="includesVisionFull" className="ml-2 block text-sm">Visión Completo</label></div>
                            </>
                        )}
                    </div>
                    
                    {/* Botones y otros campos */}
                    <div className="pt-4 border-t border-gray-200 space-y-6">
                        <div>
                            <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">Términos y Condiciones</label>
                            <textarea id="termsAndConditions" value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={4} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700">Notas Internas (Admin)</label>
                            <textarea id="adminNotes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                        </div>
                        <div className="flex items-center">
                            <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Producto Activo</label>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminEditInsurance; // <--- ¡ASEGÚRATE DE QUE ESTA LÍNEA EXISTA!