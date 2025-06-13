import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Importa el componente de lista de beneficiarios y su interfaz
import BeneficiaryInputList from '../../policies/components/BeneficiaryInputList'; // Ruta actualizada
import { Beneficiary } from '../../policies/components/BeneficiaryInput'; // Ruta actualizada

// Importa el nuevo componente DocumentUploadSection
// Asume que está en una ruta relativa similar, ajusta si es necesario.
import DocumentUploadSection from '../components/DocumentUploadSection';

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
  duration_months: number | null; // Duración fija
  coverage_details: {
    coverage_amount?: number;
    ad_d_included?: boolean;
    ad_d_coverage_amount?: number;
    wellness_rebate_percentage?: number;
    max_age_for_inscription?: number;
    max_beneficiaries?: number;
    [key: string]: any;
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

interface ClientGenericLifePolicyFormProps {
  product: InsuranceProduct;
  clientId: string; // El ID del cliente logeado (se toma de useAuth en ClientPolicyForm)
  agentId: string; // El ID del agente asignado aleatoriamente
}

/**
 * Componente de formulario genérico para que un cliente cree una póliza de Seguro de Vida.
 * Muestra los detalles del producto como solo lectura y permite la entrada de beneficiarios.
 */
const ClientGenericLifePolicyForm: React.FC<ClientGenericLifePolicyFormProps> = ({ product, clientId, agentId }) => {
  // Estados para los campos de la tabla 'policies' relevantes para Seguros de Vida
  const [ageAtInscription, setAgeAtInscription] = useState<string>('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]); // Lista de beneficiarios estructurada

  // Nuevo estado para almacenar el ID de la póliza una vez creada
  const [newlyCreatedPolicyId, setNewlyCreatedPolicyId] = useState<string | null>(null);

  // Los campos de cobertura específicos son de solo lectura y se obtienen del producto
  const policyCoverageAmount = product.coverage_details.coverage_amount?.toString() || '';
  const policyAdDIncluded = product.coverage_details.ad_d_included || false;
  const policyAdDCoverageAmount = product.coverage_details.ad_d_coverage_amount?.toString() || '';
  const policyWellnessRebatePercentage = product.coverage_details.wellness_rebate_percentage?.toString() || '';
  const policyMaxBeneficiaries: number | null = product.coverage_details.max_beneficiaries ?? null;

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [policyCreated, setPolicyCreated] = useState<boolean>(false); // Para controlar si la póliza ya se creó

  /**
   * Hook useEffect para inicializar el cliente de Supabase.
   */
  useEffect(() => {
    try {
      if (!supabase) {
        // En un entorno de producción, usa tus variables de entorno reales.
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("Cliente de Supabase inicializado en ClientGenericLifePolicyForm.");
      }
    } catch (err: any) {
      console.error("Error al inicializar Supabase:", err);
      setMessage("Error al inicializar la aplicación. Verifique la configuración de Supabase.");
      setIsError(true);
    }
  }, []);

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
    return `POL-CLIENT-VIDA-${timestamp}-${random}`;
  };

  /**
   * Maneja el envío del formulario para crear la póliza de vida.
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

    // Validación de beneficiarios: la suma de porcentajes debe ser 100%
    const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => {
      const percentage = typeof b.percentage === 'number' ? b.percentage : 0;
      return sum + percentage;
    }, 0);

    if (beneficiaries.length === 0) {
      setMessage("Debe añadir al menos un beneficiario.");
      setIsError(true);
      setLoading(false);
      return;
    }

    if (totalBeneficiaryPercentage !== 100) {
      setMessage(`La suma de los porcentajes de los beneficiarios debe ser 100%. Actualmente es ${totalBeneficiaryPercentage}%.`);
      setIsError(true);
      setLoading(false);
      return;
    }

    // Validar el número de beneficiarios contra max_beneficiaries del producto
    if (policyMaxBeneficiaries !== null && policyMaxBeneficiaries !== 0 && beneficiaries.length > policyMaxBeneficiaries) {
      setMessage(`El número de beneficiarios excede el límite permitido por el producto (${policyMaxBeneficiaries}).`);
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

      // Campos específicos de vida (tomados del producto)
      coverage_amount: parseFloat(policyCoverageAmount),
      ad_d_included: policyAdDIncluded,
      ad_d_coverage: policyAdDCoverageAmount ? parseFloat(policyAdDCoverageAmount) : null,
      wellness_rebate: policyWellnessRebatePercentage ? parseFloat(policyWellnessRebatePercentage) : null,
      max_age_inscription: product.coverage_details.max_age_for_inscription,
      age_at_inscription: ageAtInscription ? parseInt(ageAtInscription) : null,
      beneficiaries: JSON.parse(JSON.stringify(beneficiaries)), // Convertir a JSON string, luego parsear para asegurar deep copy
      num_beneficiaries: beneficiaries.length, // Número de beneficiarios ingresados

      // Campos no aplicables para vida, se envían como null
      deductible: null,
      coinsurance: null,
      max_annual: null,
      num_dependents: null,
      dependents_details: null,
      has_dental: null,
      has_dental_basic: null,
      wants_dental_premium: null,
      has_dental_premium: null,
      has_vision: null,
      has_vision_basic: null,
      wants_vision: null,
      has_vision_full: null,
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
        setMessage("Póliza de vida creada exitosamente. Ahora puedes adjuntar documentos.");
        setIsError(false);
      } else {
        setMessage("Error: La póliza fue creada, pero no se pudo obtener su ID.");
        setIsError(true);
      }

    } catch (err: any) {
      console.error("Error al crear póliza de vida:", err);
      setMessage(`Error al crear póliza: ${err.message}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper para Capitalizar la primera letra de la frecuencia de pago
  const capitalize = (s: string | null | undefined): string => {
    if (!s) return 'N/A';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Detalles de la Póliza de Vida</h3>

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

          {/* Campos de Cobertura de Vida (solo lectura) */}
          <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Coberturas Ofrecidas por el Producto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 rounded-md">
            {product.coverage_details.coverage_amount !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Monto de Cobertura Principal</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">{policyCoverageAmount} {product.currency}</p>
              </div>
            )}
            {product.coverage_details.ad_d_included !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">AD&D Incluido</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">{policyAdDIncluded ? 'Sí' : 'No'}</p>
              </div>
            )}
            {policyAdDIncluded && product.coverage_details.ad_d_coverage_amount !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Monto Cobertura AD&D</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">{policyAdDCoverageAmount} {product.currency}</p>
              </div>
            )}
            {product.coverage_details.wellness_rebate_percentage !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Reembolso Bienestar</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">{policyWellnessRebatePercentage}%</p>
              </div>
            )}
            {policyMaxBeneficiaries !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Máx. de Beneficiarios Permitidos</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  {policyMaxBeneficiaries === 0 ? 'Ilimitado' : policyMaxBeneficiaries}
                </p>
              </div>
            )}
          </div>

          {/* Sección de Beneficiarios */}
          <h4 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-200">Tus Beneficiarios</h4>
          <BeneficiaryInputList
            beneficiaries={beneficiaries}
            onChange={setBeneficiaries}
            maxBeneficiaries={policyMaxBeneficiaries}
          />

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Contratando Póliza...' : 'Contratar Póliza de Vida'}
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
            // Aquí puedes definir tipos de documentos requeridos para la póliza de vida
            // Por ejemplo: requiredDocumentTypes={['Identificacion', 'CertificadoMedico']}
          />
        </div>
      )}
    </div>
  );
};

export default ClientGenericLifePolicyForm;