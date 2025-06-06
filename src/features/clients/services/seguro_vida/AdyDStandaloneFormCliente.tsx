import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend';

interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
}

/**
 * Formulario para el Seguro AD&D Independiente (Muerte Accidental y Desmembramiento).
 */
export default function AdyDStandaloneForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Este 'user' es el cliente autenticado

  // -----------------------------------------------------
  // Estado base + campos específicos AD&D Stand-Alone
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '', // Se llenará con el ID del usuario autenticado (cliente)
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 5, // Prima mínima para AD&D: $5 (este será un valor inicial para el cálculo)
    payment_frequency: 'monthly',
    status: 'pending', // <-- El estado siempre inicia como pendiente
    contract_details: '',
    // ↓ Campos propios AD&D Stand-Alone
    coverage_amount: 5000, // Rango: $5,000 – $100,000
    num_beneficiaries: 1, // 1–3
    beneficiaries: [] as Beneficiary[], // Aseguramos que inicie como un array vacío
    age_at_inscription: 18, // Rango: 18–65
    agent_id: '', // Agregado para almacenar el ID del agente seleccionado por el cliente
  });

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adndProduct, setAdndProduct] = useState<InsuranceProduct | null>(null);

  // Estado para errores de validación específicos por campo
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Efecto para cargar datos iniciales: productos y agentes
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      setValidationErrors({}); // Limpiar errores de validación al cargar

      // Cargar productos de seguro
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }

      if (productsData) {
        setProducts(productsData);
        const foundAdndProduct = productsData.find(
          (p) => p.name === 'Seguro por muerte accidental y desmembramiento (AD&D)'
        );
        if (foundAdndProduct) {
          setAdndProduct(foundAdndProduct);
          setFormData((prev) => ({
            ...prev,
            product_id: foundAdndProduct.id,
          }));
        } else {
          setError('Error: El producto "Seguro por muerte accidental y desmembramiento (AD&D)" no fue encontrado.');
        }
      }

      // Cargar agentes
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        setError((prev) => (prev ? prev + ' Y agentes.' : 'Error al cargar los agentes.'));
        setLoading(false);
        return;
      }
      if (agentsData) {
        setAgents(agentsData);
      }

      // Inicializar beneficiarios si no existen o están vacíos
      setFormData((prev) => {
        // Aseguramos que 'prev.beneficiaries' sea un array antes de acceder a su 'length'
        const currentBeneficiaries = prev.beneficiaries || [];
        return {
          ...prev,
          beneficiaries: currentBeneficiaries.length === 0 ? [{ name: '', relationship: '', percentage: 100 }] : currentBeneficiaries,
        };
      });

      setLoading(false);
    };

    fetchInitialData();
  }, []);

  // -----------------------------------------------------
  // Lógica de cálculo de prima estimada
  // -----------------------------------------------------
  const calculateEstimatedPremium = (
    coverageAmount: number,
    age: number,
    frequency: string
  ): number => {
    // ESTA ES UNA LÓGICA DE EJEMPLO. DEBES AJUSTARLA A LAS REGLAS DE NEGOCIO REALES DE TU SEGURO.
    let baseRate = 0.0005; // 0.05% de la cobertura
    if (age > 40) {
      baseRate += (age - 40) * 0.00001; // Aumenta la tasa por cada año después de los 40
    }
    if (age > 50) {
      baseRate += (age - 50) * 0.00002; // Aumento adicional si es mayor de 50
    }

    let rawPremium = coverageAmount * baseRate;

    // Ajuste por frecuencia de pago (asumiendo que rawPremium es la prima mensual)
    switch (frequency) {
      case 'monthly':
        return rawPremium;
      case 'quarterly':
        return rawPremium * 3;
      case 'annually':
        return rawPremium * 12;
      default:
        return rawPremium;
    }
  };

  // Memoizar el cálculo de la prima para evitar recálculos innecesarios
  const calculatedPremium = useMemo(() => {
    // Asegúrate de que los valores para el cálculo existan y sean válidos
    if (formData.coverage_amount && formData.age_at_inscription && formData.coverage_amount > 0 && formData.age_at_inscription > 0) {
      return calculateEstimatedPremium(
        formData.coverage_amount,
        formData.age_at_inscription,
        formData.payment_frequency
      );
    }
    return 0; // Retorna 0 si los valores no son válidos para el cálculo
  }, [formData.coverage_amount, formData.age_at_inscription, formData.payment_frequency]);

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = () => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let updatedValue: string | number | Beneficiary[] = value;

      if (['premium_amount', 'coverage_amount', 'age_at_inscription'].includes(name)) {
        const numValue = parseFloat(value);
        updatedValue = isNaN(numValue) ? 0 : numValue;
      }

      if (name === 'num_beneficiaries') {
        const num = parseInt(value, 10) || 1;
        // Limitar entre 1 y 3 beneficiarios
        if (num < 1 || num > 3) {
            return prev;
        }

        const arr: Beneficiary[] = [];
        const existingBeneficiaries = prev.beneficiaries || [];
        for (let i = 0; i < num; i++) {
          arr.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
        }
        return { ...prev, num_beneficiaries: num, beneficiaries: arr };
      }

      // Resto de campos
      return { ...prev, [name]: updatedValue };
    });

    // Limpiar error de validación específico si el usuario cambia el campo
    setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    if (name.startsWith('ben_')) { // Limpiar errores de beneficiarios específicos
        // Regex para capturar el índice del beneficiario
        const match = name.match(/ben_(?:name|rel|pct)_(\d+)/);
        if (match && match[1]) {
            setValidationErrors((prev) => ({ ...prev, [`beneficiary_${match[1]}`]: '' }));
        }
    }
  };

  const handleBeneficiaryChange = (
    idx: number,
    field: 'name' | 'relationship' | 'percentage',
    value: string
  ) => {
    setFormData((prev) => {
      const newBens = [...(prev.beneficiaries || [])];
      if (!newBens[idx]) {
        newBens[idx] = { name: '', relationship: '', percentage: 0 };
      }

      if (field === 'percentage') {
        const numValue = parseFloat(value);
        newBens[idx] = {
          ...newBens[idx],
          [field]: isNaN(numValue) ? 0 : numValue,
        };
      } else {
        newBens[idx] = {
          ...newBens[idx],
          [field]: value,
        };
      }
      return { ...prev, beneficiaries: newBens };
    });

    // Limpiar errores de validación relacionados con los beneficiarios al cambiar
    setValidationErrors((prev) => ({
      ...prev,
      [`beneficiary_${idx}`]: '',
      beneficiaries_percentage: '',
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({}); // Limpiar todos los errores de validación antes de la nueva validación

    const currentClientId = user?.id;

    if (!currentClientId) {
      setError('No se pudo identificar al cliente. Por favor, asegúrate de estar logueado.');
      return;
    }

    // Validaciones
    let errors: { [key: string]: string } = {};

    if (!formData.agent_id) {
      errors.agent_id = 'Por favor, selecciona un agente para la póliza.';
    }

    if (!formData.product_id) {
      setError('Error interno: El producto AD&D no está configurado. Contacta a soporte.');
      return; // Error crítico, detener envío
    }

    if (formData.age_at_inscription! < 18 || formData.age_at_inscription! > 65) {
      errors.age_at_inscription = 'La edad de inscripción debe estar entre 18 y 65 años.';
    }
    if (formData.coverage_amount! < 5000 || formData.coverage_amount! > 100000) {
      errors.coverage_amount = 'La cobertura debe estar entre $5,000 y $100,000.';
    }
    if (calculatedPremium < 5) { // Usar calculatedPremium para la validación de prima mínima
      errors.premium_amount = 'La prima estimada debe ser al menos $5.';
    }

    if (!formData.start_date) {
        errors.start_date = 'La fecha de inicio es obligatoria.';
    }
    if (!formData.end_date) {
        errors.end_date = 'La fecha de fin es obligatoria.';
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
        errors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }

    // Validación de beneficiarios
    if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
      errors.beneficiaries = 'Debe haber al menos un beneficiario.';
    } else {
      let sumaPct = 0;
      let hasBeneficiaryError = false;
      for (let i = 0; i < formData.beneficiaries.length; i++) {
        const b = formData.beneficiaries[i];
        if (!b.name.trim() || !b.relationship.trim() || b.percentage <= 0 || b.percentage > 100) {
          errors[`beneficiary_${i}`] = `Completa todos los datos del beneficiario ${i + 1} (nombre, parentesco y porcentaje > 0 y <= 100).`;
          hasBeneficiaryError = true;
        }
        sumaPct += b.percentage;
      }
      if (!hasBeneficiaryError && formData.beneficiaries.length > 0 && Math.abs(sumaPct - 100) > 0.01) { // Pequeña tolerancia para errores de flotantes
        errors.beneficiaries_percentage = 'La suma de porcentajes de todos los beneficiarios debe ser 100%.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Por favor, corrige los errores en el formulario.');
      // Scrollear al primer error para mejor UX
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: currentClientId,
      agent_id: formData.agent_id,
      status: 'pending',
      premium_amount: calculatedPremium, // **Importante:** Usar la prima calculada para el payload
      coverage_amount: Number(formData.coverage_amount),
      age_at_inscription: Number(formData.age_at_inscription),
      num_beneficiaries: Number(formData.num_beneficiaries),
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} enviada exitosamente para revisión.`);
      // Resetear formulario a su estado inicial para permitir nuevas solicitudes
      setFormData((prev) => ({
        ...prev,
        policy_number: '',
        client_id: '',
        product_id: adndProduct ? adndProduct.id : '',
        start_date: '',
        end_date: '',
        premium_amount: 5, // Valor inicial para el cálculo
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 5000,
        num_beneficiaries: 1,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
        age_at_inscription: 18,
        agent_id: '',
      }));
      setTimeout(() => {
        navigate('/client/dashboard/policies'); // Redirigir al dashboard del cliente
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para AD&D Stand-Alone…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Enviar Solicitud de Póliza – AD&D Independiente
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
            {agents.map((agent) => (
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
            value={adndProduct ? adndProduct.name : 'Cargando...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro por muerte accidental y desmembramiento (AD&D)".
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {validationErrors.end_date && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.end_date}</p>
            )}
          </div>
        </div>

        {/* Monto de Cobertura AD&D */}
        <div>
          <label
            htmlFor="coverage_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Monto de Cobertura AD&D ($)
          </label>
          <input
            type="number"
            id="coverage_amount"
            name="coverage_amount"
            value={formData.coverage_amount}
            onChange={handleChange}
            required
            min={5000}
            max={100000}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Monto entre $5,000 y $100,000.
          </p>
          {validationErrors.coverage_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.coverage_amount}</p>
          )}
        </div>

        {/* Edad al Inscribirse */}
        <div>
          <label
            htmlFor="age_at_inscription"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tu Edad al Inscribirte
          </label>
          <input
            type="number"
            id="age_at_inscription"
            name="age_at_inscription"
            value={formData.age_at_inscription}
            onChange={handleChange}
            required
            min={18}
            max={65}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Debes tener entre 18 y 65 años.
          </p>
          {validationErrors.age_at_inscription && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.age_at_inscription}</p>
          )}
        </div>

        {/* Frecuencia de Pago */}
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

        {/* --- INSERTA AQUÍ EL BLOQUE DE PRIMA ESTIMADA --- */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
          <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
        </div>
        {/* --- FIN DEL BLOQUE DE PRIMA ESTIMADA --- */}

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
            placeholder='Ej.: "Cobertura AD&D$50,000 con prima $25. Preferencia de pago por..."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce cualquier detalle o preferencia adicional para tu agente.
          </p>
        </div>

        {/* ———————————— Campos Específicos: AD&D Stand-Alone ———————————— */}

        {/* Número de Beneficiarios (1–3) */}
        <div>
          <label
            htmlFor="num_beneficiaries"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Beneficiarios (1–3)
          </label>
          <input
            type="number"
            id="num_beneficiaries"
            name="num_beneficiaries"
            value={formData.num_beneficiaries}
            onChange={handleChange}
            required
            min={1}
            max={3}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            La suma de porcentajes de todos los beneficiarios debe ser 100 %.
          </p>
          {validationErrors.beneficiaries && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.beneficiaries}</p>
          )}
          {validationErrors.beneficiaries_percentage && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.beneficiaries_percentage}</p>
          )}
        </div>

        {/* Campos dinámicos para cada beneficiario */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Detalles de Beneficiarios</h3>
          {formData.beneficiaries && formData.beneficiaries.map((ben, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg space-y-3"
            >
              <p className="font-medium text-gray-800">Beneficiario #{idx + 1}</p>
              <div>
                <label
                  htmlFor={`ben_name_${idx}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id={`ben_name_${idx}`}
                  name={`ben_name_${idx}`}
                  value={ben.name}
                  onChange={(e) =>
                    handleBeneficiaryChange(idx, 'name', e.target.value)
                  }
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {validationErrors[`beneficiary_${idx}`] && validationErrors[`beneficiary_${idx}`].includes('nombre') && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors[`beneficiary_${idx}`]}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`ben_rel_${idx}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Parentesco
                </label>
                <select
                  id={`ben_rel_${idx}`}
                  name={`ben_rel_${idx}`}
                  value={ben.relationship}
                  onChange={(e) =>
                    handleBeneficiaryChange(idx, 'relationship', e.target.value)
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
                {validationErrors[`beneficiary_${idx}`] && validationErrors[`beneficiary_${idx}`].includes('parentesco') && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors[`beneficiary_${idx}`]}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`ben_pct_${idx}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  % de Reparto
                </label>
                <input
                  type="number"
                  id={`ben_pct_${idx}`}
                  name={`ben_pct_${idx}`}
                  value={ben.percentage}
                  onChange={(e) =>
                    handleBeneficiaryChange(idx, 'percentage', e.target.value)
                  }
                  required
                  min={0.01} // Permite porcentajes muy pequeños pero mayores a 0
                  max={100}
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ingresa el porcentaje que recibirá este beneficiario.
                </p>
                {validationErrors[`beneficiary_${idx}`] && validationErrors[`beneficiary_${idx}`].includes('porcentaje') && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors[`beneficiary_${idx}`]}</p>
                )}
              </div>
            </div>
          ))}
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