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
    premium_amount: 0,
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
    has_dental: true, // Se asume que siempre tendrá dental básica
    has_vision: false, // Se asume que no tendrá visión a menos que se marque
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Aunque no se usa directamente en el render, se mantiene para la carga
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planIntermedioProduct, setPlanIntermedioProduct] = useState<InsuranceProduct | null>(null);

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
        setProducts(productsData); // Guardar todos los productos
        // --- ENCUENTRA Y ESTABLECE EL PRODUCTO ESPECÍFICO "Plan Intermedio" ---
        const foundPlanIntermedioProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Intermedio');
        if (foundPlanIntermedioProduct) {
          setPlanIntermedioProduct(foundPlanIntermedioProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanIntermedioProduct.id, // Establece el ID en el formData
          }));
        } else {
          setError('Error: El producto "Seguro de Salud Plan Intermedio" no fue encontrado. Asegúrate de que existe en la base de datos.');
          setLoading(false); // Detener la carga si el producto no se encuentra
          return;
        }
      }

      // Cargar clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        // Concatenar el error si ya hay uno de productos, o establecer uno nuevo
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

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = () => {
    // Generación de número de póliza simple para frontend
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      // Si es premium_amount o deductible, asegúrate de que sea un número
      if (name === 'premium_amount' || name === 'deductible' || name === 'coinsurance' || name === 'max_annual') {
        const numValue = parseFloat(value);
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
        // Asegura que has_dental y has_vision se actualicen según wants_dental_premium y wants_vision
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
    setFormData(prev => {
      const newDetails = [...(prev.dependents_details || [])];
      if (newDetails[idx]) {
        newDetails[idx] = {
          ...newDetails[idx],
          [field]: value,
        };
      } else {
        // En caso de que el índice no exista, lo cual no debería pasar si num_dependents se maneja correctamente
        console.warn(`Attempted to update non-existent dependent at index ${idx}.`);
      }
      return { ...prev, dependents_details: newDetails };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

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

    // 1) Deducible entre 1000 y 2500
    if (formData.deductible === undefined || formData.deductible < 1000 || formData.deductible > 2500) {
      setError('El deducible debe estar entre $1,000 y $2,500.');
      return;
    }
    // 2) Coaseguro = 20%
    if (formData.coinsurance === undefined || formData.coinsurance !== 20) {
      setError('El coaseguro para Plan Intermedio debe ser 20%.');
      return;
    }
    // 3) Máximo Desembolsable Anual = 50000
    if (formData.max_annual === undefined || formData.max_annual !== 50000) {
        setError('El máximo desembolsable anual para Plan Intermedio debe ser $50,000.');
        return;
    }
    // 4) Prima entre $150 y $400
    if (formData.premium_amount === undefined || formData.premium_amount < 150 || formData.premium_amount > 400) {
      setError('El monto de la prima debe estar entre $150 y $400 mensuales.');
      return;
    }
    // 5) num_dependents entre 0 y 3
    if (formData.num_dependents === undefined || formData.num_dependents < 0 || formData.num_dependents > 3) {
      setError('El número de dependientes debe ser entre 0 y 3.');
      return;
    }
    // 6) Si hay dependientes, todos deben tener datos completos y válidos
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
        // Validación de fecha de nacimiento del dependiente
        const depBirthDate = new Date(d.birth_date);
        if (depBirthDate > today) {
            setError(`La fecha de nacimiento del dependiente ${i + 1} no puede ser en el futuro.`);
            return;
        }
      }
    }

    const policyNumber = generatePolicyNumber();

    // Crear una copia del formData para enviar, asegurando los tipos correctos y campos específicos
    const policyToCreate: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id, // Asegurado por la validación inicial de user.id
      premium_amount: Number(formData.premium_amount),
      // Campos específicos para Plan Intermedio, asegurando que se envíen
      deductible: formData.deductible,
      coinsurance: formData.coinsurance,
      max_annual: formData.max_annual,
      has_dental_basic: formData.has_dental_basic,
      wants_dental_premium: formData.wants_dental_premium,
      has_vision_basic: formData.has_vision_basic,
      wants_vision: formData.wants_vision,
      num_dependents: formData.num_dependents,
      dependents_details: formData.dependents_details,
      // Actualiza has_dental y has_vision basados en las selecciones
      has_dental: formData.has_dental_basic || formData.wants_dental_premium,
      has_vision: formData.wants_vision,
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
        product_id: planIntermedioProduct?.id || '', // Restablecer product_id si el producto ya fue encontrado
        start_date: '',
        end_date: '',
        premium_amount: 0,
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
      });
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

  // Si hay un error y no estamos cargando, y el producto no se encontró
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

        {/* Prima y Frecuencia */}
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
              onChange={handleChange}
              required
              min="150"
              max="400"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Rango permitido: $150 – $400 mensuales.
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annually">Anual</option>
            </select>
          </div>
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
            max={3} // Actualizado a 3 según la descripción
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