import { supabase } from '../../supabase/client';

// Interfaces para los tipos de datos de las tablas
export interface InsuranceProduct {
  id: string;
  name: string;
  type: 'life' | 'health' | 'other';
  description: string | null;
  coverage_details: Record<string, any> | null; // Usar Record<string, any> para JSONB de productos
  base_premium: number;
  currency: string;
  terms_and_conditions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  client_id: string;
  agent_id: string | null;
  product_id: string;
  start_date: string; // Formato 'YYYY-MM-DD'
  end_date: string;   // Formato 'YYYY-MM-DD'
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected';
  premium_amount: number;
  payment_frequency: 'monthly' | 'quarterly' | 'annually';
  contract_details: string | null; // Cambiado a string | null
  created_at: string;
  updated_at: string;
}

// Interfaz para la creación de una nueva póliza
export interface CreatePolicyData {
  policy_number: string;
  client_id: string;
  agent_id?: string | null;
  product_id: string;
  start_date: string;
  end_date: string;
  status?: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected';
  premium_amount: number;
  payment_frequency: 'monthly' | 'quarterly' | 'annually';
  contract_details?: string | null; // Cambiado a string | null
}

// Interfaz para la actualización de una póliza
export interface UpdatePolicyData {
  policy_number?: string;
  client_id?: string;
  agent_id?: string | null;
  product_id?: string;
  start_date?: string;
  end_date?: string;
  status?: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected';
  premium_amount?: number;
  payment_frequency?: 'monthly' | 'quarterly' | 'annually';
  contract_details?: string | null; // Cambiado a string | null
}

// --- Funciones para Insurance Products ---

/**
 * Obtiene todos los productos de seguro activos.
 * @returns Una promesa que resuelve con un array de InsuranceProduct o un error.
 */
export async function getActiveInsuranceProducts(): Promise<{ data: InsuranceProduct[] | null; error: Error | null }> {
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
export async function getInsuranceProductById(product_id: string): Promise<{ data: InsuranceProduct | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('insurance_products')
    .select('*')
    .eq('id', product_id)
    .single();

  if (error) {
    console.error(`Error al obtener producto de seguro con ID ${product_id}:`, error.message);
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
export async function createPolicy(policyData: CreatePolicyData): Promise<{ data: Policy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .insert(policyData)
    .select()
    .single();

  if (error) {
    console.error('Error al crear póliza:', error.message);
    return { data: null, error };
  }
  return { data: data as Policy, error: null };
}

/**
 * Obtiene una póliza por su ID.
 * @param policy_id El ID de la póliza.
 * @returns Una promesa que resuelve con la póliza o un error.
 */
export async function getPolicyById(policy_id: string): Promise<{ data: Policy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', policy_id)
    .single();

  if (error) {
    console.error(`Error al obtener póliza con ID ${policy_id}:`, error.message);
    return { data: null, error };
  }
  return { data: data as Policy, error: null };
}

/**
 * Obtiene todas las pólizas gestionadas por un agente.
 * @param agent_id El ID del agente.
 * @returns Una promesa que resuelve con un array de pólizas o un error.
 */
export async function getPoliciesByAgentId(agent_id: string): Promise<{ data: Policy[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('agent_id', agent_id);

  if (error) {
    console.error(`Error al obtener pólizas para el agente ${agent_id}:`, error.message);
    return { data: null, error };
  }
  return { data: data as Policy[], error: null };
}

/**
 * Obtiene todas las pólizas de un cliente.
 * @param client_id El ID del cliente.
 * @returns Una promesa que resuelve con un array de pólizas o un error.
 */
export async function getPoliciesByClientId(client_id: string): Promise<{ data: Policy[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('client_id', client_id);

  if (error) {
    console.error(`Error al obtener pólizas para el cliente ${client_id}:`, error.message);
    return { data: null, error };
  }
  return { data: data as Policy[], error: null };
}

/**
 * Actualiza una póliza existente.
 * @param policy_id El ID de la póliza a actualizar.
 * @param updates Los campos a actualizar.
 * @returns Una promesa que resuelve con la póliza actualizada o un error.
 */
export async function updatePolicy(policy_id: string, updates: UpdatePolicyData): Promise<{ data: Policy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .update(updates)
    .eq('id', policy_id)
    .select()
    .single();

  if (error) {
    console.error(`Error al actualizar póliza con ID ${policy_id}:`, error.message);
    return { data: null, error };
  }
  return { data: data as Policy, error: null };
}

/**
 * Elimina una póliza por su ID (considerar una eliminación suave si la lógica de negocio lo requiere).
 * @param policy_id El ID de la póliza a eliminar.
 * @returns Una promesa que resuelve si la eliminación fue exitosa o con un error.
 */
export async function deletePolicy(policy_id: string): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('policies')
    .delete()
    .eq('id', policy_id);

  if (error) {
    console.error(`Error al eliminar póliza con ID ${policy_id}:`, error.message);
    return { success: false, error };
  }
  return { success: true, error: null };
}