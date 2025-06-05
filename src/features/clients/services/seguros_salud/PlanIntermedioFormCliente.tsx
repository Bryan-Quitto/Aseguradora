import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext'; // Asegúrate de que la ruta a AuthContext sea correcta
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend'; // Importar para agentes

// Definición de las props que este componente espera del padre (ClientPolicyForm)
interface PlanIntermedioFormClienteProps {
  clientId: string; // El ID del cliente autenticado, pasado como prop
  productId: string; // El ID del producto "Plan Intermedio", pasado como prop
  basePremium: number; // La prima base del producto, pasada como prop
  onSuccess: () => void; // Callback para indicar éxito al padre
  onError: (message: string) => void; // Callback para indicar error al padre
}

/**
 * Formulario específico para el Plan Médico Intermedio para el cliente.
 */
export default function PlanIntermedioFormCliente({
  clientId,
  productId,
  basePremium,
  onSuccess,
  onError,
}: PlanIntermedioFormClienteProps) {
  const navigate = useNavigate();
  const { user } = useAuth(); // Para obtener el ID del usuario actual (que es el cliente)

  // -----------------------------------------------------
  // Estado base + campos propios de Plan Intermedio
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: clientId, // El client_id ahora viene de las props
    product_id: productId, // El product_id ahora viene de las props
    start_date: '',
    end_date: '',
    premium_amount: basePremium, // Usa la prima base inicial pasada por props
    payment_frequency: 'monthly',
    status: 'pending', // Las pólizas solicitadas por el cliente inician como 'pending'
    contract_details: '',
    // ↓ Campos específicos Plan Intermedio
    deductible: 1000, // rango [1000‒2500]
    coinsurance: 20, // 20 % fijo
    max_annual: 50000, // máximo desembolsable anual
    has_dental_basic: true, // Plan Intermedio incluye dental básica por defecto
    wants_dental_premium: false,
    has_vision_basic: false, // visión no incluida a menos que marque
    wants_vision: false,
    num_dependents: 0,
    dependents_details: [] as { name: string; birth_date: string; relationship: string }[],
    // Campos genéricos de salud que deben estar en CreatePolicyData como opcionales o ser inferidos
    has_dental: true, // Se asume que siempre tendrá dental básica (por defecto del plan)
    has_vision: false, // Se asume que no tendrá visión a menos que se marque (por defecto del plan)
    // El agent_id será seleccionado por el cliente
    agent_id: '', // Agregamos agent_id aquí para la selección del cliente
  });

  const [agents, setAgents] = useState<AgentProfile[]>([]); // Estado para la lista de agentes
  const [loading, setLoading] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});
  // Los mensajes de éxito y error se manejan a través de los callbacks onSuccess/onError
  // para que el componente padre (ClientPolicyForm) los muestre.

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setValidationErrors({}); // Limpiar errores de validación al cargar

      // --- Cargar Agentes ---
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        onError('Error al cargar los agentes disponibles. Intenta de nuevo más tarde.'); // Usa el callback de error
        setLoading(false);
        return;
      }
      if (agentsData) {
        setAgents(agentsData);
      }

      setLoading(false);
    };

    fetchInitialData();
  }, [onError]); // Añadir onError al array de dependencias para el linter

  // -----------------------------------------------------
  // Calculadora de Prima (useMemo para optimización)
  // -----------------------------------------------------
  const calculatedPremium = useMemo(() => {
    let currentPremium = basePremium; // Parte de la prima base del producto

    // Ajuste por deducible (ejemplo simple: mayor deducible, menor prima relativa)
    // Asumimos que basePremium ya incorpora el costo del Plan Intermedio.
    // Esto es un EJEMPLO, la lógica real de precios puede ser más compleja.
    if (formData.deductible === 1000) currentPremium += 20; // Costo extra por deducible bajo
    else if (formData.deductible === 1500) currentPremium += 10;
    // Si el deducible es 2500, podría no haber costo adicional o incluso un descuento.

    // Añadir costos de coberturas opcionales
    if (formData.wants_dental_premium) {
      currentPremium += 25;
    }
    if (formData.wants_vision) {
      currentPremium += 10;
    }

    // Añadir costos por dependientes
    let dependentsCost = 0;
    formData.dependents_details?.forEach(dep => {
      if (dep.relationship === 'spouse') {
        dependentsCost += 60;
      } else if (dep.relationship === 'child') {
        dependentsCost += 40;
      }
      // Podrías añadir más lógica para otros parentescos o límites de hijos
    });
    currentPremium += dependentsCost;

    // Asegurarse de que la prima calculada esté dentro del rango permitido [basePremium, 400]
    // Ajustamos el rango mínimo para que sea al menos la basePremium del producto.
    return Math.max(basePremium, Math.min(400, currentPremium));
  }, [basePremium, formData.deductible, formData.wants_dental_premium, formData.wants_vision, formData.dependents_details]);

  // Actualizar premium_amount en formData cuando calculatedPremium cambie
  useEffect(() => {
    setFormData(prev => ({ ...prev, premium_amount: calculatedPremium }));
  }, [calculatedPremium]);


  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = () => {
    // Generación de número de póliza simple para frontend
    return `POL-CLI-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setValidationErrors(prev => ({ ...prev, [name]: undefined })); // Limpiar error al cambiar

    setFormData(prev => {
      // Si es deductible, asegúrate de que sea un número
      if (name === 'deductible') {
        const numValue = parseFloat(value);
        // Retornar el número o 0 si no es válido
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }
      // Si es num_dependents, maneja la creación/actualización del array de dependientes
      if (name === 'num_dependents') {
        const num = parseInt(value);
        const newNumDependents = isNaN(num) || num < 0 ? 0 : Math.min(num, 3); // Límite de 3 dependientes

        // Si el número de dependientes disminuye, trunca el array
        // Si aumenta, añade nuevos objetos dependientes vacíos
        const currentDependents = prev.dependents_details || [];
        const newDependentsArray = Array.from({ length: newNumDependents }, (_, i) =>
          currentDependents[i] || { name: '', birth_date: '', relationship: '' }
        );

        return { ...prev, num_dependents: newNumDependents, dependents_details: newDependentsArray };
      }
      // Booleanos (checkboxes)
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        if (name === 'wants_dental_premium') {
          return { ...prev, wants_dental_premium: checked, has_dental: checked || prev.has_dental_basic };
        }
        if (name === 'wants_vision') {
          return { ...prev, wants_vision: checked, has_vision: checked };
        }
        return { ...prev, [name]: checked };
      }
      // Resto de inputs
      return { ...prev, [name]: value };
    });
  };

  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setValidationErrors(prev => ({ ...prev, [`dependent_${idx}_${field}`]: undefined })); // Limpiar error

    setFormData(prev => {
      const newDetails = [...(prev.dependents_details || [])];
      if (newDetails[idx]) {
        newDetails[idx] = {
          ...newDetails[idx],
          [field]: value,
        };
      }
      // Asegurarse de que el array dependents_details no sea undefined si se manipula
      return { ...prev, dependents_details: newDetails };
    });
  };

  const validateForm = () => {
    let errors: Record<string, string> = {}; // El tipo aquí debe ser Record<string, string> para los errores de validación
    let isValid = true;

    // El client_id ya viene de las props, solo necesitamos asegurarnos de que exista.
    if (!clientId) {
      errors.client_id = 'El ID del cliente no está disponible. Por favor, recarga la página.';
      isValid = false;
    }

    // El product_id ya viene de las props, solo necesitamos asegurarnos de que exista.
    if (!productId) {
      errors.product_id = 'El ID del producto no está disponible. Por favor, recarga la página.';
      isValid = false;
    }

    // Validar selección de agente
    if (!formData.agent_id) {
      errors.agent_id = 'Por favor, selecciona un agente para tu póliza.';
      isValid = false;
    }

    // Validación de fechas
    if (!formData.start_date) {
      errors.start_date = 'La fecha de inicio es obligatoria.';
      isValid = false;
    }
    if (!formData.end_date) {
      errors.end_date = 'La fecha de fin es obligatoria.';
      isValid = false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día para la comparación

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      if (startDate < today) {
        errors.start_date = 'La fecha de inicio no puede ser anterior a la fecha actual.';
        isValid = false;
      }
      if (endDate <= startDate) {
        errors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
        isValid = false;
      }
    }

    // 1) Deducible entre 1000 y 2500
    if (formData.deductible === undefined || formData.deductible < 1000 || formData.deductible > 2500) {
      errors.deductible = 'El deducible debe estar entre $1,000 y $2,500.';
      isValid = false;
    }
    // 2) Coaseguro = 20% (Aunque es readonly, se valida por si acaso el valor por defecto se modifica)
    if (formData.coinsurance === undefined || formData.coinsurance !== 20) {
      errors.coinsurance = 'El coaseguro para Plan Intermedio debe ser 20%.';
      isValid = false;
    }
    // 3) Máximo Desembolsable Anual = 50000 (Aunque es readonly, se valida por si acaso)
    if (formData.max_annual === undefined || formData.max_annual !== 50000) {
      errors.max_annual = 'El máximo desembolsable anual para Plan Intermedio debe ser $50,000.';
      isValid = false;
    }
    // 4) Prima entre el basePremium y $400 (Ahora se valida el valor CALCULADO)
    if (formData.premium_amount < basePremium || formData.premium_amount > 400) {
      errors.premium_amount = `La prima calculada de $${formData.premium_amount.toFixed(2)} no está dentro del rango permitido ($${basePremium.toFixed(2)} - $400). Ajusta las opciones.`;
      isValid = false;
    }
    // 5) num_dependents entre 0 y 3
    if (formData.num_dependents === undefined || formData.num_dependents < 0 || formData.num_dependents > 3) {
      errors.num_dependents = 'El número de dependientes debe ser entre 0 y 3.';
      isValid = false;
    }

    // 6) Si hay dependientes, todos deben tener datos completos y válidos
    if (formData.num_dependents! > 0) {
      if (!formData.dependents_details || formData.dependents_details.length !== formData.num_dependents) {
        errors.dependents_details = 'Los detalles de los dependientes no coinciden con el número especificado.';
        isValid = false;
      } else {
        for (let i = 0; i < formData.num_dependents; i++) {
          const d = formData.dependents_details[i];
          if (!d || !d.name.trim()) {
            errors[`dependent_${i}_name`] = `Completa el nombre del dependiente ${i + 1}.`;
            isValid = false;
          }
          if (!d.birth_date) {
            errors[`dependent_${i}_birth_date`] = `Completa la fecha de nacimiento del dependiente ${i + 1}.`;
            isValid = false;
          } else {
            const depBirthDate = new Date(d.birth_date);
            if (depBirthDate > today) { // Usar la variable `today` definida
              errors[`dependent_${i}_birth_date`] = `La fecha de nacimiento del dependiente ${i + 1} no puede ser en el futuro.`;
              isValid = false;
            }
          }
          if (!d.relationship.trim()) {
            errors[`dependent_${i}_relationship`] = `Selecciona el parentesco del dependiente ${i + 1}.`;
            isValid = false;
          }
        }
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({}); // Limpiar errores antes de la nueva validación

    if (!validateForm()) {
      // Si la validación falla, los errores ya están en el estado `validationErrors`
      // Opcional: Desplazarse al primer error
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      // Usar onError para informar al padre que hubo un error de validación
      onError('Por favor, corrige los errores en el formulario.');
      return;
    }

    const policyNumber = generatePolicyNumber();

    // Crear una copia del formData para enviar, asegurando los tipos correctos y campos específicos
    const policyToCreate: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: clientId, // Ya viene de las props
      product_id: productId, // Ya viene de las props
      premium_amount: Number(formData.premium_amount), // Asegurarse que es número
      // contract_details puede ser un JSON stringificado de los detalles específicos si son complejos
      contract_details: JSON.stringify({
        deductible: formData.deductible,
        coinsurance: formData.coinsurance,
        max_annual: formData.max_annual,
        has_dental_basic: formData.has_dental_basic,
        wants_dental_premium: formData.wants_dental_premium,
        has_vision_basic: formData.has_vision_basic,
        wants_vision: formData.wants_vision,
        num_dependents: formData.num_dependents,
        dependents_details: formData.dependents_details,
      }),
      // has_dental y has_vision se actualizan en handleChange y ya reflejan la selección
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      onError(`Error al solicitar la póliza: ${createError.message || 'Error desconocido'}`);
    } else if (data) {
      onSuccess(); // Llamar al callback de éxito del padre
      // Opcional: limpiar el formulario o redirigir
      // El padre se encargará de la navegación.
      setFormData({
        policy_number: '',
        client_id: clientId, // Mantiene el ID del cliente
        product_id: productId, // Mantiene el ID del producto
        start_date: '',
        end_date: '',
        premium_amount: basePremium, // Resetea a la prima base inicial
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        deductible: 1000,
        coinsurance: 20,
        max_annual: 50000,
        has_dental_basic: true,
        wants_dental_premium: false,
        has_vision_basic: false,
        wants_vision: false,
        num_dependents: 0,
        dependents_details: [],
        has_dental: true,
        has_vision: false,
        agent_id: '', // Limpiar selección de agente
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">
          Cargando datos para Plan Intermedio…
        </p>
      </div>
    );
  }

  // Si no hay agentes cargados, muestra un mensaje de error
  if (!agents.length && !loading) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center">
        <strong className="font-bold">¡Error!</strong>
        <span className="block sm:inline"> No se pudieron cargar los agentes. No puedes contratar una póliza sin seleccionar un agente.</span>
        <button
          onClick={() => navigate('/client/dashboard')} // Redirigir al dashboard del cliente
          className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Contratar Póliza – Plan Médico Intermedio
      </h2>

      {/* Los mensajes de error y éxito ahora se muestran en el componente padre (ClientPolicyForm) */}
      {/* Puedes dejar aquí mensajes de error y éxito para validaciones internas específicas del formulario hijo si lo deseas */}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ———————————— Campos Comunes ———————————— */}

        {/* Agente */}
        <div>
          <label
            htmlFor="agent_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Selecciona un Agente para tu póliza
          </label>
          <select
            id="agent_id"
            name="agent_id"
            value={formData.agent_id || ''} // Usar '' si es null/undefined para el select
            onChange={handleChange}
            required
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.agent_id ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          >
            <option value="">-- Selecciona un agente --</option>
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

        {/* Fechas de Inicio y Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio de la Póliza
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
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Fin de la Póliza
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

        {/* Frecuencia de Pago */}
        <div>
          <label htmlFor="payment_frequency" className="block text-sm font-medium text-gray-700 mb-1">
            Frecuencia de Pago Preferida
          </label>
          <select
            id="payment_frequency"
            name="payment_frequency"
            value={formData.payment_frequency}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="annually">Anual</option>
          </select>
        </div>

        {/* ———————————— Campos Específicos del Plan Intermedio ———————————— */}

        {/* Deducible */}
        <div>
          <label
            htmlFor="deductible"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Deducible ($1,000 - $2,500)
          </label>
          <input
            type="number"
            id="deductible"
            name="deductible"
            value={formData.deductible}
            onChange={handleChange}
            min="1000"
            max="2500"
            step="500"
            required
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.deductible ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {validationErrors.deductible && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.deductible}</p>
          )}
        </div>

        {/* Coaseguro y Máximo Anual (Readonly) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="coinsurance"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Coaseguro (%)
            </label>
            <input
              type="text"
              id="coinsurance"
              name="coinsurance"
              value={`${formData.coinsurance}%`}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
            />
            {validationErrors.coinsurance && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.coinsurance}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="max_annual"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Máximo Desembolsable Anual ($)
            </label>
            <input
              type="text"
              id="max_annual"
              name="max_annual"
              value={`$${formData.max_annual!.toLocaleString()}`}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
            />
            {validationErrors.max_annual && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.max_annual}</p>
            )}
          </div>
        </div>

        {/* Opciones de Cobertura */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Coberturas Adicionales:</h3>
          <div className="flex items-center">
            <input
              id="has_dental_basic"
              name="has_dental_basic"
              type="checkbox"
              checked={formData.has_dental_basic}
              disabled // Siempre true para este plan
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
            />
            <label htmlFor="has_dental_basic" className="ml-2 block text-sm text-gray-900">
              Cobertura Dental Básica (Incluida)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="wants_dental_premium"
              name="wants_dental_premium"
              type="checkbox"
              checked={formData.wants_dental_premium}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="wants_dental_premium" className="ml-2 block text-sm text-gray-900">
              Mejorar a Cobertura Dental Premium (+$25/mes)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="wants_vision"
              name="wants_vision"
              type="checkbox"
              checked={formData.wants_vision}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="wants_vision" className="ml-2 block text-sm text-gray-900">
              Añadir Cobertura de Visión (+$10/mes)
            </label>
            {validationErrors.wants_vision && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.wants_vision}</p>
            )}
          </div>
        </div>

        {/* Número de Dependientes */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (Máx. 3)
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            min="0"
            max="3"
            required
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.num_dependents ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {validationErrors.num_dependents && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.num_dependents}</p>
          )}
        </div>

        {/* Detalles de Dependientes (si hay) */}
        {formData.num_dependents! > 0 && (
          <div className="space-y-4 border p-4 rounded-md bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Detalles de Dependientes:</h3>
            {validationErrors.dependents_details && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.dependents_details}</p>
            )}
{Array.from({ length: formData.num_dependents || 0 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
                <p className="md:col-span-3 text-sm font-semibold text-gray-700">Dependiente {idx + 1}</p>
                <div>
                  <label htmlFor={`dependent_name_${idx}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id={`dependent_name_${idx}`}
                    name={`dependent_name_${idx}`} // Nombre ficticio para la validación de errores
                    value={formData.dependents_details?.[idx]?.name || ''}
                    onChange={(e) => handleDependentChange(idx, 'name', e.target.value)}
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx}_name`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                  {validationErrors[`dependent_${idx}_name`] && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors[`dependent_${idx}_name`]}</p>
                  )}
                </div>
                <div>
                  <label htmlFor={`dependent_birth_date_${idx}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    id={`dependent_birth_date_${idx}`}
                    name={`dependent_birth_date_${idx}`} // Nombre ficticio para la validación de errores
                    value={formData.dependents_details?.[idx]?.birth_date || ''}
                    onChange={(e) => handleDependentChange(idx, 'birth_date', e.target.value)}
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx}_birth_date`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                  {validationErrors[`dependent_${idx}_birth_date`] && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors[`dependent_${idx}_birth_date`]}</p>
                  )}
                </div>
                <div>
                  <label htmlFor={`dependent_relationship_${idx}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Parentesco
                  </label>
                  <select
                    id={`dependent_relationship_${idx}`}
                    name={`dependent_relationship_${idx}`} // Nombre ficticio para la validación de errores
                    value={formData.dependents_details?.[idx]?.relationship || ''}
                    onChange={(e) => handleDependentChange(idx, 'relationship', e.target.value)}
                    required
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors[`dependent_${idx}_relationship`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  >
                    <option value="">Selecciona</option>
                    <option value="spouse">Cónyuge</option>
                    <option value="child">Hijo(a)</option>
                    {/* Añadir otros parentescos si es necesario */}
                  </select>
                  {validationErrors[`dependent_${idx}_relationship`] && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors[`dependent_${idx}_relationship`]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumen de Prima */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>

        {/* Detalles del Contrato Adicionales (Opcional) */}
        <div>
          <label htmlFor="contract_details" className="block text-sm font-medium text-gray-700 mb-1">
            Detalles Adicionales del Contrato (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Introduce cualquier detalle adicional relevante para la póliza, como cláusulas específicas o beneficiarios no dependientes."
          ></textarea>
        </div>


        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/client/dashboard/policies')}
            className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300"
          >
            Solicitar Póliza
          </button>
        </div>
      </form>
    </div>
  );
}