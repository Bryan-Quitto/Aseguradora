import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend'; // Importa agentes

interface Dependent {
  name: string;
  birth_date: string;
  relationship: string;
}

/**
 * Formulario para la Solicitud del Plan Médico Básico (para clientes).
 */
export default function PlanBasicoFormCliente() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Este 'user' es el cliente autenticado

  // -----------------------------------------------------
  // Estado base para los datos del formulario de la póliza
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '', // Se llenará con el ID del usuario autenticado (cliente)
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 50, // Valor por defecto dentro del rango [50-150]
    payment_frequency: 'monthly',
    status: 'pending', // Siempre inicia como 'pending' al ser una solicitud de cliente
    contract_details: '',
    // Campos específicos para Plan Básico
    deductible: 2000, // Valor por defecto dentro del rango [2000‒5000]
    coinsurance: 30, // 30 % fijo
    max_annual: 20000, // Máximo desembolsable anual
    num_dependents: 0, // Número de dependientes incluidos (0–2)
    dependents_details: [], // Inicializado como un array vacío de dependientes
    has_dental: false, // Plan Básico no incluye dental premium
    has_vision: false, // Plan Básico no incluye visión
    agent_id: '', // Agregado para almacenar el ID del agente seleccionado por el cliente
  });

  // -----------------------------------------------------
  // Estados para manejar la UI (listas, carga, errores, mensajes de éxito)
  // -----------------------------------------------------
  const [agents, setAgents] = useState<AgentProfile[]>([]); // Lista de perfiles de agentes
  const [loading, setLoading] = useState<boolean>(true); // Indicador de estado de carga
  const [error, setError] = useState<string | null>(null); // Mensaje de error
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito
  const [planBasicoProduct, setPlanBasicoProduct] = useState<InsuranceProduct | null>(null); // Producto específico "Plan Básico"

  // -----------------------------------------------------
  // useEffect para la carga inicial de datos (agentes y producto específico)
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
        const foundPlanBasicoProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Básico');
        if (foundPlanBasicoProduct) {
          setPlanBasicoProduct(foundPlanBasicoProduct);
          // Establece el ID del producto encontrado en el formData
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanBasicoProduct.id,
          }));
        } else {
          // Muestra un error si el producto específico no se encuentra
          setError('Error: El producto "Seguro de Salud Plan Básico" no fue encontrado. Asegúrate de que existe en la base de datos.');
          setLoading(false); // Detiene la carga si el producto no se encuentra
          return;
        }
      }

      // Cargar perfiles de agentes
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        // Concatena el mensaje de error si ya existía uno
        setError(prev => (prev ? prev + ' Y error al cargar agentes.' : 'Error al cargar los agentes.'));
        setLoading(false); // Detiene la carga en caso de error de agentes
        return;
      }
      if (agentsData) {
        setAgents(agentsData); // Establece la lista de agentes
      }

      setLoading(false); // Finaliza el estado de carga
    };

    fetchInitialData(); // Ejecuta la función de carga inicial
  }, []); // El array vacío asegura que este efecto se ejecuta solo una vez al montar el componente

  // -----------------------------------------------------
  // Funciones de utilidad (Helpers)
  // -----------------------------------------------------

  /**
   * Genera un número de póliza único (solo para referencia, el agente lo confirmará).
   * @returns {string} El número de póliza generado.
   */
  const generatePolicyNumber = (): string => {
    return `SOL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
      // Manejo específico para 'premium_amount' (parsear a float)
      if (name === 'premium_amount') {
        return { ...prev, [name]: parseFloat(value) || 0 }; // Asegura que sea un número, por defecto 0
      }

      // Manejo específico para 'num_dependents'
      if (name === 'num_dependents') {
        const num = parseInt(value, 10) || 0; // Parsear a entero, por defecto 0
        // Crea un nuevo array de `dependents_details` con el número correcto de elementos
        // Cada nuevo elemento se inicializa con campos vacíos
        const newDependentsArray = Array.from({ length: num }, (_, i) => {
          // Reutiliza los datos existentes si la posición ya tiene datos
          return prev.dependents_details && prev.dependents_details[i]
            ? prev.dependents_details[i]
            : { name: '', birth_date: '', relationship: '' };
        });
        return { ...prev, num_dependents: num, dependents_details: newDependentsArray };
      }

      // Manejo para campos booleanos (checkbox)
      if (type === 'checkbox') {
        return { ...prev, [name]: (e.target as HTMLInputElement).checked };
      }

      // Manejo general para otros inputs (texto, select, textarea)
      return { ...prev, [name]: value };
    });
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
      const newDetails = [...(prev.dependents_details || [])];
      // Asegura que el objeto dependiente exista antes de intentar actualizar sus propiedades
      if (!newDetails[idx]) {
        newDetails[idx] = { name: '', birth_date: '', relationship: '' };
      }
      // Actualiza el campo específico del dependiente en la posición `idx`
      newDetails[idx] = {
        ...newDetails[idx], // Copia los datos existentes del dependiente
        [field]: value, // Actualiza el campo específico
      };
      return { ...prev, dependents_details: newDetails }; // Actualiza el estado con el nuevo array
    });
  };

  /**
   * Maneja el envío del formulario.
   * @param {FormEvent} e Evento de envío del formulario.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario (recarga de página)
    setError(null); // Limpia errores anteriores
    setSuccessMessage(null); // Limpia mensajes de éxito anteriores

    // El ID del usuario actualmente autenticado es el CLIENTE que crea la solicitud.
    const currentClientId = user?.id;

    if (!currentClientId) {
      setError('No se pudo identificar al cliente. Por favor, asegúrate de estar logueado.');
      return;
    }

    // El cliente debe seleccionar un agente para la póliza.
    if (!formData.agent_id) {
      setError('Por favor, selecciona un agente para tu solicitud de póliza.');
      return;
    }

    if (!formData.product_id) {
      setError('Error interno: El producto Plan Básico no está configurado. Contacta a soporte.');
      return;
    }

    // --- Validaciones específicas del "Plan Básico" ---

    // 1) Deducible debe estar entre $2,000 y $5,000
    if (formData.deductible! < 2000 || formData.deductible! > 5000) {
      setError('El deducible debe estar entre $2,000 y $5,000.');
      return;
    }

    // 2) Coaseguro debe ser 30% (fijo)
    // Este campo es de solo lectura, la validación es más una confirmación.
    if (formData.coinsurance !== 30) {
      setError('Error: El coaseguro para Plan Básico debe ser 30%. Contacta a soporte.');
      return;
    }

    // 3) Máximo Desembolsable Anual debe ser $20,000 (fijo)
    // Este campo es de solo lectura, la validación es más una confirmación.
    if (formData.max_annual !== 20000) {
      setError('Error: El máximo desembolsable anual para Plan Básico debe ser $20,000. Contacta a soporte.');
      return;
    }

    // 4) Premium amount
    if (formData.premium_amount! < 50 || formData.premium_amount! > 150) {
      setError('La prima mensual debe estar entre $50 y $150.');
      return;
    }

    // 5) Número de dependientes debe ser entre 0 y 2
    if (formData.num_dependents! < 0 || formData.num_dependents! > 2) {
      setError('El número de dependientes debe ser entre 0 y 2.');
      return;
    }

    // 6) Si hay dependientes, todos deben tener datos completos
    for (let i = 0; i < formData.num_dependents!; i++) {
      const dependent = formData.dependents_details![i];
      if (!dependent || !dependent.name.trim() || !dependent.birth_date || !dependent.relationship.trim()) {
        setError(`Por favor completa todos los campos del dependiente ${i + 1} (Nombre, Fecha de Nacimiento, Parentesco).`);
        return;
      }
    }

    const policyNumber = generatePolicyNumber(); // Esto es más un número de solicitud

    const payload: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: currentClientId, // <-- El ID del CLIENTE que envía la solicitud
      agent_id: formData.agent_id, // <-- El ID del AGENTE seleccionado por el cliente
      status: 'pending', // <-- El estado siempre será 'pending' al ser enviado por el cliente
      // Asegurarse de que los valores numéricos sean del tipo correcto
      premium_amount: Number(formData.premium_amount),
      deductible: Number(formData.deductible),
      coinsurance: Number(formData.coinsurance),
      max_annual: Number(formData.max_annual),
      num_dependents: Number(formData.num_dependents),
    };

    // Llamada a la API para crear la póliza (que ahora es una solicitud pendiente)
    const { data, error: createError } = await createPolicy(payload);

    if (createError) {
      console.error('Error al enviar solicitud de póliza:', createError);
      setError(`Error al enviar la solicitud de póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Solicitud de póliza ${data.policy_number} enviada exitosamente para revisión por su agente.`);
      // Limpiar el formulario después del éxito
      setFormData(prev => ({
        ...prev,
        policy_number: '',
        client_id: '', // Limpiar, aunque se llenará automáticamente con user?.id al siguiente submit
        product_id: planBasicoProduct?.id || '',
        start_date: '',
        end_date: '',
        premium_amount: 50, // Resetear a valor inicial
        payment_frequency: 'monthly',
        status: 'pending', // Volver a 'pending'
        contract_details: '',
        deductible: 2000,
        coinsurance: 30,
        max_annual: 20000,
        num_dependents: 0,
        dependents_details: [],
        has_dental: false,
        has_vision: false,
        agent_id: '', // Limpiar el agente seleccionado
      }));
      // Redirigir al dashboard del cliente
      setTimeout(() => {
        navigate('/client/dashboard/policies');
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
        Solicitar Póliza – Plan Médico Básico
      </h2>

      {/* Área para mostrar mensajes de error */}
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
        {/* ———————————— Campos Comunes de la Solicitud ———————————— */}

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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              Fecha de Inicio de Cobertura
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
              Fecha de Fin de Cobertura
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

        {/* Campos de Monto de la Prima y Frecuencia de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="premium_amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Monto de la Prima Mensual ($)
            </label>
            <input
              type="number"
              id="premium_amount"
              name="premium_amount"
              value={formData.premium_amount}
              onChange={handleChange}
              required
              min="50" // Validación de rango
              max="150" // Validación de rango
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Rango permitido: $50 – $150 mensuales.
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

        {/* Campo de Detalles del Contrato (opcional) */}
        <div>
          <label
            htmlFor="contract_details"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Detalles Adicionales de la Solicitud (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Me gustaría una fecha de inicio el 1 de octubre. Estoy disponible para una llamada para discutir los detalles."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce cualquier detalle o preferencia adicional para tu agente.
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
        </div>

        {/* Campos dinámicos para cada dependiente */}
        {formData.num_dependents! > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              Detalles de Dependientes
            </h3>
            {formData.dependents_details!.map((dep, idx) => (
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
                    onChange={e =>
                      handleDependentChange(idx, 'birth_date', e.target.value)
                    }
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota sobre Cobertura Dental y Visión */}
        <div>
          <p className="text-sm text-gray-700">
            <strong>Nota:</strong> Este plan no incluye cobertura dental ni
            visión.
          </p>
        </div>

        {/* Botones de acción */}
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
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
          >
            Enviar solicitud de póliza
          </button>
        </div>
      </form>
    </div>
  );
}