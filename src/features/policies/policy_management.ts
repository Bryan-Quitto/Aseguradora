import { createClient } from '@supabase/supabase-js';

// Declaraciones globales de Supabase (si es que no están disponibles de otra manera)
// Estas `declare const` son para entornos donde las variables se inyectan globalmente (como en Canvas/Playground).
// En un proyecto React/Vite, las variables de entorno se acceden vía `import.meta.env`.
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Instancia del cliente de Supabase (inicialización simplificada para este archivo de utilidades)
let supabase: any = null;

// Inicializa Supabase una vez
const initializeSupabase = () => {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
};
initializeSupabase(); // Llama a la inicialización al cargar el módulo

// Interfaces para Beneficiarios y Dependientes (reflejando la estructura usada en los formularios)
export interface Beneficiary {
    id: string; // Hacemos id opcional para el manejo en el formulario antes de la DB
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    percentage: number | ''; // Permite número o cadena vacía para la entrada de formulario
}

export interface Dependent {
    id: string; // Hacemos id opcional para el manejo en el formulario antes de la DB
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    age: number | ''; // Permite número o cadena vacía para la entrada de formulario
}

// Interfaz simple para el nombre del producto de seguro cuando se une a la póliza
export interface SimpleInsuranceProduct {
    name: string;
}

// Interfaces para los tipos de datos de las tablas
export interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    default_term_months: number | null;
    min_term_months: number | null;
    max_term_months: number | null;

    coverage_details: {
        coverage_amount?: number;
        ad_d_included?: boolean;
        ad_d_coverage_amount?: number;
        wellness_rebate_percentage?: number;
        max_age_for_inscription?: number;
        max_beneficiaries?: number; // Asegúrate de que esta propiedad exista en tu Supabase schema si la usas
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        max_dependents?: number; // Asegúrate de que esta propiedad exista en tu Supabase schema si la usas
        [key: string]: any; // Permite otras propiedades en JSONB
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

// Interfaz `Policy` unificada y precisa.
export interface Policy {
    id: string;
    policy_number: string;
    client_id: string;
    agent_id: string | null;
    product_id: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
    premium_amount: number;
    payment_frequency: 'monthly' | 'quarterly' | 'annually';
    contract_details: string | null;

    coverage_amount: number | null;
    ad_d_included: boolean | null;
    ad_d_coverage: number | null;
    beneficiaries: Beneficiary[] | null;
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
    dependents_details: Dependent[] | null;
    num_dependents: number | null;

    age_at_inscription: number | null;
    wellness_rebate: number | null;
    max_age_inscription: number | null;

    signature_url?: string | null;
    signed_at?: string | null;

    created_at: string;
    updated_at: string;

    insurance_products?: SimpleInsuranceProduct[] | null;
}

// Interfaz para la CREACIÓN de una nueva póliza.
export interface CreatePolicyData {
    policy_number: string;
    client_id: string;
    agent_id: string | null;
    product_id: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature'; // ¡También aquí!
    premium_amount: number;
    payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    contract_details: string | null;

    coverage_amount?: number | null;
    ad_d_included?: boolean | null;
    ad_d_coverage?: number | null;
    beneficiaries?: Beneficiary[] | null;
    num_beneficiaries?: number | null;

    deductible?: number | null;
    coinsurance?: number | null;
    max_annual?: number | null;
    has_dental?: boolean | null;
    has_dental_basic?: boolean | null;
    has_dental_premium?: boolean | null;
    has_vision?: boolean | null;
    has_vision_basic?: boolean | null;
    has_vision_full?: boolean | null;
    dependents_details?: Dependent[] | null;
    num_dependents?: number | null;

    age_at_inscription?: number | null;
    wellness_rebate?: number | null;
    max_age_inscription?: number | null;

    signature_url?: string | null; // Permite incluirla en la creación (opcional)
    signed_at?: string | null;     // Permite incluirla en la creación (opcional)
}

// Interfaz para la actualización de una póliza (todos los campos opcionales)
export interface UpdatePolicyData {
    policy_number?: string;
    client_id?: string;
    agent_id?: string | null;
    product_id?: string;
    start_date?: string;
    end_date?: string;
    status?: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature'; // ¡Y aquí!
    premium_amount?: number;
    payment_frequency?: 'monthly' | 'quarterly' | 'annually' | null;
    contract_details?: string | null;

    coverage_amount?: number | null;
    ad_d_included?: boolean | null;
    ad_d_coverage?: number | null;
    beneficiaries?: Beneficiary[] | null;
    num_beneficiaries?: number | null;

    deductible?: number | null;
    coinsurance?: number | null;
    max_annual?: number | null;
    has_dental?: boolean | null;
    has_dental_basic?: boolean | null;
    has_dental_premium?: boolean | null;
    has_vision?: boolean | null;
    has_vision_basic?: boolean | null;
    has_vision_full?: boolean | null;
    dependents_details?: Dependent[] | null;
    num_dependents?: number | null;

    age_at_inscription?: number | null;
    wellness_rebate?: number | null;
    max_age_inscription?: number | null;

    signature_url?: string | null; // Permite actualizar la URL de la firma
    signed_at?: string | null;     // Permite actualizar la fecha de la firma
    updated_at?: string;
}

// Interfaces para Perfiles de Usuario (clientes y agentes)
export interface ClientProfile {
    user_id: string;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    // Asumiendo que 'role' existe en la tabla 'profiles'
    role: 'client' | 'agent' | 'admin' | string;
}

export interface AgentProfile {
    user_id: string;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    // Asumiendo que 'role' existe en la tabla 'profiles'
    role: 'client' | 'agent' | 'admin' | string;
}

// --- Funciones para Insurance Products ---

export async function getAllPolicies(): Promise<{
    data: Policy[] | null;
    error: Error | null;
}> {
    const { data, error } = await supabase.from('policies').select('*');

    if (error) {
        console.error('Error al obtener todas las pólizas:', error.message);
        return { data: null, error };
    }
    const policiesData = data as Policy[];
    policiesData.forEach(policy => {
        if (typeof policy.beneficiaries === 'string') {
            try {
                policy.beneficiaries = JSON.parse(policy.beneficiaries);
            } catch (e) {
                console.error("Error parsing beneficiaries JSON in list:", e);
                policy.beneficiaries = null;
            }
        }
        if (typeof policy.dependents_details === 'string') {
            try {
                policy.dependents_details = JSON.parse(policy.dependents_details);
            } catch (e) {
                console.error("Error parsing dependents_details JSON in list:", e);
                policy.dependents_details = null;
            }
        }
    });
    return { data: policiesData, error: null };
}

/**
 * Obtiene todos los productos de seguro activos.
 * @returns Una promesa que resuelve con un array de InsuranceProduct o un error.
 */
export async function getActiveInsuranceProducts(): Promise<{
    data: InsuranceProduct[] | null;
    error: Error | null;
}> {
    const { data, error } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error al obtener productos de seguro:', error.message);
        return { data: null, error };
    }
    return { data: data as InsuranceProduct[], error: null };
}

/**
 * Obtiene un producto de seguro por su ID.
 * @param product_id El ID del producto de seguro.
 * @returns Una promesa que resuelve con el InsuranceProduct o un error.
 */
export async function getInsuranceProductById(
    product_id: string
): Promise<{ data: InsuranceProduct | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('id', product_id)
        .single();

    if (error) {
        console.error(
            `Error al obtener producto de seguro con ID ${product_id}:`,
            error.message
        );
        return { data: null, error };
    }
    return { data: data as InsuranceProduct, error: null };
}

// --- Funciones para Policies ---

/**
 * Crea una nueva póliza de seguro.
 * @param policyData Los datos de la nueva póliza.
 * @returns Una promesa que resuelve con la póliza creada o un error.
 */
export async function createPolicy(
    policyData: CreatePolicyData
): Promise<{ data: Policy | null; error: Error | null }> {
    const dataToSend: any = { ...policyData };
    // Asegurarse de que los arrays JSONB se envíen como strings JSON
    if (dataToSend.beneficiaries) {
        dataToSend.beneficiaries = JSON.stringify(dataToSend.beneficiaries);
    }
    if (dataToSend.dependents_details) {
        dataToSend.dependents_details = JSON.stringify(dataToSend.dependents_details);
    }

    const { data, error } = await supabase
        .from('policies')
        .insert([dataToSend])
        .select()
        .single();

    if (error) {
        console.error('Error al crear póliza:', error.message);
        return { data: null, error };
    }
    // Supabase devuelve el JSONB como objeto directamente al seleccionar, por lo que no es necesario parsear aquí.
    return { data: data as Policy, error: null };
}

/**
 * Obtiene una póliza por su ID.
 * @param policy_id El ID de la póliza.
 * @returns Una promesa que resuelve con la póliza o un error.
 */
export async function getPolicyById(
    policy_id: string
): Promise<{ data: Policy | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('id', policy_id)
        .single();

    if (error) {
        console.error(`Error al obtener póliza con ID ${policy_id}:`, error.message);
        return { data: null, error };
    }
    const policyData = data as Policy;
    // Si tus columnas de JSONB están retornando como strings (lo cual es común si no se especifican tipos en Supabase),
    // necesitarás parsearlas. Si Supabase las devuelve como objetos directamente, puedes quitar esto.
    if (typeof policyData.beneficiaries === 'string') {
        try {
            policyData.beneficiaries = JSON.parse(policyData.beneficiaries);
        } catch (e) {
            console.error("Error parsing beneficiaries JSON:", e);
            policyData.beneficiaries = null;
        }
    }
    if (typeof policyData.dependents_details === 'string') {
        try {
            policyData.dependents_details = JSON.parse(policyData.dependents_details);
            } catch (e) {
            console.error("Error parsing dependents_details JSON:", e);
            policyData.dependents_details = null;
        }
    }

    return { data: policyData, error: null };
}

/**
 * Obtiene todas las pólizas gestionadas por un agente.
 * @param agent_id El ID del agente.
 * @returns Una promesa que resuelve con un array de pólizas o un error.
 */
export async function getPoliciesByAgentId(
    agent_id: string
): Promise<{ data: Policy[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('agent_id', agent_id);

    if (error) {
        console.error(
            `Error al obtener pólizas para el agente ${agent_id}:`,
            error.message
        );
        return { data: null, error };
    }
    const policiesData = data as Policy[];
    policiesData.forEach(policy => {
        if (typeof policy.beneficiaries === 'string') {
            try {
                policy.beneficiaries = JSON.parse(policy.beneficiaries);
            } catch (e) {
                console.error("Error parsing beneficiaries JSON in list:", e);
                policy.beneficiaries = null;
            }
        }
        if (typeof policy.dependents_details === 'string') {
            try {
                policy.dependents_details = JSON.parse(policy.dependents_details);
            } catch (e) {
                console.error("Error parsing dependents_details JSON in list:", e);
                policy.dependents_details = null;
            }
        }
    });
    return { data: policiesData, error: null };
}

/**
 * Obtiene todas las pólizas de un cliente.
 * @param client_id El ID del cliente.
 * @returns Una promesa que resuelve con un array de pólizas o un error.
 */
export async function getPoliciesByClientId(
    client_id: string
): Promise<{ data: Policy[] | null; error: Error | null }> {
    // Aquí puedes especificar el select para incluir 'insurance_products' si lo necesitas en otras llamadas.
    // Para esta función específica que solo trae las pólizas, el '*' está bien,
    // pero si siempre necesitas el nombre del producto, cámbialo a:
    // .select('*, insurance_products(name)')
    const { data, error } = await supabase
        .from('policies')
        .select('*, insurance_products(name)')
        .eq('client_id', client_id);

    if (error) {
        console.error(
            `Error al obtener pólizas para el cliente ${client_id}:`,
            error.message
        );
        return { data: null, error };
    }
    const policiesData = data as Policy[];
    policiesData.forEach(policy => {
        // Estas conversiones de JSON.parse solo son necesarias si tus columnas JSONB
        // no están siendo interpretadas directamente como objetos por Supabase.
        // Si Supabase ya las devuelve como objetos al seleccionar, puedes eliminarlas.
        if (typeof policy.beneficiaries === 'string') {
            try {
                policy.beneficiaries = JSON.parse(policy.beneficiaries);
            } catch (e) {
                console.error("Error parsing beneficiaries JSON in list:", e);
                policy.beneficiaries = null;
            }
        }
        if (typeof policy.dependents_details === 'string') {
            try {
                policy.dependents_details = JSON.parse(policy.dependents_details);
            } catch (e) {
                console.error("Error parsing dependents_details JSON in list:", e);
                policy.dependents_details = null;
            }
        }
    });
    return { data: policiesData, error: null };
}

/**
 * Actualiza una póliza existente.
 * @param policy_id El ID de la póliza a actualizar.
 * @param updates Los campos a actualizar.
 * @returns Una promesa que resuelve con la póliza actualizada o un error.
 */
export async function updatePolicy(
    policy_id: string,
    updates: UpdatePolicyData
): Promise<{ data: Policy | null; error: Error | null }> {
    const dataToSend: any = { ...updates };
    if (dataToSend.beneficiaries !== undefined && dataToSend.beneficiaries !== null) {
        dataToSend.beneficiaries = JSON.stringify(dataToSend.beneficiaries);
    }
    if (dataToSend.dependents_details !== undefined && dataToSend.dependents_details !== null) {
        dataToSend.dependents_details = JSON.stringify(dataToSend.dependents_details);
    }

    const { data, error } = await supabase
        .from('policies')
        .update(dataToSend)
        .eq('id', policy_id)
        .select()
        .single();

    if (error) {
        console.error(
            `Error al actualizar póliza con ID ${policy_id}:`,
            error.message
        );
        return { data: null, error };
    }
    return { data: data as Policy, error: null };
}

/**
 * Elimina una póliza por su ID (considerar una eliminación suave si la lógica de negocio lo requiere).
 * @param policy_id El ID de la póliza a eliminar.
 * @returns Una promesa que resuelve si la eliminación fue exitosa o con un error.
 */
export async function deletePolicy(
    policy_id: string
): Promise<{ success: boolean; error: Error | null }> {
    const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', policy_id);

    if (error) {
        console.error(
            `Error al eliminar póliza con ID ${policy_id}:`,
            error.message
        );
        return { success: false, error };
    }
    return { success: true, error: null };
}

// --- Funciones para Perfiles de Usuario (clientes y agentes) ---

/**
 * Obtiene un perfil de cliente por su ID.
 * @param userId El ID del usuario.
 * @returns Una promesa que resuelve con el ClientProfile o un error.
 */
export async function getClientProfileById(userId: string): Promise<{ data: ClientProfile | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email, phone_number, role')
        .eq('user_id', userId)
        .single();
    if (error) {
        console.error(`Error al obtener perfil de cliente con ID ${userId}:`, error.message);
        return { data: null, error };
    }
    return { data: data as ClientProfile, error: null };
}

/**
 * Obtiene un perfil de agente por su ID.
 * @param userId El ID del usuario.
 * @returns Una promesa que resuelve con el AgentProfile o un error.
 */
export async function getAgentProfileById(userId: string): Promise<{ data: AgentProfile | null; error: Error | null }> {
    // ¡CORREGIDO! Cambiado de '=>' a '=' para la desestructuración
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email, phone_number, role')
        .eq('user_id', userId)
        .single();
    if (error) {
        console.error(`Error al obtener perfil de agente con ID ${userId}:`, error.message);
        return { data: null, error };
    }
    return { data: data as AgentProfile, error: null };
}

/**
 * Obtiene todos los perfiles de usuarios que tienen el rol de 'client'.
 * @returns Una promesa que resuelve con un array de ClientProfile o un error.
 */
export async function getAllClientProfiles(): Promise<{ data: ClientProfile[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email')
        .eq('role', 'client'); // Asume que tienes una columna 'role' en tu tabla de perfiles

    if (error) {
        console.error('Error al obtener perfiles de clientes:', error.message);
        return { data: null, error };
    }
    return { data: data as ClientProfile[], error: null };
}

/**
 * Obtiene todos los perfiles de usuarios que tienen el rol de 'agent'.
 * @returns Una promesa que resuelve con un array de AgentProfile o un error.
 */
export async function getAllAgentProfiles(): Promise<{ data: AgentProfile[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email')
        .eq('role', 'agent'); // Asume que tienes una columna 'role' en tu tabla de perfiles

    if (error) {
        console.error('Error al obtener perfiles de agentes:', error.message);
        return { data: null, error };
    }
    return { data: data as AgentProfile[], error: null };
}