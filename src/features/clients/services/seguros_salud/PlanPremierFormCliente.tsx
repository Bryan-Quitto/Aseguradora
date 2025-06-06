import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData, // Asegúrate de que esta interfaz es lo suficientemente genérica si la usas en otros lugares
  CreatePlanPremierPolicyData, // Esta es la interfaz específica para Plan Premier
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend';

// --- Interfaz para Dependiente ---
interface Dependent {
  name: string;
  birth_date: string;
  relationship: string;
}

// --- Definición de la Prima Mínima y Máxima para el Plan Premier ---
// Es buena práctica tener estos valores como constantes para fácil mantenimiento.
const BASE_PREMIUM_MIN = 400;
const DEPENDENT_COST_PER_MONTH = 100;
const MAX_PREMIUM_LIMIT = 1500;
const MIN_DEDUCTIBLE = 500;
const MAX_DEDUCTIBLE = 1000;
const FIXED_COINSURANCE = 10;
const MAX_DEPENDENTS = 4;

/**
 * Formulario específico para que el CLIENTE solicite el Plan Médico Premier.
 */
export default function PlanPremierForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Este 'user' es el cliente autenticado

  // -----------------------------------------------------
  // Estado base + campos propios de Plan Premier
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePlanPremierPolicyData>({
    policy_number: '',
    client_id: '', // Se llenará con el ID del usuario autenticado (cliente)
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: BASE_PREMIUM_MIN, // Prima mínima para Plan Premier
    payment_frequency: 'monthly',
    status: 'pending', // <-- El estado siempre inicia como pendiente
    contract_details: '',
    deductible: MIN_DEDUCTIBLE, // rango [500‒1000]
    coinsurance: FIXED_COINSURANCE, // 10 % fijo
    max_annual: 100000, // máximo desembolsable anual (fijo)
    has_dental_premium: true, // Premium incluida (fijo)
    has_vision_full: true, // Visión completa incluida (fijo)
    wellness_rebate: 50, // $50/mes reembolso gym (info solo explicativa)
    num_dependents: 0,
    dependents_details: [] as Dependent[],
    has_dental: true, // Se asume que siempre tendrá dental premium (consistente con has_dental_premium)
    has_vision: true, // Se asume que siempre tendrá visión completa (consistente con has_vision_full)
    agent_id: '', // Agregado para almacenar el ID del agente seleccionado por el cliente
  });

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planPremierProduct, setPlanPremierProduct] = useState<InsuranceProduct | null>(null);

  // Nuevo estado para errores de validación específicos del frontend
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | null }>({});

  // -----------------------------------------------------
  // useEffect para Carga Inicial de Datos
  // -----------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null); // Limpiar errores previos

      try {
        const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
        if (productsError) throw productsError;
        if (productsData) {
          setProducts(productsData);
          const foundPlanPremierProduct = productsData.find(
            p => p.name === 'Seguro de Salud Plan Premier'
          );
          if (foundPlanPremierProduct) {
            setPlanPremierProduct(foundPlanPremierProduct);
            setFormData(prev => ({
              ...prev,
              product_id: foundPlanPremierProduct.id,
              client_id: user?.id || '', // Asegúrate de establecer client_id aquí si el user ya está disponible
            }));
          } else {
            setError(
              'Error: El producto "Seguro de Salud Plan Premier" no fue encontrado. Asegúrate de que existe en la base de datos.'
            );
          }
        }

        const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
        if (agentsError) throw agentsError;
        if (agentsData) {
          setAgents(agentsData);
        }
      } catch (err: any) {
        console.error('Error al cargar datos iniciales:', err);
        setError(`Error al cargar datos: ${err.message || err.toString()}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.id]); // Dependencia del user.id para asegurar que se setea client_id

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = (): string => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  // Lógica de cálculo de prima estimada
  const calculateEstimatedPremium = (numDependents: number): number => {
    let calculated = BASE_PREMIUM_MIN + numDependents * DEPENDENT_COST_PER_MONTH;
    // Asegurarse de que no exceda el máximo permitido
    return Math.min(calculated, MAX_PREMIUM_LIMIT);
  };

  // -----------------------------------------------------
  // useEffect para recalcular la prima cuando cambian dependientes
  // -----------------------------------------------------
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      premium_amount: calculateEstimatedPremium(prev.num_dependents),
    }));
  }, [formData.num_dependents]); // Recalcular solo cuando cambia num_dependents

  // -----------------------------------------------------
  // Manejo de cambios en los inputs
  // -----------------------------------------------------
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let newFormData = { ...prev };

      if (
        name === 'premium_amount' ||
        name === 'deductible' ||
        name === 'max_annual' ||
        name === 'coinsurance' ||
        name === 'wellness_rebate'
      ) {
        const numValue = parseFloat(value);
        newFormData = { ...newFormData, [name]: isNaN(numValue) ? 0 : numValue };
      } else if (name === 'num_dependents') {
        const num = parseInt(value, 10) || 0; // Usar radix 10 para parseInt
        const newDependentsArray: Dependent[] = [];
        const existingDependents = prev.dependents_details || [];
        for (let i = 0; i < num; i++) {
          newDependentsArray.push(
            existingDependents[i] || { name: '', birth_date: '', relationship: '' }
          );
        }
        newFormData = {
          ...newFormData,
          num_dependents: Math.min(Math.max(0, num), MAX_DEPENDENTS), // Limitar entre 0 y 4
          dependents_details: newDependentsArray,
          // premium_amount se actualizará con el useEffect de arriba
        };
      } else {
        newFormData = { ...newFormData, [name]: value };
      }

      // Limpiar errores de validación para el campo modificado
      setValidationErrors(prevErrors => ({
        ...prevErrors,
        [name]: null,
      }));

      return newFormData;
    });
  };

  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      const newDetails = [...prev.dependents_details!];
      if (!newDetails[idx]) {
        newDetails[idx] = { name: '', birth_date: '', relationship: '' };
      }
      newDetails[idx] = {
        ...newDetails[idx],
        [field]: value,
      };
      return { ...prev, dependents_details: newDetails };
    });
    // Limpiar errores de validación específicos de dependientes
    setValidationErrors(prevErrors => ({
      ...prevErrors,
      [`dependent_${idx + 1}`]: null, // Limpia el error general del dependiente
    }));
  };

  // -----------------------------------------------------
  // Función de Validación Centralizada
  // -----------------------------------------------------
  const validateForm = (): boolean => {
    let currentErrors: { [key: string]: string | null } = {};
    let isValid = true;

    // Validación de Agente
    if (!formData.agent_id) {
      currentErrors.agent_id = 'Por favor, selecciona un agente para tu solicitud de póliza.';
      isValid = false;
    }

    // Validación de Deducible
    if (formData.deductible < MIN_DEDUCTIBLE || formData.deductible > MAX_DEDUCTIBLE) {
      currentErrors.deductible = `El deducible debe estar entre $${MIN_DEDUCTIBLE} y $${MAX_DEDUCTIBLE}.`;
      isValid = false;
    }

    // Validación de Coaseguro (si es editable, si no, solo mostrar el error si el valor cambia inesperadamente)
    if (formData.coinsurance !== FIXED_COINSURANCE) {
      currentErrors.coinsurance = `El coaseguro para Plan Premier debe ser ${FIXED_COINSURANCE}%.`;
      isValid = false;
    }

    // Validación de Prima (basada en el cálculo y los límites)
    if (calculatedPremium < BASE_PREMIUM_MIN || calculatedPremium > MAX_PREMIUM_LIMIT) {
      currentErrors.premium_amount = `La prima estimada debe estar entre $${BASE_PREMIUM_MIN} y $${MAX_PREMIUM_LIMIT} (según dependientes).`;
      isValid = false;
    }

    // Validación de Número de Dependientes
    if (formData.num_dependents < 0 || formData.num_dependents > MAX_DEPENDENTS) {
      currentErrors.num_dependents = `El número de dependientes debe ser entre 0 y ${MAX_DEPENDENTS}.`;
      isValid = false;
    }

    // Validación de Fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignorar la hora para la comparación
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (!formData.start_date) {
      currentErrors.start_date = 'La fecha de inicio es requerida.';
      isValid = false;
    } else if (startDate < today) {
        currentErrors.start_date = 'La fecha de inicio no puede ser en el pasado.';
        isValid = false;
    }

    if (!formData.end_date) {
      currentErrors.end_date = 'La fecha de fin es requerida.';
      isValid = false;
    } else if (startDate && endDate && startDate >= endDate) {
      currentErrors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      isValid = false;
    }

    // Validación de detalles de dependientes
    for (let i = 0; i < formData.num_dependents; i++) {
      const d = formData.dependents_details?.[i];
      if (!d || !d.name.trim() || !d.birth_date || !d.relationship.trim()) {
        currentErrors[`dependent_${i + 1}`] = `Por favor completa todos los campos del dependiente ${i + 1}.`;
        isValid = false;
      }
    }

    setValidationErrors(currentErrors);
    return isValid;
  };

  // -----------------------------------------------------
  // Envío del formulario
  // -----------------------------------------------------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const currentClientId = user?.id;

    if (!currentClientId) {
      setError('No se pudo identificar al cliente. Por favor, asegúrate de estar logueado.');
      return;
    }

    // Ejecutar la validación centralizada
    if (!validateForm()) {
      setError('Por favor corrige los errores en el formulario antes de enviar.');
      return;
    }

    // Asegurarse de que el product_id esté establecido antes de enviar
    if (!planPremierProduct?.id) {
      setError('Error interno: El producto Plan Premier no está configurado. Contacta a soporte.');
      return;
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePlanPremierPolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: currentClientId,
      product_id: planPremierProduct.id, // Usar el ID del producto cargado
      status: 'pending',
      // Asegurarse de que los valores numéricos estén convertidos a Number
      premium_amount: Number(formData.premium_amount),
      deductible: Number(formData.deductible),
      coinsurance: Number(formData.coinsurance),
      max_annual: Number(formData.max_annual),
      wellness_rebate: Number(formData.wellness_rebate),
      num_dependents: Number(formData.num_dependents),
      // Asegurarse de que dependents_details sea un array válido, incluso si está vacío
      dependents_details: formData.dependents_details || [],
    };

    try {
      const { data, error: createError } = await createPolicy(payload);

      if (createError) {
        console.error('Error al crear póliza:', createError);
        setError(`Error al enviar la solicitud de póliza: ${createError.message}`);
      } else if (data) {
        setSuccessMessage(`Solicitud de póliza ${data.policy_number} enviada exitosamente para revisión.`);
        // Resetear formulario
        setFormData(prev => ({
          ...prev,
          policy_number: '',
          client_id: '',
          product_id: planPremierProduct ? planPremierProduct.id : '', // Mantener el product_id si se recarga el form
          start_date: '',
          end_date: '',
          premium_amount: BASE_PREMIUM_MIN, // Volver a la prima base
          payment_frequency: 'monthly',
          status: 'pending',
          contract_details: '',
          deductible: MIN_DEDUCTIBLE,
          coinsurance: FIXED_COINSURANCE,
          max_annual: 100000,
          has_dental_premium: true,
          has_vision_full: true,
          wellness_rebate: 50,
          num_dependents: 0,
          dependents_details: [],
          agent_id: '',
        }));
        setValidationErrors({}); // Limpiar todos los errores
        setTimeout(() => {
          navigate('/client/dashboard/policies');
        }, 2000);
      }
    } catch (apiError: any) {
      console.error('Error inesperado al crear póliza:', apiError);
      setError(`Ocurrió un error inesperado: ${apiError.message || apiError.toString()}`);
    }
  };

  // --- Nueva función para manejar la cancelación ---
  const handleCancel = () => {
    // Redirige al usuario al dashboard de políticas del cliente
    navigate('/client/dashboard/policies');
  };

  // La prima calculada se usa para mostrar y validar
  const calculatedPremium = calculateEstimatedPremium(formData.num_dependents);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Plan Premier…</p>
      </div>
    );
  }

  // Si hubo un error al cargar el producto, se puede mostrar un mensaje y evitar renderizar el formulario.
  if (error && !planPremierProduct) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-red-100 text-red-700 text-center">
        <h2 className="text-2xl font-bold mb-4">Error al cargar el formulario</h2>
        <p>{error}</p>
        <p className="mt-4">Por favor, contacta a soporte técnico.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Enviar Solicitud de Póliza – Plan Médico Premier
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

        {/* Agente */}
        <div>
          <label
            htmlFor="agent_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Selecciona tu Agente
          </label>
          <select
            id="agent_id"
            name="agent_id"
            value={formData.agent_id ?? ''}
            onChange={handleChange}
            required
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.agent_id ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          >
            <option value="">Selecciona un agente</option>
            {agents.map(agent => (
              <option key={agent.user_id} value={agent.user_id}>
                {agent.full_name ||
                  `${agent.primer_nombre || ''} ${agent.primer_apellido || ''}`.trim()}{' '}
                ({agent.email})
              </option>
            ))}
          </select>
          {validationErrors.agent_id && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.agent_id}</p>
          )}
        </div>

        {/* Producto de Seguro (MODIFICADO) */}
        <div>
          <label
            htmlFor="product_name_display"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Producto de Seguro
          </label>
          <input
            type="text"
            id="product_name_display"
            name="product_name_display"
            value={planPremierProduct ? planPremierProduct.name : 'Cargando...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro de Salud Plan Premier".
          </p>
        </div>

        {/* Fechas Inicio / Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fecha de Inicio de Cobertura
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border ${validationErrors.start_date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {validationErrors.start_date && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.start_date}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fecha de Fin de Cobertura
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border ${validationErrors.end_date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {validationErrors.end_date && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.end_date}</p>
            )}
          </div>
        </div>

        {/* Monto de la Prima (AHORA ESTÁ LIGADO A num_dependents) y Frecuencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="premium_amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Monto de la Prima ($)
            </label>
            <input
              type="number"
              id="premium_amount"
              name="premium_amount"
              value={formData.premium_amount}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Este valor se calcula automáticamente según el número de dependientes (Base $400 + $100/dependiente), con un máximo de $1500.
            </p>
          </div>
          <div>
            <label
              htmlFor="payment_frequency"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Frecuencia de Pago
            </label>
            <select
              id="payment_frequency"
              name="payment_frequency"
              value={formData.payment_frequency}
              onChange={handleChange}
              required
              className={`mt-1 block w-full px-3 py-2 border ${validationErrors.payment_frequency ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annually">Anual</option>
            </select>
            {validationErrors.payment_frequency && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.payment_frequency}</p>
            )}
          </div>
        </div>

        {/* Detalles del Contrato */}
        <div>
          <label
            htmlFor="contract_details"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Detalles Adicionales del Contrato (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Cobertura completa con reembolso gym incluido. Prefiero que me contacte por teléfono."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce cualquier detalle o preferencia adicional para tu agente.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Plan Médico Premier ———————————— */}

        {/* Deducible Anual */}
        <div>
          <label
            htmlFor="deductible"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Deducible Anual ($)
          </label>
          <input
            type="number"
            id="deductible"
            name="deductible"
            value={formData.deductible}
            onChange={handleChange}
            required
            min={MIN_DEDUCTIBLE}
            max={MAX_DEDUCTIBLE}
            step="1"
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.deductible ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango permitido: ${MIN_DEDUCTIBLE} – ${MAX_DEDUCTIBLE}.
          </p>
          {validationErrors.deductible && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.deductible}</p>
          )}
        </div>

        {/* Coaseguro (10%) */}
        <div>
          <label
            htmlFor="coinsurance"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Coaseguro (%)
          </label>
          <input
            type="number"
            id="coinsurance"
            name="coinsurance"
            value={formData.coinsurance}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Para el Plan Premier, el coaseguro está fijado en {FIXED_COINSURANCE} %.
          </p>
          {validationErrors.coinsurance && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.coinsurance}</p>
          )}
        </div>

        {/* Máximo Desembolsable Anual */}
        <div>
          <label
            htmlFor="max_annual"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Máximo Desembolsable Anual ($)
          </label>
          <input
            type="number"
            id="max_annual"
            name="max_annual"
            value={formData.max_annual}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Límite: ${formData.max_annual.toLocaleString()}/año (fijo para Plan Premier).
          </p>
        </div>

        {/* Cobertura Dental Premium (incluida) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cobertura Dental Premium
          </label>
          <p className="text-sm text-gray-700">
            Incluye hasta $10,000/año en tratamientos dentales (ortodoncia, implantes).
          </p>
        </div>

        {/* Cobertura Visión Completa (incluida) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cobertura de Visión Completa
          </label>
          <p className="text-sm text-gray-700">
            Incluye revisión anual y lentes hasta $500.
          </p>
        </div>

        {/* Programa de Bienestar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Programa de Bienestar
          </label>
          <p className="text-sm text-gray-700">
            Reembolso de membresía de gimnasio de hasta ${formData.wellness_rebate}/mes.
          </p>
        </div>

        {/* Dependientes (0 – 4) */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (0–{MAX_DEPENDENTS})
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            required
            min={0}
            max={MAX_DEPENDENTS}
            step="1"
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.num_dependents ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Cada dependiente extra +${DEPENDENT_COST_PER_MONTH}/mes.
          </p>
          {validationErrors.num_dependents && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.num_dependents}</p>
          )}
        </div>

        {/* Campos dinámicos para cada dependiente */}
        {formData.num_dependents > 0 && formData.dependents_details && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalles de Dependientes
            </h3>
            {formData.dependents_details.map((dep, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <p className="font-medium text-gray-800">
                  Dependiente #{idx + 1}
                </p>
                <div>
                  <label
                    htmlFor={`dep_name_${idx}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id={`dep_name_${idx}`}
                    name={`dep_name_${idx}`}
                    value={dep.name}
                    onChange={e =>
                      handleDependentChange(idx, 'name', e.target.value)
                    }
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx + 1}`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`dep_birth_${idx}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    id={`dep_birth_${idx}`}
                    name={`dep_birth_${idx}`}
                    value={dep.birth_date}
                    onChange={e =>
                      handleDependentChange(idx, 'birth_date', e.target.value)
                    }
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx + 1}`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`dep_rel_${idx}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Parentesco
                  </label>
                  <select
                    id={`dep_rel_${idx}`}
                    name={`dep_rel_${idx}`}
                    value={dep.relationship}
                    onChange={e =>
                      handleDependentChange(idx, 'relationship', e.target.value)
                    }
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx + 1}`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  >
                    <option value="">Selecciona parentesco</option>
                    <option value="spouse">Cónyuge</option>
                    <option value="child">Hijo(a)</option>
                    <option value="parent">Padre/Madre</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                {validationErrors[`dependent_${idx + 1}`] && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors[`dependent_${idx + 1}`]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- SECCIÓN DE PRIMA ESTIMADA --- */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>

        {/* --- Botones de acción (Envío y Cancelar) --- */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button" // Important: use type="button" for cancel to prevent form submission
            onClick={handleCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Enviar Póliza
          </button>
        </div>
      </form>
    </div>
  );
}