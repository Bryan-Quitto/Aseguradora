import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // Importación real de Supabase

// Importa el componente de lista de dependientes y su interfaz
// Asegúrate de que esta ruta es correcta en tu proyecto
import DependentInputList from '../../policies/components/DependentInputList';
import { Dependent } from '../../policies/components/DependentInput'; // Asegúrate de que esta ruta es correcta

// Importa el nuevo componente DocumentUploadSection
// Asegúrate de que esta ruta es correcta en tu proyecto
import DocumentUploadSection from '../components/DocumentUploadSection';

// Instancia del cliente de Supabase
// Se inicializará en useEffect con las variables de entorno reales.
let supabase: any = null;

// Interfaz para el producto de seguro que se pasa como prop
interface InsuranceProduct {
  id: string;
  name: string;
  type: 'life' | 'health' | 'other';
  description: string | null;
  duration_months: number | null; // Duración fija
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
  fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null; // Frecuencia de pago fija
  created_at: string;
  updated_at: string;
}

// === INTERFAZ POLICY ACTUALIZADA PARA COINCIDIR CON policy_management.ts ===
export interface Policy {
  id: string;
  policy_number: string;
  client_id: string;
  agent_id: string | null;
  product_id: string;
  start_date: string;
  end_date: string;
  // ¡CAMBIO CLAVE AQUÍ! Añadimos 'awaiting_signature' al tipo de estado
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'rejected' | 'awaiting_signature';
  premium_amount: number;
  payment_frequency: 'monthly' | 'quarterly' | 'annually';
  contract_details: string | null;

  coverage_amount: number | null;
  ad_d_included: boolean | null;
  ad_d_coverage: number | null;
  beneficiaries: any[] | null; // Cambiado a 'any[]' temporalmente para evitar problemas de tipo si no se usa Beneficiary
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

  insurance_products?: any[] | null; // Cambiado a 'any[]' temporalmente
}
// === FIN INTERFAZ POLICY ACTUALIZADA ===

interface ClientGenericHealthPolicyFormProps {
  product: InsuranceProduct;
  clientId: string; // El ID del cliente logeado
  agentId: string; // El ID del agente asignado aleatoriamente
}

/**
 * Componente de formulario genérico para que un cliente cree una póliza de Seguro de Salud.
 * Muestra los detalles del producto como solo lectura y permite la entrada de dependientes.
 */
const ClientGenericHealthPolicyForm: React.FC<ClientGenericHealthPolicyFormProps> = ({ product, clientId, agentId }) => {
  // Estados para los campos de la tabla 'policies' relevantes para Seguros de Salud
  const [ageAtInscription, setAgeAtInscription] = useState<string>('');
  const [dependents, setDependents] = useState<Dependent[]>([]); // Lista de dependientes estructurada

  // Nuevo estado para almacenar el ID de la póliza una vez creada
  const [newlyCreatedPolicyId, setNewlyCreatedPolicyId] = useState<string | null>(null);
  const [policyCreated, setPolicyCreated] = useState<boolean>(false); // Para controlar si la póliza ya se creó

  // Los campos de cobertura específicos son de solo lectura y se obtienen del producto
  const policyDeductible = product.coverage_details.deductible?.toString() || '';
  const policyCoinsurancePercentage = product.coverage_details.coinsurance_percentage?.toString() || '';
  const policyMaxAnnualOutOfPocket = product.coverage_details.max_annual_out_of_pocket?.toString() || '';
  const policyIncludesDentalBasic = product.coverage_details.includes_dental_basic || false;
  const policyIncludesDentalPremium = product.coverage_details.includes_dental_premium || false;
  const policyIncludesVisionBasic = product.coverage_details.includes_vision_basic || false;
  const policyIncludesVisionFull = product.coverage_details.includes_vision_full || false;
  const policyWellnessRebatePercentage = product.coverage_details.wellness_rebate_percentage?.toString() || '';
  const policyMaxDependents: number | null = product.coverage_details.max_dependents ?? null; // Número, 0 para no permitir

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  /**
   * Hook useEffect para inicializar el cliente de Supabase.
   * En tu aplicación real, asegúrate de que tus variables de entorno estén configuradas.
   */
  useEffect(() => {
    try {
      // Intenta inicializar Supabase solo una vez si aún no está inicializado.
      if (!supabase) {
        // Estas variables de entorno deberían estar configuradas en tu .env.local, .env, o similar.
        // Por ejemplo, en un proyecto Vite, se accedería a través de import.meta.env.VITE_...
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          // Es crucial que estas variables estén configuradas en tu entorno de desarrollo.
          // En producción, deberían ser accesibles directamente.
          console.error("Las variables de entorno de Supabase (VITE_REACT_APP_SUPABASE_URL y VITE_REACT_APP_SUPABASE_ANON_KEY) no están configuradas.");
          setMessage("Error: Las variables de entorno de Supabase no están configuradas correctamente.");
          setIsError(true);
          return;
        }
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("Cliente de Supabase inicializado en ClientGenericHealthPolicyForm.");
      }
    } catch (err: any) {
      console.error("Error al inicializar Supabase:", err);
      setMessage("Error al inicializar la aplicación. Verifique la configuración de Supabase.");
      setIsError(true);
    }
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez al montar.

  /**
   * Calcula la fecha de fin de la póliza basándose en la fecha de inicio (actual) y la duración del producto.
   */
  const calculateEndDate = (start: string, months: number | null): string => {
    if (!start || !months) return '';
    const startDateObj = new Date(start);
    startDateObj.setMonth(startDateObj.getMonth() + months);
    startDateObj.setDate(startDateObj.getDate() - 1); // Resta un día para que sea hasta el día anterior al siguiente mes
    return startDateObj.toISOString().split('T')[0];
  };

  /**
   * Genera un número de póliza simple (para fines de demostración).
   * En un entorno real, deberías tener un sistema más robusto para esto.
   */
  const generatePolicyNumber = (): string => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `POL-CLIENT-SALUD-${timestamp}-${random}`;
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
      setMessage("Error: Cliente de Supabase no inicializado. Intente de nuevo o revise las variables de entorno.");
      setIsError(true);
      setLoading(false);
      return;
    }

    // Validaciones
    if (!clientId) {
      setMessage("Error: No se pudo obtener el ID del cliente. Asegúrese de estar autenticado.");
      setIsError(true);
      setLoading(false);
      return;
    }
    if (!agentId) {
      setMessage("Error: No se pudo asignar un agente. Intente de nuevo.");
      setIsError(true);
      setLoading(false);
      return;
    }
    if (!ageAtInscription || parseInt(ageAtInscription) <= 0) {
      setMessage("Por favor, ingrese una edad de inscripción válida.");
      setIsError(true);
      setLoading(false);
      return;
    }
    if (product.coverage_details.max_age_for_inscription !== undefined && parseInt(ageAtInscription) > product.coverage_details.max_age_for_inscription) {
      setMessage(`Su edad (${ageAtInscription}) excede la edad máxima de inscripción permitida por este producto (${product.coverage_details.max_age_for_inscription}).`);
      setIsError(true);
      setLoading(false);
      return;
    }

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
      client_id: clientId, // ID del cliente logeado
      agent_id: agentId, // ID del agente asignado
      product_id: product.id,
      start_date: currentStartDate, // Fecha actual, no seleccionable
      end_date: calculatedEndDate,
      status: 'pending',
      premium_amount: product.base_premium, // Prima base fija del producto
      payment_frequency: product.fixed_payment_frequency, // Frecuencia de pago fija del producto
      contract_details: null, // Eliminado para el cliente

      // Campos específicos de salud (tomados del producto)
      deductible: policyDeductible ? parseFloat(policyDeductible) : null,
      coinsurance: policyCoinsurancePercentage ? parseInt(policyCoinsurancePercentage) : null,
      max_annual: policyMaxAnnualOutOfPocket ? parseFloat(policyMaxAnnualOutOfPocket) : null,
      wellness_rebate: policyWellnessRebatePercentage ? parseFloat(policyWellnessRebatePercentage) : null,
      max_age_inscription: product.coverage_details.max_age_for_inscription,
      age_at_inscription: ageAtInscription ? parseInt(ageAtInscription) : null,

      // Campos de dental y visión (tomados del producto)
      has_dental: policyIncludesDentalBasic || policyIncludesDentalPremium,
      has_dental_basic: policyIncludesDentalBasic,
      has_dental_premium: policyIncludesDentalPremium,
      has_vision: policyIncludesVisionBasic || policyIncludesVisionFull,
      has_vision_basic: policyIncludesVisionBasic,
      has_vision_full: policyIncludesVisionFull,

      // Campos de dependientes
      num_dependents: dependents.length, // Número de dependientes ingresados
      dependents_details: dependents, // ¡CAMBIO CLAVE AQUÍ! Pasar el array directamente

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
      const { data, error } = await supabase
        .from('policies')
        .insert([newPolicy])
        .select('id'); // Importante: Selecciona el ID de la póliza recién creada

      if (error) {
        throw error;
      }

      // Si la inserción es exitosa, guarda el ID de la nueva póliza
      if (data && data.length > 0) {
        setNewlyCreatedPolicyId(data[0].id);
        setPolicyCreated(true); // Marca que la póliza fue creada
        setMessage("Póliza de salud creada exitosamente. Ahora puedes adjuntar documentos.");
        setIsError(false);
      } else {
        setMessage("Error: La póliza fue creada, pero no se pudo obtener su ID.");
        setIsError(true);
      }

    } catch (err: any) {
      console.error("Error al crear póliza de salud:", err);
      setMessage(`Error al crear póliza: ${err.message}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper para Capitalizar la primera letra de cualquier cadena (más genérico)
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

      {!policyCreated ? ( // Muestra el formulario si la póliza aún no ha sido creada
        <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700">Fecha de Inicio (Estimada)</label>
              <p className="mt-1 text-sm text-gray-900">{new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Fin Estimada</label>
              <p className="mt-1 text-sm text-gray-900">{calculateEndDate(new Date().toISOString().split('T')[0], product.duration_months)}</p>
            </div>
          </div>

          {/* Edad del Asegurado al momento de la Inscripción */}
          <div>
            <label htmlFor="ageAtInscription" className="block text-sm font-medium text-gray-700">Tu Edad al Inscribirte (Máx del Producto: {product.coverage_details.max_age_for_inscription || 'N/A'})</label>
            <input
              type="number"
              id="ageAtInscription"
              value={ageAtInscription}
              onChange={(e) => setAgeAtInscription(e.target.value)}
              min="0"
              max={product.coverage_details.max_age_for_inscription || undefined}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tu edad"
            />
          </div>

          {/* Campos de Cobertura de Salud (solo lectura) */}
          <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Coberturas Ofrecidas por el Producto</h4>
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
            {policyMaxDependents !== undefined && (
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
          <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Tus Dependientes</h4>
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

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Contratando Póliza...' : 'Contratar Póliza de Salud'}
          </button>
        </form>
      ) : (
        // Si la póliza ya fue creada, muestra el mensaje de éxito y la sección de documentos
        <div className="mt-8">
          <p className="text-lg text-green-700 font-medium mb-4">
            ¡Felicidades! Tu póliza ha sido creada exitosamente. Por favor, adjunta los documentos requeridos a continuación.
          </p>
          <DocumentUploadSection
            policyId={newlyCreatedPolicyId}
            clientId={clientId}
            // Aquí puedes definir tipos de documentos requeridos para la póliza de salud
            // Por ejemplo: requiredDocumentTypes={['IdentificacionAsegurado', 'HistorialMedico']}
          />
        </div>
      )}
    </div>
  );
};

export default ClientGenericHealthPolicyForm;
