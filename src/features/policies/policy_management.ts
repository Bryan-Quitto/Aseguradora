import { supabase } from '../../supabase/client';

// Interfaces para los tipos de datos de las tablas
export interface InsuranceProduct {
  id: string;
  name: string;
  type: 'life' | 'health' | 'other';
  description: string | null;
  coverage_details: Record<string, any> | null; // JSONB de detalles de cobertura
  base_premium: number;
  currency: string;
  terms_and_conditions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaces extendidas para “Policy” que incluyen los nuevos campos
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
  contract_details: string | null; // Texto libre o null

  // — Campos opcionales agregados para distintos tipos de seguro:

  // ▶︎ Seguros de Vida:
  coverage_amount?: number;           // Monto de cobertura (vida o AD&D)
  ad_d_included?: boolean;            // Si AD&D está incluido o no
  ad_d_coverage?: number;             // Monto de cobertura AD&D
  beneficiaries?: Array<{
    name: string;
    relationship: string;
    percentage: number;
  }>;                                 // Lista de beneficiarios (JSONB)
  age_at_inscription?: number;        // Edad al inscribirse (vida suplementaria, AD&D)
  numBeneficiaries?: number; // Añadido también para actualización

  // ▶︎ Vida Dependientes (común para algunos planes de vida y salud con dependientes):
  num_dependents?: number;            // Número de dependientes
  dependents_details?: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;                                 // Datos de cada dependiente (JSONB)
  dependent_type_counts?: { spouse: number; children: number }; // Añadido para controlar el conteo de dependientes
  
  // ▶︎ Seguros de Salud:
  // Estos campos ahora son **requeridos** en la interfaz CreatePolicyData
  // si siempre se inicializan y usan en el Plan Básico.
  deductible?: number;                // Deducible anual
  coinsurance?: number;               // Porcentaje de coaseguro
  max_annual?: number;                // Máximo desembolsable anual
  has_dental?: boolean;               // Si hay cobertura dental (básica o premium)
  has_vision?: boolean;               // Si hay cobertura de visión

  // Los siguientes se mantienen opcionales, asumiendo que no son específicos del Plan Básico que estás manejando.
  num_dependents_health?: number;     // Número de dependientes en plan salud
  dependents_details_health?: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;                                 // Datos de dependientes en plan salud (JSONB)
  has_dental_basic?: boolean;         // Plan salud: dental básica incluida
  wants_dental_premium?: boolean;     // Si solicitó dental premium
  has_dental_premium?: boolean;       // Si dental premium está incluido
  has_vision_basic?: boolean;         // Plan salud: visión básica incluida
  wants_vision?: boolean;             // Si solicitó visión
  has_vision_full?: boolean;          // Si visión completa está incluida
  wellness_rebate?: number;           // Reembolso mensual por programa de bienestar

  created_at: string;
  updated_at: string;
}

// Interfaz para la creación de una nueva póliza, con campos opcionales según tipo
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
  contract_details?: string | null;

  // ▶︎ Seguros de Vida:
  coverage_amount?: number;
  ad_d_included?: boolean;
  ad_d_coverage?: number;
  beneficiaries?: Array<{
    name: string;
    relationship: string;
    percentage: number;
  }>;
  age_at_inscription?: number;
  numBeneficiaries?: number; // Añadido también para actualización

  // ▶︎ Vida Dependientes:
  // Estos los hice obligatorios ya que tu formulario de Plan Básico siempre los inicializa.
  num_dependents: number; // <-- Quité el '?'
  dependents_details: Array<{ // <-- Quité el '?'
    name: string;
    birth_date: string;
    relationship: string;
  }>;

  // ▶︎ Seguros de Salud:
  // Estos los hice obligatorios ya que tu formulario de Plan Básico siempre los inicializa.
  deductible: number; // <-- Quité el '?'
  coinsurance: number; // <-- Quité el '?'
  max_annual: number; // <-- Quité el '?'
  has_dental: boolean; // <-- Quité el '?'
  has_vision: boolean; // <-- Quité el '?'

  // Los siguientes se mantienen opcionales, asumiendo que no son específicos del Plan Básico.
  num_dependents_health?: number;
  dependents_details_health?: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;
  has_dental_basic?: boolean;
  wants_dental_premium?: boolean;
  has_dental_premium?: boolean;
  has_vision_basic?: boolean;
  wants_vision?: boolean;
  has_vision_full?: boolean;
  wellness_rebate?: number;
}

// Interfaz para la actualización de una póliza (todos los campos opcionales)
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
  contract_details?: string | null;

  // ▶︎ Seguros de Vida:
  coverage_amount?: number;
  ad_d_included?: boolean;
  ad_d_coverage?: number;
  beneficiaries?: Array<{
    name: string;
    relationship: string;
    percentage: number;
  }>;
  age_at_inscription?: number;

  // ▶︎ Vida Dependientes:
  num_dependents?: number;
  dependents_details?: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;

  // ▶︎ Seguros de Salud:
  deductible?: number;
  coinsurance?: number;
  max_annual?: number;
  num_dependents_health?: number;
  dependents_details_health?: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;
  has_dental?: boolean;
  has_dental_basic?: boolean;
  wants_dental_premium?: boolean;
  has_dental_premium?: boolean;
  has_vision?: boolean;
  has_vision_basic?: boolean;
  wants_vision?: boolean;
  has_vision_full?: boolean;
  wellness_rebate?: number;
}

// --- Funciones para Insurance Products ---

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
  return { data: data as Policy, error: null };
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
  return { data: data as Policy[], error: null };
}

/**
 * Obtiene todas las pólizas de un cliente.
 * @param client_id El ID del cliente.
 * @returns Una promesa que resuelve con un array de pólizas o un error.
 */
export async function getPoliciesByClientId(
  client_id: string
): Promise<{ data: Policy[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('client_id', client_id);

  if (error) {
    console.error(
      `Error al obtener pólizas para el cliente ${client_id}:`,
      error.message
    );
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
export async function updatePolicy(
  policy_id: string,
  updates: UpdatePolicyData
): Promise<{ data: Policy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('policies')
    .update(updates)
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