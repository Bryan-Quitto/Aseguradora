import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../policy_management';
import { ClientProfile, getAllClientProfiles } from '../../../clients/hooks/cliente_backend';

// Definición de tipos para los campos específicos del Plan Familiar
interface DependentDetail {
  name: string;
  birth_date: string;
  relationship: string;
}

interface PlanFamiliarSpecificFields {
  deductible: number;
  coinsurance: number;
  max_annual: number;
  has_dental_basic: boolean;
  wants_dental_premium: boolean;
  has_vision_basic: boolean;
  wants_vision: boolean;
  num_dependents: number;
  dependents_details: DependentDetail[]; // Aseguramos que siempre es un array de objetos con las propiedades
  has_dental?: boolean; // Se asume que siempre tendrá dental básica
  has_vision?: boolean; // Se asume que no tendrá visión a menos que se marque
}

// Combinar CreatePolicyData con los campos específicos del Plan Familiar
type PlanFamiliarPolicyData = CreatePolicyData & PlanFamiliarSpecificFields;

// Componente reutilizable para campos de formulario
interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  value: string | number | readonly string[] | undefined; // 'undefined' añadido para casos de arrays
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void; // Hacemos onChange opcional
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: string;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  rows?: number;
  infoText?: string;
  className?: string;
  error?: string | null; // Añadimos la prop 'error'
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange, // Ahora es opcional
  required = false,
  min,
  max,
  step,
  readOnly = false,
  options,
  placeholder,
  rows,
  infoText,
  className = '',
  error = null, // Inicializamos 'error' como null
}) => {
  const inputClasses = `mt-1 block w-full px-3 py-2 border ${
    error ? 'border-red-500' : 'border-gray-300'
  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
    readOnly ? 'bg-gray-100 cursor-not-allowed border-gray-200' : ''
  } ${className}`;

  // Si es un select, usar 'disabled' en lugar de 'readOnly'
  if (type === 'select' && options) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={inputClasses}
          disabled={readOnly} // Usar 'disabled' para selects
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {infoText && <p className="mt-1 text-xs text-gray-500">{infoText}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Si es un textarea
  if (type === 'textarea') {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <textarea
          id={id}
          name={name}
          value={value as string} // Castear a string ya que textarea solo acepta string
          onChange={onChange}
          required={required}
          rows={rows}
          placeholder={placeholder}
          className={`${inputClasses} font-mono`}
          readOnly={readOnly}
        />
        {infoText && <p className="mt-1 text-xs text-gray-500">{infoText}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Para otros tipos de input
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        placeholder={placeholder}
        className={inputClasses}
      />
      {infoText && <p className="mt-1 text-xs text-gray-500">{infoText}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

// Componente principal del formulario
export default function PlanFamiliarForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estado base + campos propios de Plan Familiar
  const [formData, setFormData] = useState<PlanFamiliarPolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0,
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    deductible: 1500,
    coinsurance: 20,
    max_annual: 80000,
    has_dental_basic: true,
    wants_dental_premium: false,
    has_vision_basic: false,
    wants_vision: false,
    num_dependents: 0,
    dependents_details: [],
    has_dental: true, // Se asume que siempre tendrá dental básica
    has_vision: false, // Se asume que no tendrá visión a menos que se marque
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planFamiliarProduct, setPlanFamiliarProduct] = useState<InsuranceProduct | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({}); // Nuevo estado para errores de validación por campo

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Cargar productos
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }

      // Cargar clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        setError(prev => (prev ? prev + ' Y clientes.' : 'Error al cargar los clientes.'));
        setLoading(false);
        return;
      }

      if (productsData && clientsData) {
        setClients(clientsData);
        const foundPlanFamiliarProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Familiar');
        if (foundPlanFamiliarProduct) {
          setPlanFamiliarProduct(foundPlanFamiliarProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanFamiliarProduct.id,
          }));
        } else {
          setError('Error: El producto "Plan Familiar" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
      }
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  // Función para calcular la prima estimada
  const calculateEstimatedPremium = useCallback(() => {
    let basePremium = 500; // Prima base sugerida para Plan Familiar

    // Ajuste por dependientes
    if (formData.num_dependents > 0) {
      basePremium += formData.num_dependents * 100; // +$100 por cada dependiente
    }

    // Ajuste por coberturas adicionales
    if (formData.wants_dental_premium) {
      basePremium += 40; // +$40 por dental premium
    }
    if (formData.wants_vision) {
      basePremium += 20; // +$20 por visión
    }

    return basePremium;
  }, [formData.num_dependents, formData.wants_dental_premium, formData.wants_vision]);

  const calculatedPremium = calculateEstimatedPremium();

  // Helpers
  const generatePolicyNumber = useCallback(() => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;

      setFormData(prev => {
        // Remove error for the field being changed
        setValidationErrors(currentErrors => ({ ...currentErrors, [name]: null }));

        if (name === 'premium_amount') {
          return { ...prev, [name]: parseFloat(value) };
        }
        if (name === 'num_dependents') {
          const num = parseInt(value) || 0;
          // Crear un nuevo array de dependientes.
          // Si el número de dependientes disminuye, se truncan.
          // Si aumenta, se añaden nuevos objetos vacíos.
          const newDependentsArray: DependentDetail[] = Array.from({ length: num }, (_, i) => ({
            name: prev.dependents_details[i]?.name || '',
            birth_date: prev.dependents_details[i]?.birth_date || '',
            relationship: prev.dependents_details[i]?.relationship || '',
          }));
          return { ...prev, num_dependents: num, dependents_details: newDependentsArray };
        }
        if (type === 'checkbox') {
          const target = e.target as HTMLInputElement;
          return { ...prev, [name]: target.checked };
        }
        return { ...prev, [name]: value };
      });
    },
    []
  );

  const handleDependentChange = useCallback(
    (idx: number, field: keyof DependentDetail, value: string) => {
      setFormData(prev => {
        const newDetails = [...prev.dependents_details]; // Siempre será un array

        // Siempre crea un nuevo objeto si el actual es undefined o null
        const currentDependent = newDetails[idx] || { name: '', birth_date: '', relationship: '' };

        newDetails[idx] = {
          ...currentDependent, // Ahora currentDependent siempre es un objeto
          [field]: value,
        };

        return { ...prev, dependents_details: newDetails };
      });
      // Clear specific dependent error if applicable (e.g., if a field is filled)
      setValidationErrors(currentErrors => {
        const newErrors = { ...currentErrors };
        const dependentErrorKey = `dependent_${idx}_${field}`;
        if (newErrors[dependentErrorKey]) {
          newErrors[dependentErrorKey] = null;
        }
        return newErrors;
      });
    },
    []
  );

  // Función de validación del formulario
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Record<string, string | null> = {};

    if (!user?.id) {
      newErrors.agent_id = 'No se pudo obtener el ID del agente para asignar la póliza.';
      isValid = false;
    }

    if (!formData.client_id) {
      newErrors.client_id = 'Por favor, selecciona un cliente.';
      isValid = false;
    }

    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es obligatoria.';
      isValid = false;
    }

    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es obligatoria.';
      isValid = false;
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      isValid = false;
    }

    // Validation for calculated premium (adjust based on actual input 'premium_amount' or just show info)
    // For now, I'll keep the validation on formData.premium_amount as per original, but it could be based on calculatedPremium.
    // If you want to *enforce* calculatedPremium, you'd set formData.premium_amount = calculatedPremium inside a useEffect or elsewhere.
    // Given the form field for premium_amount allows manual input, we validate that.
    if (formData.premium_amount < 300 || formData.premium_amount > 1200) {
      newErrors.premium_amount = 'El monto de la prima debe estar entre $300 y $1,200 mensuales.';
      isValid = false;
    }

    // Validaciones Plan Familiar
    if (formData.deductible < 1500 || formData.deductible > 3000) {
      newErrors.deductible = 'El deducible debe estar entre $1,500 y $3,000.';
      isValid = false;
    }
    if (formData.coinsurance !== 20) {
      newErrors.coinsurance = 'El coaseguro para Plan Familiar debe ser 20 %.';
      isValid = false;
    }
    if (formData.num_dependents < 0 || formData.num_dependents > 4) {
      newErrors.num_dependents = 'El número de dependientes debe ser entre 0 y 4.';
      isValid = false;
    }

    for (let i = 0; i < formData.num_dependents; i++) {
      const d = formData.dependents_details[i];
      if (!d || !d.name.trim()) {
        newErrors[`dependent_${i}_name`] = `El nombre del dependiente ${i + 1} es obligatorio.`;
        isValid = false;
      }
      if (!d || !d.birth_date) {
        newErrors[`dependent_${i}_birth_date`] = `La fecha de nacimiento del dependiente ${i + 1} es obligatoria.`;
        isValid = false;
      }
      if (!d || !d.relationship.trim()) {
        newErrors[`dependent_${i}_relationship`] = `El parentesco del dependiente ${i + 1} es obligatorio.`;
        isValid = false;
      }
    }

    setValidationErrors(newErrors);
    return isValid;
  }, [formData, user?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({}); // Clear previous validation errors

    const isValid = validateForm();
    if (!isValid) {
      setError('Por favor, corrige los errores en el formulario.');
      return;
    }

    const policyNumber = generatePolicyNumber();
    const policyToCreate: PlanFamiliarPolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user!.id, // user.id ya validado en validateForm
      premium_amount: Number(formData.premium_amount),
      // Asegurar que has_dental y has_vision se envíen correctamente
      has_dental: formData.has_dental_basic || formData.wants_dental_premium,
      has_vision: formData.wants_vision,
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Restablecer el formulario a su estado inicial
      setFormData({
        policy_number: '',
        client_id: '',
        product_id: planFamiliarProduct?.id || '', // Restablecer con el ID del producto si ya se cargó
        start_date: '',
        end_date: '',
        premium_amount: 0,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        deductible: 1500,
        coinsurance: 20,
        max_annual: 80000,
        has_dental_basic: true,
        wants_dental_premium: false,
        has_vision_basic: false,
        wants_vision: false,
        num_dependents: 0,
        dependents_details: [], // Asegurar que sea un array vacío
        has_dental: true,
        has_vision: false,
      });
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Plan Familiar…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Crear Póliza – Plan Médico Familiar
      </h2>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {successMessage && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">¡Éxito!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ———————————— Campos Comunes ———————————— */}

        {/* Cliente */}
        <FormField
          id="client_id"
          name="client_id"
          label="Cliente"
          type="select"
          value={formData.client_id}
          onChange={handleChange}
          required
          options={[
            { value: '', label: 'Selecciona un cliente' },
            ...clients.map(client => ({
              value: client.user_id,
              label: `${client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()} (${client.email})`,
            })),
          ]}
          error={validationErrors.client_id}
        />

        {/* Producto de Seguro (solo lectura) */}
        <FormField
          id="product_name_display"
          name="product_name_display"
          label="Producto de Seguro"
          value={planFamiliarProduct ? planFamiliarProduct.name : 'Cargando producto...'}
          readOnly // Esto hará que el onChange sea opcional
          infoText='Este formulario es específicamente para el "Plan Familiar".'
        />

        {/* Fechas Inicio / Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="start_date"
            name="start_date"
            label="Fecha de Inicio"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            required
            error={validationErrors.start_date}
          />
          <FormField
            id="end_date"
            name="end_date"
            label="Fecha de Fin"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            required
            error={validationErrors.end_date}
          />
        </div>

        {/* Prima y Frecuencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="premium_amount"
            name="premium_amount"
            label="Monto de la Prima ($)"
            type="number"
            value={formData.premium_amount}
            onChange={handleChange}
            required
            min={300}
            max={1200}
            step="0.01"
            infoText="Rango permitido: $300 – $1,200 mensuales."
            error={validationErrors.premium_amount}
          />
          <FormField
            id="payment_frequency"
            name="payment_frequency"
            label="Frecuencia de Pago"
            type="select"
            value={formData.payment_frequency}
            onChange={handleChange}
            required
            options={[
              { value: 'monthly', label: 'Mensual' },
              { value: 'quarterly', label: 'Trimestral' },
              { value: 'annually', label: 'Anual' },
            ]}
            error={validationErrors.payment_frequency}
          />
        </div>

        {/* Componente de Prima Estimada */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">
            ${calculatedPremium.toFixed(2)} / {formData.payment_frequency}
          </p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>

        {/* Estado de la Póliza */}
        <FormField
          id="status"
          name="status"
          label="Estado de la Póliza"
          type="select"
          value={formData.status}
          onChange={handleChange}
          required
          options={[
            { value: 'pending', label: 'Pendiente' },
            { value: 'active', label: 'Activa' },
            { value: 'cancelled', label: 'Cancelada' },
            { value: 'expired', label: 'Expirada' },
            { value: 'rejected', label: 'Rechazada' },
          ]}
          error={validationErrors.status}
        />

        {/* Detalles del Contrato */}
        <FormField
          id="contract_details"
          name="contract_details"
          label="Detalles del Contrato (Opcional)"
          type="textarea"
          value={formData.contract_details || ''}
          onChange={handleChange}
          rows={4}
          placeholder='Ej.: "Plan Familiar con atención domiciliaria incluida."'
          infoText="Introduce detalles adicionales si los hay."
          error={validationErrors.contract_details}
        />

        {/* ———————————— Campos Específicos: Plan Médico Familiar ———————————— */}

        {/* Deducible Anual Familiar */}
        <FormField
          id="deductible"
          name="deductible"
          label="Deducible Anual Familiar ($)"
          type="number"
          value={formData.deductible}
          onChange={handleChange}
          required
          min={1500}
          max={3000}
          step="1"
          infoText="Rango permitido: $1,500 – $3,000."
          error={validationErrors.deductible}
        />

        {/* Coaseguro (20%) */}
        <FormField
          id="coinsurance"
          name="coinsurance"
          label="Coaseguro (%)"
          type="number"
          value={formData.coinsurance}
          readOnly // Esto hará que el onChange sea opcional
          infoText="Para el Plan Familiar, el coaseguro está fijado en 20 %."
          error={validationErrors.coinsurance}
        />

        {/* Máximo Desembolsable Anual Familiar */}
        <FormField
          id="max_annual"
          name="max_annual"
          label="Máximo Desembolsable Anual Familiar ($)"
          type="number"
          value={formData.max_annual}
          readOnly // Esto hará que el onChange sea opcional
          infoText="Límite: $80,000/año (familiar)."
          error={validationErrors.max_annual}
        />

        {/* Cobertura Dental Básica (incluida) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cobertura Dental Básica
          </label>
          <p className="text-sm text-gray-700">
            Incluye limpieza dental y extracciones menores sin costo adicional.
          </p>
        </div>

        {/* Opción de Dental Premium */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="wants_dental_premium"
            name="wants_dental_premium"
            checked={formData.wants_dental_premium}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="wants_dental_premium" className="ml-2 block text-sm text-gray-700">
            Quiero Cobertura Dental Premium (+$40/mes)
          </label>
        </div>
        {formData.wants_dental_premium && (
          <p className="mt-1 text-xs text-gray-500">
            La Cobertura Dental Premium cubre ortodoncia e implantes hasta $8,000/año.
          </p>
        )}

        {/* Opción de Visión */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="wants_vision"
            name="wants_vision"
            checked={formData.wants_vision}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="wants_vision" className="ml-2 block text-sm text-gray-700">
            Quiero Cobertura de Visión (+$20/mes)
          </label>
        </div>
        {formData.wants_vision && (
          <p className="mt-1 text-xs text-gray-500">
            La Cobertura de Visión incluye revisión anual y lentes hasta $400.
          </p>
        )}

        {/* Atención Domiciliaria (texto informativo) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atención Domiciliaria
          </label>
          <p className="text-sm text-gray-700">
            Hasta 10 días/año en caso de hospitalización prolongada.
          </p>
        </div>

        {/* Dependientes (0 – 4) */}
        <FormField
          id="num_dependents"
          name="num_dependents"
          label="Número de Dependientes (0–4)"
          type="number"
          value={formData.num_dependents}
          onChange={handleChange}
          required
          min={0}
          max={4}
          step="1"
          infoText="Cada dependiente extra +$100/mes."
          error={validationErrors.num_dependents}
        />

        {/* Campos dinámicos para cada dependiente */}
        {formData.num_dependents > 0 && ( // Ya no necesitamos verificar dependents_details.length > 0 si siempre se inicializa
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalles de Dependientes
            </h3>
            {Array.from({ length: formData.num_dependents }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <p className="font-medium text-gray-800">
                  Dependiente #{idx + 1}
                </p>
                <FormField
                  id={`dep_name_${idx}`}
                  name={`dep_name_${idx}`}
                  label="Nombre Completo"
                  value={formData.dependents_details[idx]?.name || ''}
                  onChange={e => handleDependentChange(idx, 'name', e.target.value)}
                  required
                  error={validationErrors[`dependent_${idx}_name`]}
                />
                <FormField
                  id={`dep_birth_${idx}`}
                  name={`dep_birth_${idx}`}
                  label="Fecha de Nacimiento"
                  type="date"
                  value={formData.dependents_details[idx]?.birth_date || ''}
                  onChange={e => handleDependentChange(idx, 'birth_date', e.target.value)}
                  required
                  error={validationErrors[`dependent_${idx}_birth_date`]}
                />
                <FormField
                  id={`dep_rel_${idx}`}
                  name={`dep_rel_${idx}`}
                  label="Parentesco"
                  type="select"
                  value={formData.dependents_details[idx]?.relationship || ''}
                  onChange={e => handleDependentChange(idx, 'relationship', e.target.value)}
                  required
                  options={[
                    { value: '', label: 'Selecciona parentesco' },
                    { value: 'spouse', label: 'Cónyuge' },
                    { value: 'child', label: 'Hijo(a)' },
                    { value: 'parent', label: 'Padre/Madre' },
                    { value: 'other', label: 'Otro' },
                  ]}
                  error={validationErrors[`dependent_${idx}_relationship`]}
                />
              </div>
            ))}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/agent/dashboard/policies')}
            className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
          >
            Crear Póliza
          </button>
        </div>
      </form>
    </div>
  );
}