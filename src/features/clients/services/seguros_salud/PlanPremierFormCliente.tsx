import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  CreatePlanPremierPolicyData, // <--- Importamos la interfaz específica
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
// Importa la función para obtener agentes en lugar de clientes
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend'; // <--- MODIFICACIÓN CLAVE: Importa agentes

interface Dependent {
  name: string;
  birth_date: string;
  relationship: string;
}

/**
 * Formulario específico para que el CLIENTE solicite el Plan Médico Premier.
 */
export default function PlanPremierForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Este 'user' es el cliente autenticado

  // -----------------------------------------------------
  // Estado base + campos propios de Plan Premier
  // -----------------------------------------------------
  // Usamos la nueva interfaz específica aquí
  const [formData, setFormData] = useState<CreatePlanPremierPolicyData>({
    policy_number: '',
    client_id: '', // Se llenará con el ID del usuario autenticado (cliente)
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 400, // Prima mínima para Plan Premier: $400
    payment_frequency: 'monthly',
    status: 'pending', // <-- El estado siempre inicia como pendiente
    contract_details: '',
    // ↓ Campos específicos Plan Premier (ahora son obligatorios por el tipo)
    deductible: 500, // rango [500‒1000]
    coinsurance: 10, // 10 % fijo
    max_annual: 100000, // máximo desembolsable anual
    has_dental_premium: true, // Premium incluida
    has_vision_full: true, // Visión completa incluida
    wellness_rebate: 50, // $50/mes reembolso gym (info solo explicativa)
    num_dependents: 0,
    dependents_details: [] as Dependent[], // Inicializamos como array vacío y con tipo correcto
    // Campos genéricos de salud que son obligatorios para este plan
    has_dental: true, // Se asume que siempre tendrá dental premium
    has_vision: true, // Se asume que siempre tendrá visión completa
    agent_id: '', // Agregado para almacenar el ID del agente seleccionado por el cliente
  });

  const [agents, setAgents] = useState<AgentProfile[]>([]); // Para que el cliente seleccione un agente
  const [products, setProducts] = useState<InsuranceProduct[]>([]); // No se usa directamente pero se mantiene por si acaso
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planPremierProduct, setPlanPremierProduct] = useState<InsuranceProduct | null>(null);

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

        // --- ENCUENTRA Y ESTABLECE EL PRODUCTO ESPECÍFICO "Plan Premier" ---
        const foundPlanPremierProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Premier');
        if (foundPlanPremierProduct) {
          setPlanPremierProduct(foundPlanPremierProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanPremierProduct.id, // Establece el ID en el formData
          }));
        } else {
          setError('Error: El producto "Seguro de Salud Plan Premier" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
      }

      // Cargar agentes (para que el cliente pueda seleccionarlo)
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        setError(prev => (prev ? prev + ' Y agentes.' : 'Error al cargar los agentes.'));
        setLoading(false);
        return;
      }
      if (agentsData) {
        setAgents(agentsData);
      }

      setLoading(false);
    };

    fetchInitialData();
  }, []);

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
      // Si es un campo numérico
      if (name === 'premium_amount' || name === 'deductible' || name === 'max_annual' || name === 'coinsurance' || name === 'wellness_rebate') {
        const numValue = parseFloat(value);
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }

      // Si es número de dependientes
      if (name === 'num_dependents') {
        const num = parseInt(value) || 0;
        // Aseguramos que dependents_details siempre sea un array del tamaño correcto.
        const newDependentsArray: Dependent[] = [];
        const existingDependents = prev.dependents_details || [];
        for (let i = 0; i < num; i++) {
          newDependentsArray.push(existingDependents[i] || { name: '', birth_date: '', relationship: '' });
        }
        return { ...prev, num_dependents: num, dependents_details: newDependentsArray };
      }
      
      // Resto de campos
      return { ...prev, [name]: value };
    });
  };

  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      // dependents_details es obligatorio en CreatePlanPremierPolicyData
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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // El ID del usuario actualmente autenticado es el CLIENTE que crea la póliza.
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
      setError('Error interno: El producto Plan Premier no está configurado. Contacta a soporte.');
      return;
    }

    // Validaciones Plan Premier
    if (formData.deductible < 500 || formData.deductible > 1000) {
      setError('El deducible debe estar entre $500 y $1,000.');
      return;
    }
    if (formData.coinsurance !== 10) {
      setError('El coaseguro para Plan Premier debe ser 10%.');
      return;
    }
    if (formData.premium_amount < 400 || formData.premium_amount > 1500) {
        setError('La prima mínima es $400 y máxima $1500.');
        return;
      }
    if (formData.num_dependents < 0 || formData.num_dependents > 4) {
      setError('El número de dependientes debe ser entre 0 y 4.');
      return;
    }

    // Si hay dependientes, todos deben tener datos
    for (let i = 0; i < formData.num_dependents; i++) {
      const d = formData.dependents_details![i];
      if (!d || !d.name.trim() || !d.birth_date || !d.relationship.trim()) {
        setError(`Por favor completa todos los campos del dependiente ${i + 1}.`);
        return;
      }
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePlanPremierPolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: currentClientId, // <-- El ID del CLIENTE que envía la póliza
      agent_id: formData.agent_id, // <-- El ID del AGENTE seleccionado por el cliente
      status: 'pending', // <-- El estado siempre será 'pending' al ser enviado por el cliente

      premium_amount: Number(formData.premium_amount),
      deductible: Number(formData.deductible),
      coinsurance: Number(formData.coinsurance),
      max_annual: Number(formData.max_annual),
      wellness_rebate: Number(formData.wellness_rebate),
      num_dependents: Number(formData.num_dependents),
      // has_dental_premium y has_vision_full ya son booleanos y se envían como están
      // dependents_details ya es un array de objetos
    };

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
        client_id: '', // Limpiar, aunque se llenará automáticamente con user?.id al siguiente submit
        product_id: planPremierProduct ? planPremierProduct.id : '',
        start_date: '',
        end_date: '',
        premium_amount: 400,
        payment_frequency: 'monthly',
        status: 'pending', // Volver a 'pending'
        contract_details: '',
        deductible: 500,
        coinsurance: 10,
        max_annual: 100000,
        has_dental_premium: true,
        has_vision_full: true,
        wellness_rebate: 50,
        num_dependents: 0,
        dependents_details: [],
        agent_id: '', // Limpiar el agente seleccionado
      }));
      setTimeout(() => {
        navigate('/client/dashboard/policies'); // Redirigir al dashboard del cliente
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Plan Premier…</p>
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

        {/* Monto de la Prima y Frecuencia */}
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
              min="400"
              max="1500"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Rango permitido: $400 – $1,500 mensuales.
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
            min={500}
            max={1000}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango permitido: $500 – $1,000.
          </p>
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
            Para el Plan Premier, el coaseguro está fijado en 10 %.
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
            value={formData.max_annual}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Límite: $100,000/año (fijo para Plan Premier).
          </p>
        </div>

        {/* Cobertura Dental Premium (incluida) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cobertura Dental Premium
          </label>
          <p className="text-sm text-gray-700">
            Incluye hasta $10,000/año en tratamientos dentales (ortodoncia,
            implantes).
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
            Reembolso de membresía de gimnasio de hasta $50/mes.
          </p>
        </div>

        {/* Dependientes (0 – 4) */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (0–4)
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            required
            min={0}
            max={4}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Cada dependiente extra +$100/mes.
          </p>
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