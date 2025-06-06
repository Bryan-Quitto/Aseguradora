import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
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
 * Formulario específico para el Plan Médico Básico.
 */
export default function PlanBasicoForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtiene el usuario autenticado del contexto de autenticación

  // -----------------------------------------------------
  // Estado base para los datos del formulario de la póliza
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0, // Este será el premium_amount calculado
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    deductible: 2000, // Valor por defecto dentro del rango [2000‒5000]
    coinsurance: 30, // 30 % fijo
    max_annual: 20000, // Máximo desembolsable anual
    num_dependents: 0, // Número de dependientes incluidos (0–2)
    dependents_details: [], // Inicializado como un array vacío de dependientes
    has_dental: false, // Plan Básico no incluye dental premium, se guarda false
    has_vision: false, // Plan Básico no incluye visión (se deja hardcodeado)
  });

  // -----------------------------------------------------
  // Estados para manejar la UI (listas, carga, errores, mensajes de éxito)
  // -----------------------------------------------------
  const [clients, setClients] = useState<ClientProfile[]>([]); // Lista de perfiles de clientes
  const [loading, setLoading] = useState<boolean>(true); // Indicador de estado de carga
  const [error, setError] = useState<string | null>(null); // Mensaje de error general
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito
  const [planBasicoProduct, setPlanBasicoProduct] = useState<InsuranceProduct | null>(null); // Producto específico "Plan Básico"
  const [calculatedPremium, setCalculatedPremium] = useState<number>(0); // Estado para la prima calculada
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | null }>({}); // Errores de validación por campo

  // -----------------------------------------------------
  // useEffect para la carga inicial de datos (clientes y producto específico)
  // -----------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true); // Inicia el estado de carga
      setError(null); // Limpia cualquier error previo

      // Cargar productos de seguro activos
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false); // Detiene el estado de carga en caso de error
        return;
      }
      if (productsData) {
        // Encuentra y establece el producto específico "Seguro de Salud Plan Básico"
        const foundPlanBasicoProduct = productsData.find(
          p => p.name === 'Seguro de Salud Plan Básico'
        );
        if (foundPlanBasicoProduct) {
          setPlanBasicoProduct(foundPlanBasicoProduct);
          // Establece el ID del producto encontrado en el formData
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanBasicoProduct.id,
          }));
        } else {
          // Muestra un error si el producto específico no se encuentra
          setError(
            'Error: El producto "Seguro de Salud Plan Básico" no fue encontrado. Asegúrate de que existe en la base de datos.'
          );
          setLoading(false); // Detiene la carga si el producto no se encuentra
          return;
        }
      }

      // Cargar perfiles de clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        // Concatena el mensaje de error si ya existía uno
        setError(prev =>
          prev ? prev + ' Y error al cargar clientes.' : 'Error al cargar los clientes.'
        );
        setLoading(false); // Detiene la carga en caso de error de clientes
        return;
      }
      if (clientsData) {
        setClients(clientsData); // Establece la lista de clientes
      }

      setLoading(false); // Finaliza el estado de carga
    };

    fetchInitialData(); // Ejecuta la función de carga inicial
  }, []); // El array vacío asegura que este efecto se ejecuta solo una vez al montar el componente

  // -----------------------------------------------------
  // useEffect para calcular la prima automáticamente
  // -----------------------------------------------------
  useEffect(() => {
    // Definir las tarifas base
    const BASE_PREMIUM_MONTHLY = 100; // Prima base mensual para el plan básico
    const DEPENDENT_COST_MONTHLY = 20; // Costo adicional por dependiente al mes

    let premium = BASE_PREMIUM_MONTHLY;
    premium += (formData.num_dependents || 0) * DEPENDENT_COST_MONTHLY;

    // Ajustar por frecuencia de pago si es necesario
    switch (formData.payment_frequency) {
      case 'quarterly':
        premium *= 3; // 3 meses
        break;
      case 'annually':
        premium *= 12; // 12 meses
        break;
      case 'monthly':
      default:
        // Ya es mensual, no se ajusta
        break;
    }

    setCalculatedPremium(premium);

    // Actualiza formData.premium_amount con la prima calculada
    setFormData(prev => ({
      ...prev,
      premium_amount: premium,
    }));
  }, [formData.num_dependents, formData.payment_frequency]); // Recalcula cuando cambian el número de dependientes o la frecuencia

  // -----------------------------------------------------
  // Funciones de utilidad (Helpers)
  // -----------------------------------------------------

  /**
   * Genera un número de póliza único.
   * @returns {string} El número de póliza generado.
   */
  const generatePolicyNumber = (): string => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  /**
   * Maneja los cambios en los campos del formulario.
   * @param {ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} e Evento de cambio.
   */
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      // Manejo específico para 'num_dependents'
      if (name === 'num_dependents') {
        const num = parseInt(value, 10) || 0; // Parsear a entero, por defecto 0
        // Limitar a un máximo de 2 dependientes directamente en el estado
        const safeNum = Math.min(Math.max(0, num), 2);

        // Crea un nuevo array de `dependents_details` con el número correcto de elementos
        const newDependentsArray = Array.from({ length: safeNum }, (_, i) => {
          return prev.dependents_details && prev.dependents_details[i]
            ? prev.dependents_details[i]
            : { name: '', birth_date: '', relationship: '' };
        });
        return { ...prev, num_dependents: safeNum, dependents_details: newDependentsArray };
      }

      // Manejo para campos booleanos (checkbox)
      if (type === 'checkbox') {
        return { ...prev, [name]: (e.target as HTMLInputElement).checked };
      }

      // Manejo general para otros inputs (texto, select, textarea)
      return { ...prev, [name]: value };
    });

    // Limpiar el error de validación para el campo específico cuando el usuario comienza a escribir
    setValidationErrors(prev => ({ ...prev, [name]: null }));
    setError(null); // Limpiar el error general si el usuario interactúa
  };

  /**
   * Maneja los cambios en los campos de un dependiente específico.
   * @param {number} idx Índice del dependiente en el array.
   * @param {'name' | 'birth_date' | 'relationship'} field Campo del dependiente a actualizar.
   * @param {string} value Nuevo valor del campo.
   */
  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      // Crea una copia del array `dependents_details` para evitar mutación directa del estado
      const newDetails = [...prev.dependents_details!];
      // Actualiza el campo específico del dependiente en la posición `idx`
      newDetails[idx] = {
        ...newDetails[idx], // Copia los datos existentes del dependiente
        [field]: value, // Actualiza el campo específico
      };
      return { ...prev, dependents_details: newDetails }; // Actualiza el estado con el nuevo array
    });
    // Limpiar errores específicos de dependientes
    setValidationErrors(prev => ({ ...prev, [`dependent_${idx}_${field}`]: null }));
    setError(null);
  };

  /**
   * Realiza las validaciones del formulario.
   * @returns {boolean} True si el formulario es válido, false en caso contrario.
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string | null } = {};
    let isValid = true;

    // Validación: Cliente seleccionado
    if (!formData.client_id) {
      newErrors.client_id = 'Debes seleccionar un cliente.';
      isValid = false;
    }

    // Validación: Fechas de inicio y fin
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida.';
      isValid = false;
    }
    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es requerida.';
      isValid = false;
    }
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      isValid = false;
    }

    // Validación: Deducible entre $2,000 y $5,000
    if (formData.deductible! < 2000 || formData.deductible! > 5000) {
      newErrors.deductible = 'El deducible debe estar entre $2,000 y $5,000.';
      isValid = false;
    }

    // Validación: Coaseguro debe ser 30% (fijo)
    if (formData.coinsurance !== 30) {
      newErrors.coinsurance = 'El coaseguro para Plan Básico debe ser 30%.';
      isValid = false;
    }

    // Validación: Número de dependientes entre 0 y 2
    if (formData.num_dependents! < 0 || formData.num_dependents! > 2) {
      newErrors.num_dependents = 'El número de dependientes debe ser entre 0 y 2.';
      isValid = false;
    }

    // Validación: Si hay dependientes, todos deben tener datos completos
    for (let i = 0; i < formData.num_dependents!; i++) {
      const dependent = formData.dependents_details![i];
      if (
        !dependent ||
        !dependent.name.trim() ||
        !dependent.birth_date ||
        !dependent.relationship.trim()
      ) {
        newErrors[
          `dependent_${i}`
        ] = `Por favor completa todos los campos del dependiente ${i + 1}.`;
        isValid = false;
      }
    }

    // Validación: Prima estimada (ya se calcula automáticamente, pero podemos validar si está dentro de un rango esperado)
    // Aunque se calcula automáticamente, podrías querer un rango de validación si por alguna razón el cálculo es inusual
    // Por ejemplo, si el plan tiene un costo base y no puede ser 0
    if (calculatedPremium <= 0) {
      newErrors.premium_amount = 'La prima estimada debe ser mayor que cero.';
      isValid = false;
    }

    setValidationErrors(newErrors);
    return isValid;
  };

  /**
   * Maneja el envío del formulario.
   * @param {FormEvent} e Evento de envío del formulario.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario (recarga de página)
    setError(null); // Limpia errores anteriores
    setSuccessMessage(null); // Limpia mensajes de éxito anteriores

    // Realizar validaciones antes de enviar
    if (!validateForm()) {
      setError('Por favor corrige los errores en el formulario.');
      return;
    }

    // Validación: Asegurarse de que el ID del agente esté disponible
    if (!user?.id) {
      setError('No se pudo obtener el ID del agente para asignar la póliza.');
      return;
    }

    // Generar número de póliza
    const policyNumber = generatePolicyNumber();

    // Crear el objeto de datos de la póliza para enviar
    const policyToCreate: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: calculatedPremium, // Usar la prima calculada
    };

    // Llamada a la API para crear la póliza
    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Limpiar el formulario después del éxito
      setFormData({
        policy_number: '',
        client_id: '',
        product_id: planBasicoProduct?.id || '', // Reinicia con el ID del producto básico si está disponible
        start_date: '',
        end_date: '',
        premium_amount: 0, // Reiniciar a 0, el useEffect lo recalculará
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        deductible: 2000,
        coinsurance: 30,
        max_annual: 20000,
        num_dependents: 0,
        dependents_details: [],
        has_dental: false,
        has_vision: false,
      });
      setCalculatedPremium(0); // Resetear la prima calculada
      setValidationErrors({}); // Limpiar errores de validación
      // Redirigir al usuario después de un breve retraso para que vea el mensaje de éxito
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
      }, 2000);
    }
  };

  // -----------------------------------------------------
  // Renderizado del componente
  // -----------------------------------------------------

  // Mostrar un mensaje de carga mientras se obtienen los datos iniciales
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Plan Básico…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Crear Póliza – Plan Médico Básico
      </h2>

      {/* Área para mostrar mensajes de error general */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {/* Área para mostrar mensajes de éxito */}
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
        {/* ———————————— Campos Comunes de la Póliza ———————————— */}

        {/* Campo de selección de Cliente */}
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
          {validationErrors.client_id && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.client_id}</p>
          )}
        </div>

        {/* Campo de visualización del Producto de Seguro (solo lectura) */}
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
            value={planBasicoProduct ? planBasicoProduct.name : 'Cargando producto...'}
            readOnly // Este campo es de solo lectura ya que es específico para el Plan Básico
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Plan Básico".
          </p>
        </div>

        {/* Campos de Fechas de Inicio y Fin */}
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
            {validationErrors.start_date && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.start_date}</p>
            )}
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
            {validationErrors.end_date && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.end_date}</p>
            )}
          </div>
        </div>

        {/* Campos de Frecuencia de Pago */}
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

        {/* Nuevo bloque de Prima Estimada */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">
            ${calculatedPremium.toFixed(2)} / {formData.payment_frequency}
          </p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>

        {/* Campo de Estado de la Póliza */}
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

        {/* Campo de Detalles del Contrato (opcional) */}
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
            value={formData.contract_details || ''} // Asegura que no sea undefined para el textarea
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Incluye cobertura mínima en consultas generales y hospitalización hasta $20,000/año"'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Plan Médico Básico ———————————— */}

        {/* Campo de Deducible Anual */}
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
            min={2000} // Límites específicos para el plan básico
            max={5000} // Límites específicos para el plan básico
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango permitido: $2,000 – $5,000.
          </p>
          {validationErrors.deductible && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.deductible}</p>
          )}
        </div>

        {/* Campo de Coaseguro (fijo en 30%) */}
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
            readOnly // Este campo es de solo lectura
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Para el Plan Básico, el coaseguro está fijado en 30 %.
          </p>
          {validationErrors.coinsurance && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.coinsurance}</p>
          )}
        </div>

        {/* Campo de Máximo Desembolsable Anual (fijo en $20,000) */}
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
            readOnly // Este campo es de solo lectura
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Límite: $20,000/año (fijo para Plan Básico).
          </p>
        </div>

        {/* Campo de Número de Dependientes (0 – 2) */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (0–2)
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            required
            min={0} // Rango permitido
            max={2} // Rango permitido
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Cada dependiente genera un costo adicional de $20/mes.
          </p>
          {validationErrors.num_dependents && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.num_dependents}</p>
          )}
        </div>

        {/* Campos dinámicos para cada beneficiario (dependiente) */}
        {/* Se renderizan solo si `num_dependents` es mayor que 0 y `dependents_details` está definido */}
        {formData.num_dependents! > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalles de Dependientes
            </h3>
            {formData.dependents_details!.map((dep, idx) => (
              <div
                key={idx} // `idx` puede ser usado como key aquí ya que el orden no cambia y no se eliminan elementos individualmente
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {validationErrors[`dependent_${idx}`] &&
                    validationErrors[`dependent_${idx}`]!.includes('nombre') && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors[`dependent_${idx}`]}
                      </p>
                    )}
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {validationErrors[`dependent_${idx}`] &&
                    validationErrors[`dependent_${idx}`]!.includes('fecha de nacimiento') && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors[`dependent_${idx}`]}
                      </p>
                    )}
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Selecciona parentesco</option>
                    <option value="spouse">Cónyuge</option>
                    <option value="child">Hijo(a)</option>
                    <option value="parent">Padre/Madre</option>
                    <option value="other">Otro</option>
                  </select>
                  {validationErrors[`dependent_${idx}`] &&
                    validationErrors[`dependent_${idx}`]!.includes('parentesco') && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors[`dependent_${idx}`]}
                      </p>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota sobre Cobertura Dental y Visión */}
        <div>
          <p className="text-sm text-gray-700">
            <strong>Nota:</strong> Este plan no incluye cobertura dental ni visión.
          </p>
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