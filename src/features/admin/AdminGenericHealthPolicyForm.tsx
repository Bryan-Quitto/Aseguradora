import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Importa el componente de lista de dependientes y su interfaz
import DependentInputList from '../policies/components/DependentInputList';
import { Dependent } from '../policies/components/DependentInput'; // Necesitas esta interfaz aquí también

// Declara las variables globales proporcionadas por el entorno Canvas (si aplica)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Instancia del cliente de Supabase
let supabase: any = null;

// Interfaz para el producto de seguro que se pasa como prop
interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null; // Cambiado a duration_months
    coverage_details: {
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        wellness_rebate_percentage?: number;
        max_age_for_inscription?: number;
        max_dependents?: number; // Campo para el máximo de dependientes para salud
        [key: string]: any; // Permite otras propiedades
    };
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null; // Nueva frecuencia de pago fija
    created_at: string;
    updated_at: string;
}

// Interfaz para los clientes (profiles) - AGREGADO fecha_nacimiento
interface ClientProfile {
    user_id: string;
    full_name: string;
    email: string;
    fecha_nacimiento: string | null; // Añadido este campo
}

interface AdminGenericHealthPolicyFormProps {
    product: InsuranceProduct;
    // El 'agentId' aquí representa el ID del agente al que el administrador asignará la póliza.
    // Si el administrador gestiona directamente la póliza, puede ser el ID del propio administrador.
    agentId: string;
}

/**
 * Componente de formulario genérico para la creación de pólizas de Seguro de Salud,
 * destinado a ser utilizado por administradores.
 * Se adapta según los 'coverage_details' del producto de seguro recibido.
 */
const AdminGenericHealthPolicyForm: React.FC<AdminGenericHealthPolicyFormProps> = ({ product, agentId }) => {
    // Estados para los campos de la tabla 'policies' relevantes para Seguros de Salud
    const [clientId, setClientId] = useState<string>(''); // ID del cliente seleccionado
    const [contractDetails, setContractDetails] = useState<string>('');
    const [dateOfBirth, setDateOfBirth] = useState<string>(''); // Nuevo estado para la fecha de nacimiento ingresada
    const [registeredDateOfBirth, setRegisteredDateOfBirth] = useState<string | null>(null); // Fecha de nacimiento del perfil del cliente seleccionado
    const [ageAtInscription, setAgeAtInscription] = useState<number | null>(null); // Edad calculada a partir de la fecha de nacimiento
    const [dependents, setDependents] = useState<Dependent[]>([]); // Lista de dependientes estructurada

    // Estados para los campos de cobertura específicos que se guardarán en 'policies'
    const policyDeductible = product.coverage_details.deductible?.toString() || '';
    const policyCoinsurancePercentage = product.coverage_details.coinsurance_percentage?.toString() || '';
    const policyMaxAnnualOutOfPocket = product.coverage_details.max_annual_out_of_pocket?.toString() || '';
    const policyIncludesDentalBasic = product.coverage_details.includes_dental_basic || false;
    const policyIncludesDentalPremium = product.coverage_details.includes_dental_premium || false;
    const policyIncludesVisionBasic = product.coverage_details.includes_vision_basic || false;
    const policyIncludesVisionFull = product.coverage_details.includes_vision_full || false;
    const policyWellnessRebatePercentage = product.coverage_details.wellness_rebate_percentage?.toString() || '';

    // Convertir policyMaxDependents a number | null para evitar el error de 'undefined'
    const policyMaxDependents: number | null = product.coverage_details.max_dependents ?? null; // Número, 0 para no permitir

    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState<boolean>(false);
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [dateOfBirthMismatch, setDateOfBirthMismatch] = useState<boolean>(false); // Nuevo estado para el error de fecha de nacimiento

    /**
     * Hook useEffect para inicializar el cliente de Supabase y cargar los clientes.
     */
    useEffect(() => {
        const initializeAndFetchClients = async () => {
            try {
                // Inicialización de Supabase si no está globalmente disponible
                if (!supabase) {
                    const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'TU_URL_DE_SUPABASE_AQUI';
                    const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'TU_CLAVE_ANON_DE_SUPABASE_AQUI';
                    supabase = createClient(supabaseUrl, supabaseAnonKey);
                }

                // Cargar clientes con rol 'client'
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, email, fecha_nacimiento') // Asegúrate de que 'full_name' y 'email' existan en tu tabla 'profiles'
                    .eq('role', 'client');

                if (error) {
                    console.error('Error al cargar clientes:', error);
                    setMessage('Error al cargar la lista de clientes.');
                    setIsError(true);
                } else if (data) {
                    setClients(data);
                }
            } catch (err: any) {
                console.error("Error al inicializar o cargar clientes:", err);
                setMessage("Error fatal al cargar clientes: " + err.message);
                setIsError(true);
            } finally {
                setLoading(false);
            }
        };

        initializeAndFetchClients();
    }, []);

    /**
     * Hook useEffect para cargar la fecha de nacimiento del cliente seleccionado.
     */
    useEffect(() => {
        const fetchClientDateOfBirth = async () => {
            if (clientId && supabase) {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('fecha_nacimiento')
                    .eq('user_id', clientId)
                    .single();

                if (error) {
                    console.error("Error al obtener fecha de nacimiento del cliente:", error);
                    setMessage(`Error al cargar datos del perfil del cliente: ${error.message}`);
                    setIsError(true);
                    setRegisteredDateOfBirth(null);
                    setDateOfBirth(''); // Limpiar el campo de fecha de nacimiento
                    setAgeAtInscription(null); // Limpiar la edad
                    setDateOfBirthMismatch(true); // Asumir mismatch si hay error de carga
                } else if (data && data.fecha_nacimiento) {
                    setRegisteredDateOfBirth(data.fecha_nacimiento);
                    setDateOfBirth(data.fecha_nacimiento); // Precargar el input con la fecha registrada

                    const initialCalculatedAge = calculateAge(data.fecha_nacimiento);
                    setAgeAtInscription(initialCalculatedAge);
                    setDateOfBirthMismatch(false);
                    setMessage(null);
                    setIsError(false);
                } else {
                    setMessage("El cliente seleccionado no tiene una fecha de nacimiento registrada. Por favor, asegúrese de que su perfil esté completo.");
                    setIsError(true);
                    setRegisteredDateOfBirth(null);
                    setDateOfBirth('');
                    setAgeAtInscription(null);
                    setDateOfBirthMismatch(true); // Marcar como mismatch si no hay fecha registrada
                }
                setLoading(false);
            } else {
                // Si no hay cliente seleccionado, limpiar los estados de fecha de nacimiento y edad
                setRegisteredDateOfBirth(null);
                setDateOfBirth('');
                setAgeAtInscription(null);
                setDateOfBirthMismatch(false);
                setMessage(null);
                setIsError(false);
            }
        };

        fetchClientDateOfBirth();
    }, [clientId]); // Este efecto se ejecuta cuando cambia el clientId


    /**
     * Calcula la edad a partir de una fecha de nacimiento.
     */
    const calculateAge = (dobString: string): number | null => {
        if (!dobString) return null;
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    /**
     * Maneja el cambio en el campo de fecha de nacimiento.
     * Valida la fecha ingresada contra la registrada y calcula la edad.
     */
    const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const enteredDate = e.target.value;
        setDateOfBirth(enteredDate);

        if (registeredDateOfBirth) {
            if (enteredDate === registeredDateOfBirth) {
                setDateOfBirthMismatch(false);
                setMessage(null);
                setIsError(false);
                const calculatedAge = calculateAge(enteredDate);
                setAgeAtInscription(calculatedAge);
            } else {
                setDateOfBirthMismatch(true);
                setMessage("La fecha de nacimiento ingresada no coincide con la registrada en el perfil del cliente. Por favor, contacte a administración para cualquier cambio.");
                setIsError(true);
                setAgeAtInscription(null);
            }
        } else {
            // Si no hay fecha registrada, asumimos que puede ser un flujo donde el cliente la ingresa por primera vez
            // o que hay un problema al cargarla. En este caso, no hacemos la comparación estricta aquí.
            const calculatedAge = calculateAge(enteredDate);
            setAgeAtInscription(calculatedAge);
            setDateOfBirthMismatch(false);
            setMessage(null);
            setIsError(false);
        }
    };

    /**
     * Calcula la fecha de fin de la póliza basándose en la fecha de inicio (actual) y la duración del producto.
     */
    const calculateEndDate = (start: string, months: number | null): string => {
        if (!start || !months) return '';
        const startDateObj = new Date(start);
        startDateObj.setMonth(startDateObj.getMonth() + months);
        startDateObj.setDate(startDateObj.getDate() - 1);
        return startDateObj.toISOString().split('T')[0];
    };

    /**
     * Genera un número de póliza simple (para fines de demostración).
     */
    const generatePolicyNumber = (): string => {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000);
        return `POL-SALUD-${timestamp}-${random}`;
    };

    /**
     * Maneja el envío del formulario para crear la póliza de salud.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setIsError(false);

        if (!supabase) {
            setMessage("Error: Cliente de Supabase no inicializado.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (!clientId) {
            setMessage("Por favor, seleccione un cliente.");
            setIsError(true);
            setLoading(false);
            return;
        }
        // NUEVAS VALIDACIONES DE FECHA DE NACIMIENTO Y EDAD
        if (dateOfBirthMismatch) {
            setMessage("La fecha de nacimiento ingresada no coincide con la registrada. Por favor, corrija o contacte a administración.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (ageAtInscription === null || ageAtInscription <= 0) {
            setMessage("Por favor, ingrese una fecha de nacimiento válida para el asegurado.");
            setIsError(true);
            setLoading(false);
            return;
        }
        if (product.coverage_details.max_age_for_inscription !== undefined && ageAtInscription > product.coverage_details.max_age_for_inscription) {
            setMessage(`La edad del asegurado (${ageAtInscription}) excede la edad máxima de inscripción permitida por este producto (${product.coverage_details.max_age_for_inscription}).`);
            setIsError(true);
            setLoading(false);
            return;
        }
        // FIN NUEVAS VALIDACIONES

        // Validación de dependientes
        if (policyMaxDependents !== null && dependents.length > policyMaxDependents) {
            setMessage(`El número de dependientes excede el límite permitido por el producto (${policyMaxDependents}).`);
            setIsError(true);
            setLoading(false);
            return;
        }
        if (policyMaxDependents === 0 && dependents.length > 0) {
            setMessage("Este producto de seguro no permite dependientes.");
            setIsError(true);
            setLoading(false);
            return;
        }

        // La fecha de inicio es la fecha actual del sistema
        const currentStartDate = new Date().toISOString().split('T')[0];
        // La fecha de fin se calcula con la duración fija del producto
        const calculatedEndDate = calculateEndDate(currentStartDate, product.duration_months);
        if (!calculatedEndDate) {
            setMessage("Error: No se pudo calcular la fecha de fin de la póliza. Verifique la duración del producto.");
            setIsError(true);
            setLoading(false);
            return;
        }

        const newPolicy = {
            policy_number: generatePolicyNumber(),
            client_id: clientId,
            agent_id: agentId, // Se usa el agentId pasado por props
            product_id: product.id,
            start_date: currentStartDate, // Fecha actual, no seleccionable
            end_date: calculatedEndDate,
            status: 'pending',
            premium_amount: product.base_premium, // Prima base fija del producto
            payment_frequency: product.fixed_payment_frequency, // Frecuencia de pago fija del producto
            contract_details: contractDetails,

            // Campos específicos de salud (tomados del producto)
            deductible: policyDeductible ? parseFloat(policyDeductible) : null,
            coinsurance: policyCoinsurancePercentage ? parseInt(policyCoinsurancePercentage) : null,
            max_annual: policyMaxAnnualOutOfPocket ? parseFloat(policyMaxAnnualOutOfPocket) : null,
            wellness_rebate: policyWellnessRebatePercentage ? parseFloat(policyWellnessRebatePercentage) : null,
            max_age_inscription: product.coverage_details.max_age_for_inscription,
            age_at_inscription: ageAtInscription, // Usamos la edad calculada

            // Campos de dental y visión (tomados del producto)
            has_dental: policyIncludesDentalBasic || policyIncludesDentalPremium,
            has_dental_basic: policyIncludesDentalBasic,
            has_dental_premium: policyIncludesDentalPremium,
            has_vision: policyIncludesVisionBasic || policyIncludesVisionFull,
            has_vision_basic: policyIncludesVisionBasic,
            has_vision_full: policyIncludesVisionFull,

            // Campos de dependientes
            num_dependents: dependents.length, // Número de dependientes ingresados
            dependents_details: JSON.parse(JSON.stringify(dependents)), // Convertir a JSON string, luego parsear

            // Campos no aplicables para salud, se envían como null
            coverage_amount: null,
            beneficiaries: null,
            ad_d_included: null,
            ad_d_coverage: null,
            num_beneficiaries: null,
            wants_dental_premium: null, // Asumiendo que has_dental_premium es suficiente para tu esquema
            wants_vision: null, // Asumiendo que has_vision_full es suficiente para tu esquema
        };

        try {
            const { error } = await supabase
                .from('policies')
                .insert([newPolicy]);

            if (error) {
                throw error;
            }

            setMessage("Póliza de salud creada exitosamente.");
            setIsError(false);
            // Limpiar formulario después de éxito
            setClientId('');
            setContractDetails('');
            setDateOfBirth(''); // Limpiar la fecha de nacimiento
            setAgeAtInscription(null); // Limpiar la edad calculada
            setDependents([]); // Limpiar dependientes

        } catch (err: any) {
            console.error("Error al crear póliza de salud:", err);
            setMessage(`Error al crear póliza: ${err.message}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    // Helper para Capitalizar la primera letra de la frecuencia de pago
    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        const trimmedS = s.trim();
        if (trimmedS.length === 0) return 'N/A';
        return trimmedS.charAt(0).toUpperCase() + trimmedS.slice(1);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Detalles de la Póliza de Salud</h3>

            {message && (
                <div
                    className={`p-4 mb-4 rounded-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`}
                >
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selector de Cliente */}
                <div>
                    <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">Seleccionar Cliente</label>
                    <select
                        id="client_id"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">-- Seleccione un cliente --</option>
                        {clients.map(client => (
                            <option key={client.user_id} value={client.user_id}>
                                {client.full_name} ({client.email})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Información de la Póliza (solo lectura) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 rounded-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Producto de Seguro</label>
                        <p className="mt-1 text-sm text-gray-900 font-semibold">{product.name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Duración Fija</label>
                        <p className="mt-1 text-sm text-gray-900">{product.duration_months} meses</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Prima Base</label>
                        <p className="mt-1 text-sm text-gray-900">{product.base_premium.toFixed(2)} {product.currency}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Frecuencia de Pago</label>
                        <p className="mt-1 text-sm text-gray-900">{capitalize(product.fixed_payment_frequency)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Inicio (Automática)</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date().toISOString().split('T')[0]}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Fin Estimada</label>
                        <p className="mt-1 text-sm text-gray-900">{calculateEndDate(new Date().toISOString().split('T')[0], product.duration_months)}</p>
                    </div>
                </div>

                {/* Campo de Fecha de Nacimiento del Asegurado */}
                <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                        Fecha de Nacimiento del Asegurado
                    </label>
                    <input
                        type="date"
                        id="dateOfBirth"
                        value={dateOfBirth}
                        onChange={handleDateOfBirthChange}
                        required
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        // Deshabilitar si no se ha seleccionado un cliente para evitar errores
                        disabled={!clientId || loading}
                    />
                    {dateOfBirth && registeredDateOfBirth && dateOfBirth !== registeredDateOfBirth && (
                        <p className="mt-2 text-sm text-red-600">
                            La fecha ingresada no coincide con la fecha de nacimiento registrada en el perfil del cliente ({registeredDateOfBirth}). Por favor, contacte a administración para cualquier cambio.
                        </p>
                    )}
                    {ageAtInscription !== null && !dateOfBirthMismatch && (
                        <p className="mt-2 text-sm text-gray-600">
                            Edad calculada: {ageAtInscription} años.
                            {product.coverage_details.max_age_for_inscription !== undefined && (
                                ` (Máx. del Producto: ${product.coverage_details.max_age_for_inscription})`
                            )}
                        </p>
                    )}
                    {ageAtInscription !== null && product.coverage_details.max_age_for_inscription !== undefined && ageAtInscription > product.coverage_details.max_age_for_inscription && (
                        <p className="mt-2 text-sm text-red-600">
                            La edad del asegurado ({ageAtInscription}) excede la edad máxima de inscripción permitida por este producto ({product.coverage_details.max_age_for_inscription}). No se puede contratar esta póliza.
                        </p>
                    )}
                    {!clientId && (
                         <p className="mt-2 text-sm text-gray-600">Seleccione un cliente para ver su fecha de nacimiento y edad.</p>
                    )}
                </div>

                {/* Campos de Cobertura de Salud (solo lectura o con valores preestablecidos) */}
                <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Coberturas Definidas por el Producto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 rounded-md">
                    {product.coverage_details.deductible !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Deducible</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyDeductible} {product.currency}</p>
                        </div>
                    )}
                    {product.coverage_details.coinsurance_percentage !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Coaseguro</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyCoinsurancePercentage}%</p>
                        </div>
                    )}
                    {product.coverage_details.max_annual_out_of_pocket !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gasto Máximo Anual de Bolsillo</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyMaxAnnualOutOfPocket} {product.currency}</p>
                        </div>
                    )}
                    {product.coverage_details.wellness_rebate_percentage !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reembolso Bienestar</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyWellnessRebatePercentage}%</p>
                        </div>
                    )}
                    {product.coverage_details.max_dependents !== undefined && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Máx. de Dependientes Permitidos</label>
                                <p className="mt-1 text-sm text-gray-900 font-medium">
                                    {policyMaxDependents === 0 ? 'No permitidos' : policyMaxDependents}
                                </p>
                            </div>
                    )}

                    {/* Opciones de Dental y Visión */}
                    {product.coverage_details.includes_dental_basic !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Incluye Dental Básico</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyIncludesDentalBasic ? 'Sí' : 'No'}</p>
                        </div>
                    )}
                    {product.coverage_details.includes_dental_premium !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Incluye Dental Premium</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyIncludesDentalPremium ? 'Sí' : 'No'}</p>
                        </div>
                    )}
                    {product.coverage_details.includes_vision_basic !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Incluye Visión Básico</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyIncludesVisionBasic ? 'Sí' : 'No'}</p>
                        </div>
                    )}
                    {product.coverage_details.includes_vision_full !== undefined && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Incluye Visión Completo</label>
                            <p className="mt-1 text-sm text-gray-900 font-medium">{policyIncludesVisionFull ? 'Sí' : 'No'}</p>
                        </div>
                    )}
                </div>

                {/* Sección de Dependientes */}
                <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Dependientes de la Póliza</h4>
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

                {/* Detalles del Contrato (opcional) */}
                <div>
                    <label htmlFor="contractDetails" className="block text-sm font-medium text-gray-700">Detalles del Contrato</label>
                    <textarea
                        id="contractDetails"
                        value={contractDetails}
                        onChange={(e) => setContractDetails(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Cualquier detalle adicional o nota específica del contrato de esta póliza."
                    ></textarea>
                </div>

                {/* Botón de Envío */}
                <button
                    type="submit"
                    disabled={loading || !clientId || dateOfBirthMismatch || ageAtInscription === null || (product.coverage_details.max_age_for_inscription !== undefined && ageAtInscription > product.coverage_details.max_age_for_inscription)}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creando Póliza...' : 'Crear Póliza de Salud'}
                </button>
            </form>
        </div>
    );
};

export default AdminGenericHealthPolicyForm;