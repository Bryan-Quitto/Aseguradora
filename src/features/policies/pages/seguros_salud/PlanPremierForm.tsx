import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  CreatePlanPremierPolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../policy_management';
import { ClientProfile, getAllClientProfiles } from '../../../clients/hooks/cliente_backend';

/**
 * Formulario específico para el Plan Médico Premier.
 */
export default function PlanPremierForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos propios de Plan Premier
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePlanPremierPolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0, // Este valor se calculará
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    deductible: 500,
    coinsurance: 10,
    max_annual: 100000,
    has_dental_premium: true,
    has_vision_full: true,
    wellness_rebate: 50,
    num_dependents: 0,
    dependents_details: [],
    has_dental: true,
    has_vision: true,
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planPremierProduct, setPlanPremierProduct] = useState<InsuranceProduct | null>(null);

  // --- NUEVO ESTADO: Prima Calculada y Errores de Validación Específicos ---
  const [calculatedPremium, setCalculatedPremium] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  // -----------------------------------------------------
  // Efecto para cargar datos iniciales y calcular prima
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
        const foundPlanPremierProduct = productsData.find(p => p.name === 'Seguro de Salud Plan Premier');
        if (foundPlanPremierProduct) {
          setPlanPremierProduct(foundPlanPremierProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundPlanPremierProduct.id,
          }));
        } else {
          setError('Error: El producto "Plan Premier" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
      }

      // Cargar clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        setError(prev => (prev ? prev + ' Y clientes.' : 'Error al cargar los clientes.'));
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

  // --- NUEVO EFECTO: Calcular la prima cuando cambian los campos relevantes ---
  useEffect(() => {
    const calculatePremium = () => {
      let basePremium = 500; // Prima base inicial para el Plan Premier
      let newValidationErrors: Record<string, string | null> = { ...validationErrors }; // Copiamos errores existentes

      // Ajuste por deducible (ejemplo simple: mayor deducible, menor prima base)
      // Puedes ajustar esta lógica según tus reglas de negocio
      if (formData.deductible >= 500 && formData.deductible <= 1000) {
        basePremium -= (formData.deductible - 500) * 0.1; // Resta $0.1 por cada dólar de deducible extra
        newValidationErrors.deductible = null;
      } else {
        newValidationErrors.deductible = 'El deducible debe estar entre $500 y $1,000.';
      }

      // Ajuste por número de dependientes
      if (formData.num_dependents >= 0 && formData.num_dependents <= 4) {
        basePremium += formData.num_dependents * 100; // Cada dependiente extra +$100
        newValidationErrors.num_dependents = null;
      } else {
        newValidationErrors.num_dependents = 'El número de dependientes debe ser entre 0 y 4.';
      }

      // Ajuste por frecuencia de pago (ejemplo: descuentos por pago anual)
      switch (formData.payment_frequency) {
        case 'quarterly':
          basePremium *= 0.98; // 2% de descuento por pago trimestral
          break;
        case 'annually':
          basePremium *= 0.95; // 5% de descuento por pago anual
          break;
        default:
          // Mensual, no hay descuento extra
          break;
      }

      // Validar que la prima calculada esté dentro del rango permitido (400-1500)
      if (basePremium < 400 || basePremium > 1500) {
        newValidationErrors.premium_amount = 'La prima calculada está fuera del rango permitido ($400 - $1,500). Ajusta los valores.';
      } else {
        newValidationErrors.premium_amount = null;
      }

      setCalculatedPremium(basePremium);
      setFormData(prev => ({ ...prev, premium_amount: basePremium })); // Actualizamos formData con la prima calculada
      setValidationErrors(newValidationErrors);
    };

    calculatePremium();
  }, [
    formData.deductible,
    formData.num_dependents,
    formData.payment_frequency,
  ]); // Recalcular cuando estos campos cambian

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
      // Si es premium_amount, no lo actualizamos directamente ya que ahora se calcula
      if (name === 'premium_amount') {
        return prev; // No hacemos nada, el useEffect se encarga
      }
      // Si es número de dependientes
      if (name === 'num_dependents') {
        const num = parseInt(value) || 0;
        const newDependentsArray = new Array(num).fill(null).map((_, i) => (
          (prev.dependents_details && prev.dependents_details[i]) || {
            name: '',
            birth_date: '',
            relationship: '',
          }
        ));
        return { ...prev, num_dependents: num, dependents_details: newDependentsArray };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      // dependents_details es obligatorio en CreatePlanPremierPolicyData, así que no necesitamos '|| []'
      const newDetails = [...prev.dependents_details!]; // <--- ¡SIN `|| []`!
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

    if (!user?.id) {
      setError('No se pudo obtener el ID del agente para asignar la póliza.');
      return;
    }

    // Validaciones Plan Premier (algunas ya las maneja el cálculo de prima)
    let hasErrors = false;
    const currentValidationErrors: Record<string, string | null> = {};

    if (formData.deductible < 500 || formData.deductible > 1000) {
      currentValidationErrors.deductible = 'El deducible debe estar entre $500 y $1,000.';
      hasErrors = true;
    }
    if (formData.coinsurance !== 10) {
      currentValidationErrors.coinsurance = 'El coaseguro para Plan Premier debe ser 10 %.';
      hasErrors = true;
    }
    if (formData.num_dependents < 0 || formData.num_dependents > 4) {
      currentValidationErrors.num_dependents = 'El número de dependientes debe ser entre 0 y 4.';
      hasErrors = true;
    }

    for (let i = 0; i < formData.num_dependents; i++) {
      const d = formData.dependents_details?.[i];
      if (!d || !d.name.trim() || !d.birth_date || !d.relationship.trim()) {
        setError(`Por favor completa todos los campos del dependiente ${i + 1}.`);
        return; // Detener el envío si faltan datos de dependientes
      }
    }

    // Si hay errores de validación en el cálculo de la prima, los mostramos
    if (validationErrors.premium_amount) {
      currentValidationErrors.premium_amount = validationErrors.premium_amount;
      hasErrors = true;
    }

    setValidationErrors(currentValidationErrors);

    if (hasErrors) {
      // Combina todos los errores en un solo mensaje si es necesario o muestra individualmente
      const generalErrorMessage = Object.values(currentValidationErrors).filter(Boolean).join(' | ');
      if (generalErrorMessage) {
        setError(generalErrorMessage);
      }
      return;
    }

    const policyNumber = generatePolicyNumber();
    const policyToCreate: CreatePlanPremierPolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: calculatedPremium, // Usamos la prima calculada
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      setFormData(prev => ({
        ...prev,
        policy_number: '',
        client_id: '',
        product_id: '',
        start_date: '',
        end_date: '',
        premium_amount: 0, // Resetear la prima
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        deductible: 500,
        coinsurance: 10,
        max_annual: 100000,
        has_dental_premium: true,
        has_vision_full: true,
        wellness_rebate: 50,
        num_dependents: 0,
        dependents_details: [],
      }));
      setCalculatedPremium(0); // Resetear prima calculada
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
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
        Crear Póliza – Plan Médico Premier
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
            value={planPremierProduct ? planPremierProduct.name : 'Cargando producto...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Plan Premier".
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
              Monto de la Prima Calculado ($)
            </label>
            {/* Input de la prima ahora es de solo lectura y muestra el valor calculado */}
            <input
              type="number"
              id="premium_amount"
              name="premium_amount"
              value={calculatedPremium.toFixed(2)}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
            />
            {validationErrors.premium_amount && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.premium_amount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              La prima se calcula automáticamente en función de otros campos.
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

        {/* --- Bloque de Prima Estimada (el que pediste integrar) --- */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>
        {/* --- FIN Bloque de Prima Estimada --- */}

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
            placeholder='Ej.: "Cobertura completa con reembolso gym incluido."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
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
          {validationErrors.deductible && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.deductible}</p>
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
            Para el Plan Premier, el coaseguro está fijado en 10 %.
          </p>
          {validationErrors.coinsurance && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.coinsurance}</p>
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
          {validationErrors.num_dependents && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.num_dependents}</p>
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