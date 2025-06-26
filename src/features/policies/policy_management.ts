import { createClient } from '@supabase/supabase-js';

declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

let supabase: any = null;

const initializeSupabase = () => {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
};
initializeSupabase();

export interface Beneficiary {
    id: string;
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    percentage: number | '';
}

export interface Dependent {
    id: string;
    relation: string;
    custom_relation?: string;
    first_name1: string;
    first_name2?: string;
    last_name1: string;
    last_name2?: string;
    id_card: string;
    age: number | '';
}

export interface SimpleInsuranceProduct {
    name: string;
}

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
        max_beneficiaries?: number;
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        max_dependents?: number;
        [key: string]: any;
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
    insurance_products?: SimpleInsuranceProduct | null;
}

export interface CreatePolicyData {
    policy_number: string;
    client_id: string;
    agent_id: string | null;
    product_id: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
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
    signature_url?: string | null;
    signed_at?: string | null;
}

export interface UpdatePolicyData {
    policy_number?: string;
    client_id?: string;
    agent_id?: string | null;
    product_id?: string;
    start_date?: string;
    end_date?: string;
    status?: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
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
    signature_url?: string | null;
    signed_at?: string | null;
    updated_at?: string;
}

export interface ClientProfile {
    user_id: string;
    primer_nombre: string | null;
    segundo_nombre: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
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
    role: 'client' | 'agent' | 'admin' | string;
}

export async function getAllPolicies(): Promise<{
    data: Policy[] | null;
    error: any | null;
}> {
    const { data, error } = await supabase.from('policies').select('*, insurance_products(name)');

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

export async function getActiveInsuranceProducts(): Promise<{
    data: InsuranceProduct[] | null;
    error: any | null;
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

export async function getInsuranceProductById(
    product_id: string
): Promise<{ data: InsuranceProduct | null; error: any | null }> {
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

export async function createPolicy(
    policyData: CreatePolicyData
): Promise<{ data: Policy | null; error: any | null }> {
    const dataToSend: any = { ...policyData };
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
    return { data: data as Policy, error: null };
}

export async function getPolicyById(
    policy_id: string
): Promise<{ data: Policy | null; error: any | null }> {
    const { data, error } = await supabase
        .from('policies')
        .select('*, insurance_products(name)')
        .eq('id', policy_id)
        .single();

    if (error) {
        console.error(`Error al obtener póliza con ID ${policy_id}:`, error.message);
        return { data: null, error };
    }
    const policyData = data as Policy;
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

export async function getPoliciesByAgentId(
    agent_id: string
): Promise<{ data: Policy[] | null; error: any | null }> {
    const { data, error } = await supabase
        .from('policies')
        .select('*, insurance_products(name)')
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

export async function getPoliciesByClientId(
    client_id: string
): Promise<{ data: Policy[] | null; error: any | null }> {
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

export async function updatePolicy(
    policy_id: string,
    updates: UpdatePolicyData
): Promise<{ data: Policy | null; error: any | null }> {
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

export async function deletePolicy(
    policy_id: string
): Promise<{ success: boolean; error: any | null }> {
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

export async function getClientProfileById(userId: string): Promise<{ data: ClientProfile | null; error: any | null }> {
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

export async function getAgentProfileById(userId: string): Promise<{ data: AgentProfile | null; error: any | null }> {
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

export async function getAllClientProfiles(): Promise<{ data: ClientProfile[] | null; error: any | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email')
        .eq('role', 'client');

    if (error) {
        console.error('Error al obtener perfiles de clientes:', error.message);
        return { data: null, error };
    }
    return { data: data as ClientProfile[], error: null };
}

export async function getAllAgentProfiles(): Promise<{ data: AgentProfile[] | null; error: any | null }> {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, full_name, email')
        .eq('role', 'agent');

    if (error) {
        console.error('Error al obtener perfiles de agentes:', error.message);
        return { data: null, error };
    }
    return { data: data as AgentProfile[], error: null };
}