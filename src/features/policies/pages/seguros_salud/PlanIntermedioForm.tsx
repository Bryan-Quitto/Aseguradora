import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../policy_management';
import { ClientProfile, getAllClientProfiles } from '../../../clients/hooks/cliente_backend';

/**
 * Formulario específico para el Plan Médico Intermedio.
 */
export default function PlanIntermedioForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos propios de Plan Intermedio
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0, // Se calculará dinámicamente
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    // ↓ Campos específicos Plan Intermedio
    deductible: 1000,           // rango [1000‒2500]
    coinsurance: 20,            // 20 % fijo
    max_annual: 50000,          // máximo desembolsable anual
    has_dental_basic: true,     // Plan Intermedio incluye dental básica por defecto
    wants_dental_premium: false,
    has_vision_basic: false,    // visión no incluida a menos que marque
    wants_vision: false,
    num_dependents: 0,
    dependents_details: [] as { name: string; birth_date: string; relationship: string }[],
    // Campos genéricos de salud que deben estar en CreatePolicyData como opcionales o ser inferidos
    has_dental: true, // Se asume que siempre tendrá dental básica (por has_dental_basic)
    has_vision: false, // Se asume que no tendrá visión a menos que se marque (por wants_vision)
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planIntermedioProduct, setPlanIntermedioProduct] = useState<InsuranceProduct | null>(null);

  // NUEVOS ESTADOS para la prima calculada y errores de validación por campo
  const [calculatedPremium, setCalculatedPremium] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | null }>({});

  // -----------------------------------------------------
  // Lógica de cálculo de prima
  // -----------------------------------------------------
  const calculatePremium = (data: CreatePolicyData) => {
    let basePremium = 250; // Prima base para Plan Intermedio
    let currentErrors: { [key: string]: string | null } = { premium_amount: null };

    // Costo por dependientes
    basePremium += (data.num_dependents || 0) * 40; // Por ejemplo, $40 por dependiente
    // Ajuste por tipo de dependiente (si aplica)
    if (data.dependents_details) {
      data.dependents_details.forEach(dep => {
        if (dep.relationship === 'spouse') {
          basePremium += 20; // Costo adicional por cónyuge (ej. $60 total: 40 base + 20 adicional)
        }
      });
    }

    // Cobertura Dental Premium
    if (data.wants_dental_premium) {
      basePremium += 25; // +$25/mes
    }

    // Cobertura de Visión
    if (data.wants_vision) {
      basePremium += 10; // +$10/mes
    }

    // Aplicar validación de rango para la prima calculada
    if (basePremium < 150 || basePremium > 400) {
      currentErrors.premium_amount = 'La prima estimada debe estar entre $150 y $400 mensuales según las opciones seleccionadas.';
    } else {
      currentErrors.premium_amount = null;
    }

    setValidationErrors(currentErrors);
    return basePremium;
  };

  // -----------------------------------------------------
  // Efecto para cargar datos iniciales y recalcular prima
  // -----------------------------------------------------
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
      if (productsData) {
        setProducts(productsData);
        const foundPlanIntermedioProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Intermedio');
        if (foundPlanIntermedioProduct) {
          setPlanIntermedioProduct(foundPlanIntermedioProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanIntermedioProduct.id,
            // Establecer has_dental y has_vision iniciales basadas en los defaults
            has_dental: prev.has_dental_basic || prev.wants_dental_premium,
            has_vision: prev.wants_vision,
          }));
        } else {
          setError('Error: El producto "Seguro de Salud Plan Intermedio" no fue encontrado. Asegúrate de que existe en la base de datos.');
          setLoading(false);
          return;
        }
      }

      // Cargar clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        setError(prev => (prev ? prev + ' Y error al cargar clientes.' : 'Error al cargar los clientes.'));
        setLoading(false);
        return;
      }
      if (clientsData) {
        setClients(clientsData);
      }

      setLoading(false);
    };

    fetchInitialData();
  }, []);

  // Efecto para recalcular la prima cuando cambie formData relevante
  useEffect(() => {
    // Solo si el producto intermedio ha sido cargado
    if (planIntermedioProduct) {
      const newCalculatedPremium = calculatePremium(formData);
      setCalculatedPremium(newCalculatedPremium);
      // Actualizar formData.premium_amount con el valor calculado
      setFormData(prev => ({ ...prev, premium_amount: newCalculatedPremium }));
    }
  }, [
    formData.num_dependents,
    formData.dependents_details,
    formData.wants_dental_premium,
    formData.wants_vision,
    planIntermedioProduct // Recalcular cuando el producto esté disponible
  ]);


  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = () => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      let newState = { ...prev };

      if (name === 'deductible' || name === 'coinsurance' || name === 'max_annual') {
        const numValue = parseFloat(value);
        newState = { ...newState, [name]: isNaN(numValue) ? 0 : numValue };
      }
      else if (name === 'num_dependents') {
        const num = parseInt(value);
        const newNumDependents = isNaN(num) || num < 0 ? 0 : Math.min(num, 3);

        const currentDependents = prev.dependents_details || [];
        const newDependentsArray = Array.from({ length: newNumDependents }, (_, i) =>
          currentDependents[i] || { name: '', birth_date: '', relationship: '' }
        );
        newState = { ...newState, num_dependents: newNumDependents, dependents_details: newDependentsArray };
      }
      else if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        if (name === 'wants_dental_premium') {
          newState = { ...newState, wants_dental_premium: checked, has_dental: checked || prev.has_dental_basic };
        } else if (name === 'wants_vision') {
          newState = { ...newState, wants_vision: checked, has_vision: checked };
        } else {
          newState = { ...newState, [name]: checked };
        }
      } else {
        newState = { ...newState, [name]: value };
      }

      // NO recalculamos la prima aquí directamente.
      // El useEffect se encargará de esto cuando cambie formData.
      return newState;
    });
  };

  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      const newDetails = [...(prev.dependents_details || [])];
      if (newDetails[idx]) {
        newDetails[idx] = {
          ...newDetails[idx],
          [field]: value,
        };
      } else {
        console.warn(`Attempted to update non-existent dependent at index ${idx}.`);
      }
      return { ...prev, dependents_details: newDetails };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({}); // Limpiar errores de validación al intentar enviar

    // -----------------------------------------------------
    // Validaciones de Formulario
    // -----------------------------------------------------
    if (!user?.id) {
      setError('No se pudo obtener el ID del agente para asignar la póliza. Por favor, vuelve a iniciar sesión.');
      return;
    }

    if (!formData.client_id) {
      setError('Por favor, selecciona un cliente.');
      return;
    }

    if (!formData.product_id) {
      setError('Error: El ID del producto no ha sido asignado. Recarga la página.');
      return;
    }

    // Validación de fechas
    if (!formData.start_date || !formData.end_date) {
      setError('Las fechas de inicio y fin de la póliza son obligatorias.');
      return;
    }
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día

    if (startDate < today) {
      setError('La fecha de inicio no puede ser anterior a la fecha actual.');
      return;
    }
    if (endDate <= startDate) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    // Validaciones específicas de Plan Intermedio (ya se hacen en handleChange o useEffect, pero reconfirmamos para el submit)
    if (formData.deductible === undefined || formData.deductible < 1000 || formData.deductible > 2500) {
      setError('El deducible debe estar entre $1,000 y $2,500.');
      return;
    }
    if (formData.coinsurance === undefined || formData.coinsurance !== 20) {
      setError('El coaseguro para Plan Intermedio debe ser 20%.');
      return;
    }
    if (formData.max_annual === undefined || formData.max_annual !== 50000) {
      setError('El máximo desembolsable anual para Plan Intermedio debe ser $50,000.');
      return;
    }
    // ¡NUEVO! Validar la prima calculada antes de enviar
    if (validationErrors.premium_amount) {
      setError(validationErrors.premium_amount);
      return;
    }

    if (formData.num_dependents === undefined || formData.num_dependents < 0 || formData.num_dependents > 3) {
      setError('El número de dependientes debe ser entre 0 y 3.');
      return;
    }
    if (formData.num_dependents > 0) {
      if (!formData.dependents_details || formData.dependents_details.length !== formData.num_dependents) {
        setError('Los detalles de los dependientes no coinciden con el número especificado.');
        return;
      }
      for (let i = 0; i < formData.num_dependents; i++) {
        const d = formData.dependents_details[i];
        if (!d || !d.name.trim() || !d.birth_date || !d.relationship.trim()) {
          setError(`Por favor, completa todos los campos del dependiente ${i + 1} (nombre, fecha de nacimiento y parentesco).`);
          return;
        }
        const depBirthDate = new Date(d.birth_date);
        if (depBirthDate > today) {
          setError(`La fecha de nacimiento del dependiente ${i + 1} no puede ser en el futuro.`);
          return;
        }
      }
    }

    const policyNumber = generatePolicyNumber();

    const policyToCreate: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: calculatedPremium, // Usa la prima calculada aquí
      // Asegurando que los campos específicos se envíen (ya están en formData, pero por claridad)
      deductible: formData.deductible,
      coinsurance: formData.coinsurance,
      max_annual: formData.max_annual,
      has_dental_basic: formData.has_dental_basic,
      wants_dental_premium: formData.wants_dental_premium,
      has_vision_basic: formData.has_vision_basic,
      wants_vision: formData.wants_vision,
      num_dependents: formData.num_dependents,
      dependents_details: formData.dependents_details,
      has_dental: formData.has_dental_basic || formData.wants_dental_premium, // Asegura el valor final
      has_vision: formData.wants_vision, // Asegura el valor final
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message || 'Error desconocido'}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Limpiar formulario y reiniciar estado después de un éxito
      setFormData({
        policy_number: '',
        client_id: '',
        product_id: planIntermedioProduct?.id || '',
        start_date: '',
        end_date: '',
        premium_amount: 0, // Reiniciar a 0, se recalculará
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
        has_dental: true, // Reiniciar a los valores por defecto del plan
        has_vision: false, // Reiniciar a los valores por defecto del plan
      });
      setCalculatedPremium(calculatePremium({ // Recalcular prima para el estado inicial
        policy_number: '', client_id: '', product_id: planIntermedioProduct?.id || '', start_date: '', end_date: '', premium_amount: 0, payment_frequency: 'monthly', status: 'pending', contract_details: '', deductible: 1000, coinsurance: 20, max_annual: 50000, has_dental_basic: true, wants_dental_premium: false, has_vision_basic: false, wants_vision: false, num_dependents: 0, dependents_details: [], has_dental: true, has_vision: false
      }));
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
      }, 2000);
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

  if (error && !loading && !planIntermedioProduct) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center">
        <strong className="font-bold">¡Error crítico!</strong>
        <span className="block sm:inline"> {error}</span>
        <p className="mt-2 text-sm">No se puede cargar el formulario sin el producto "Plan Intermedio". Por favor, verifica la configuración de productos.</p>
        <button
          onClick={() => navigate('/agent/dashboard')}
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
        Crear Póliza – Plan Médico Intermedio
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
        <div>
          <label
            htmlFor="client_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cliente
          </label>
          <select
            id="client_id"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Selecciona un cliente</option>
            {clients.map(client => (
              <option key={client.user_id} value={client.user_id}>
                {client.full_name ||
                  `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()}{' '}
                ({client.email})
              </option>
            ))}
          </select>
        </div>

        {/* Producto de Seguro */}
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
            value={planIntermedioProduct ? planIntermedioProduct.name : 'Cargando producto...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Plan Intermedio".
          </p>
        </div>

        {/* Fechas Inicio / Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fecha de Inicio
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fecha de Fin
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Frecuencia de Pago (Monto de la Prima se calculará) */}
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="annually">Anual</option>
          </select>
        </div>

        {/* Estado de la Póliza */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Estado de la Póliza
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="pending">Pendiente</option>
            <option value="active">Activa</option>
            <option value="cancelled">Cancelada</option>
            <option value="expired">Expirada</option>
            <option value="rejected">Rechazada</option>
          </select>
        </div>

        {/* Detalles del Contrato */}
        <div>
          <label
            htmlFor="contract_details"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Detalles del Contrato (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Incluye dental básica y hospitalización hasta $50,000/año."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Plan Médico Intermedio ———————————— */}

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
            min={1000}
            max={2500}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango permitido: $1,000 – $2,500.
          </p>
        </div>

        {/* Coaseguro (20%) */}
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
            value={20} // Valor fijo
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            Para el Plan Intermedio, el coaseguro está fijado en 20 %.
          </p>
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
            value={50000} // Valor fijo
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            Límite: $50,000/año (fijo para Plan Intermedio).
          </p>
        </div>

        {/* Cobertura Dental Básica (siempre incluida) */}
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
          <label
            htmlFor="wants_dental_premium"
            className="ml-2 block text-sm text-gray-700"
          >
            Quiero Cobertura Dental Premium (+$25/mes)
          </label>
        </div>
        {formData.wants_dental_premium && (
          <p className="mt-1 text-xs text-gray-500">
            La Cobertura Dental Premium cubre ortodoncia hasta $5,000/año.
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
          <label
            htmlFor="wants_vision"
            className="ml-2 block text-sm text-gray-700"
          >
            Quiero Cobertura de Visión (+$10/mes)
          </label>
        </div>
        {formData.wants_vision && (
          <p className="mt-1 text-xs text-gray-500">
            La Cobertura de Visión incluye revisión anual y lentes hasta $300.
          </p>
        )}

        {/* Dependientes (0 – 3) */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (0–3)
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            required
            min={0}
            max={3}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Cónyuge: +$60/mes; Hijo hasta 2: +$40/mes cada uno.
          </p>
        </div>

        {/* Campos dinámicos para cada dependiente */}
        {formData.num_dependents! > 0 && formData.dependents_details && (
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
                    onChange={e => handleDependentChange(idx, 'name', e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    onChange={e => handleDependentChange(idx, 'birth_date', e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    onChange={e => handleDependentChange(idx, 'relationship', e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Selecciona parentesco</option>
                    <option value="spouse">Cónyuge</option>
                    <option value="child">Hijo(a)</option>
                    <option value="parent">Padre/Madre</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sección de Prima Estimada - ¡NUEVO! */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>

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