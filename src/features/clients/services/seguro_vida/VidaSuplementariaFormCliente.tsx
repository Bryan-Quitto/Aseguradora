import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  createPolicy,
  getActiveInsuranceProducts,
} from '../../../policies/policy_management';
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend';

interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
}

/**
 * Formulario para el Seguro de Vida Suplementaria (para que lo use el Cliente).
 */
export default function VidaSuplementariaForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos específicos Vida Suplementaria
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '', // Se establecerá con el ID del usuario autenticado
    agent_id: '', // Ahora el cliente seleccionará un agente
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 20, // Prima mínima ($20 equivale a cobertura de $10,000)
    payment_frequency: 'monthly',
    status: 'pending', // Siempre 'pending' al crear el cliente, el agente lo cambia
    contract_details: '',
    // ↓ Campos propios Vida Suplementaria
    coverage_amount: 10000, // Rango: $10,000 – (5× salario mensual), se valida backend
    ad_d_included: false, // AD&D es opcional
    ad_d_coverage: 0, // Si ad_d_included=true, puede llegarse hasta 2×coverage_amount
    num_beneficiaries: 1, // 1–3
    beneficiaries: [] as Beneficiary[],
    age_at_inscription: 18, // Rango: 18–60
  });

  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vidaSuplementariaProduct, setVidaSuplementariaProduct] = useState<InsuranceProduct | null>(null);

  // NUEVO: Estado para almacenar errores de validación de campos específicos
  const [validationErrors, setValidationErrors] = useState<{
    premium_amount?: string;
    coverage_amount?: string;
    ad_d_coverage?: string;
    age_at_inscription?: string;
    beneficiaries?: string;
    agent_id?: string; // Nuevo para el agente
  }>({});

  // Lógica para calcular la prima estimada
  const calculatePremium = () => {
    // Estas son reglas de ejemplo, ajusta según la lógica de tu negocio.
    // Podrías tener una tabla de primas por rango de edad, monto, etc.
    let basePremium = 20; // Prima base para $10,000 de cobertura

    // Ajuste por monto de cobertura (ejemplo: cada $10,000 adicionales, +$5)
    if (formData.coverage_amount && formData.coverage_amount > 10000) {
      basePremium += Math.floor((formData.coverage_amount - 10000) / 10000) * 5;
    }

    // Ajuste por AD&D (ejemplo: 0.05% del monto de AD&D)
    if (formData.ad_d_included && formData.ad_d_coverage) {
      basePremium += formData.ad_d_coverage * 0.0005;
    }

    // Ajuste por edad (ejemplo: +$1 por cada año mayor a 30)
    if (formData.age_at_inscription && formData.age_at_inscription > 30) {
      basePremium += (formData.age_at_inscription - 30) * 1;
    }

    // Convertir a frecuencia de pago (ejemplo: trimestral = mensual * 3, anual = mensual * 12)
    let finalPremium = basePremium;
    if (formData.payment_frequency === 'quarterly') {
      finalPremium = basePremium * 3;
    } else if (formData.payment_frequency === 'annually') {
      finalPremium = basePremium * 12;
    }

    return finalPremium;
  };

  const [calculatedPremium, setCalculatedPremium] = useState<number>(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setError('Debes iniciar sesión para crear una póliza. Redireccionando...');
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Cargar productos
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }
      if (productsData) {
        const foundVidaSuplementariaProduct = productsData.find(p => p.name === 'Seguro de Vida Suplementario');
        if (foundVidaSuplementariaProduct) {
          setVidaSuplementariaProduct(foundVidaSuplementariaProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundVidaSuplementariaProduct.id,
            client_id: user.id,
          }));
        } else {
          setError('Error: El producto "Seguro de Vida Suplementario" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
      }

      // <-- NUEVO: Cargar agentes
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles();
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        setError('Error al cargar la lista de agentes.');
        setLoading(false);
        return;
      }
      if (agentsData) {
        setAgents(agentsData);
      }

      // Inicializar 1 beneficiario vacío si no hay ninguno
      setFormData(prev => {
        if (!prev.beneficiaries || prev.beneficiaries.length === 0) {
          return {
            ...prev,
            beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
          };
        }
        return prev;
      });

      setLoading(false);
    };

    fetchInitialData();
  }, [user, authLoading, navigate]);

  // Efecto para recalcular la prima cuando cambian los campos relevantes
  useEffect(() => {
    setCalculatedPremium(calculatePremium());
  }, [formData.coverage_amount, formData.ad_d_included, formData.ad_d_coverage, formData.age_at_inscription, formData.payment_frequency]);


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

    setFormData(prev => {
      let updatedValue: string | number | boolean = value;

      if (name === 'premium_amount' || name === 'coverage_amount' || name === 'ad_d_coverage') {
        updatedValue = parseFloat(value);
      } else if (name === 'age_at_inscription' || name === 'num_beneficiaries') {
        updatedValue = parseInt(value);
      } else if (name === 'ad_d_included') {
        updatedValue = (e.target as HTMLInputElement).checked;
        if (!updatedValue) {
          // Si desmarcas AD&D, reinicia la cobertura a 0
          return { ...prev, ad_d_included: false, ad_d_coverage: 0 };
        }
      }

      // Manejo específico para num_beneficiaries para asegurar que siempre haya al menos 1
      if (name === 'num_beneficiaries') {
        const num = parseInt(value);
        const validNum = isNaN(num) ? 1 : Math.max(1, Math.min(3, num));

        const arr: Beneficiary[] = [];
        const existingBeneficiaries = prev.beneficiaries || [];

        for (let i = 0; i < validNum; i++) {
          arr.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
        }
        return { ...prev, num_beneficiaries: validNum, beneficiaries: arr };
      }

      // Limpia el error de validación para el campo que está siendo editado
      setValidationErrors(prevErrors => ({
        ...prevErrors,
        [name]: undefined,
        // Limpia el error de prima si se cambia un valor que la afecta
        ...(name === 'coverage_amount' || name === 'ad_d_coverage' || name === 'age_at_inscription' || name === 'payment_frequency' ? { premium_amount: undefined } : {})
      }));


      // Aseguramos que agent_id se actualice correctamente, entre otros campos
      return { ...prev, [name]: updatedValue };
    });
  };


  const handleBeneficiaryChange = (
    idx: number,
    field: 'name' | 'relationship' | 'percentage',
    value: string
  ) => {
    setFormData(prev => {
      const newBens = [...(prev.beneficiaries || [])];
      if (!newBens[idx]) {
        newBens[idx] = { name: '', relationship: '', percentage: 0 };
      }

      const parsedValue = field === 'percentage' ? parseFloat(value) : value;

      newBens[idx] = {
        ...newBens[idx],
        [field]: parsedValue,
      };

      // Limpia el error de beneficiarios cuando se editan
      setValidationErrors(prevErrors => ({
        ...prevErrors,
        beneficiaries: undefined,
      }));

      return { ...prev, beneficiaries: newBens };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({}); // Limpiar errores de validación al intentar enviar

    if (!user?.id) {
      setError('No se pudo obtener el ID del cliente. Por favor, inicia sesión.');
      return;
    }

    let currentErrors: { [key: string]: string } = {};

    // NUEVA VALIDACIÓN: Agente seleccionado
    if (!formData.agent_id) {
      currentErrors.agent_id = 'Por favor, selecciona un agente para tu póliza.';
    }

    // Validaciones existentes
    if (formData.age_at_inscription! < 18 || formData.age_at_inscription! > 60) {
      currentErrors.age_at_inscription = 'La edad de inscripción debe estar entre 18 y 60 años.';
    }
    if (formData.coverage_amount! < 10000) {
      currentErrors.coverage_amount = 'La cobertura mínima es $10,000.';
    }
    if (formData.ad_d_included) {
      if (formData.ad_d_coverage === undefined || formData.ad_d_coverage < 1 || formData.ad_d_coverage > formData.coverage_amount! * 2) {
        currentErrors.ad_d_coverage = `Si incluye AD&D, su cobertura debe estar entre $1 y $${(formData.coverage_amount!) * 2}.`;
      }
    }

    // Validar que la prima calculada sea al menos la mínima
    if (calculatedPremium < 20) {
      currentErrors.premium_amount = 'La prima calculada debe ser al menos $20.';
    }

    if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
      currentErrors.beneficiaries = 'Debe haber al menos un beneficiario.';
    } else {
      if (formData.beneficiaries.length !== formData.num_beneficiaries) {
        currentErrors.beneficiaries = 'Hay un desajuste entre el número de beneficiarios ingresados y el número declarado.';
      }

      let sumaPct = 0;
      for (let i = 0; i < formData.beneficiaries.length; i++) {
        const b = formData.beneficiaries[i];
        if (!b.name.trim() || !b.relationship.trim() || b.percentage <= 0) {
          currentErrors.beneficiaries = `Completa todos los datos del beneficiario ${i + 1}.`;
          break;
        }
        sumaPct += b.percentage;
      }
      if (Object.keys(currentErrors).length === 0 && parseFloat(sumaPct.toFixed(2)) !== 100) {
        currentErrors.beneficiaries = 'La suma de porcentajes de todos los beneficiarios debe ser 100%.';
      }
    }

    // Si hay errores, actualiza el estado y detiene el envío
    if (Object.keys(currentErrors).length > 0) {
      setValidationErrors(currentErrors);
      setError('Por favor, corrige los errores en el formulario.');
      return;
    }

    const policyNumber = generatePolicyNumber();

    const payload: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      client_id: user.id,
      status: 'pending',
      premium_amount: Number(calculatedPremium.toFixed(2)), // Usa la prima calculada
      coverage_amount: formData.coverage_amount,
      ad_d_included: formData.ad_d_included,
      ad_d_coverage: formData.ad_d_included ? formData.ad_d_coverage : 0,
      beneficiaries: formData.beneficiaries,
      age_at_inscription: formData.age_at_inscription,
      agent_id: formData.agent_id,
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente. Será revisada por el agente seleccionado.`);
      // Resetear formulario a valores iniciales
      setFormData(prev => ({
        ...prev,
        policy_number: '',
        product_id: vidaSuplementariaProduct?.id || '',
        client_id: user.id,
        agent_id: '',
        start_date: '',
        end_date: '',
        premium_amount: 20, // Se restablece a la base, el cálculo se encargará
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 10000,
        ad_d_included: false,
        ad_d_coverage: 0,
        num_beneficiaries: 1,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
        age_at_inscription: 18,
      }));
      setTimeout(() => {
        navigate('/client/dashboard/policies');
      }, 2000);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Vida Suplementaria…</p>
      </div>
    );
  }

  if (error && error.includes('iniciar sesión')) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Solicitar Póliza – Seguro de Vida Suplementaria
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
            htmlFor="client_display"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cliente
          </label>
          <input
            type="text"
            id="client_display"
            name="client_display"
            value={user?.email || 'Cargando...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Esta solicitud de póliza se creará para tu cuenta ({user?.email || 'cliente actual'}).
          </p>
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
            value={vidaSuplementariaProduct ? vidaSuplementariaProduct.name : 'Cargando producto...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro de Vida Suplementario".
          </p>
        </div>

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
            <p className="mt-1 text-xs text-red-500">{validationErrors.agent_id}</p>
          )}
          {agents.length === 0 && !loading && !error && (
            <p className="mt-1 text-xs text-red-500">
              No hay agentes disponibles para seleccionar. Contacta al soporte.
            </p>
          )}
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

        {/* Monto de la Prima y Frecuencia (Se muestra el calculado, el input se oculta o se usa para fines informativos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bloque de Prima Estimada (NUEVO) */}
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Prima Estimada:</h3>
            <p className="text-2xl font-bold text-blue-900">${calculatedPremium.toFixed(2)} / {formData.payment_frequency}</p>
            {validationErrors.premium_amount && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Este valor es una estimación. La prima final puede variar tras la revisión del agente.
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

        {/* Edad al Inscribirse */}
        <div>
          <label
            htmlFor="age_at_inscription"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Edad del Asegurado al Inscribirse
          </label>
          <input
            type="number"
            id="age_at_inscription"
            name="age_at_inscription"
            value={formData.age_at_inscription}
            onChange={handleChange}
            required
            min={18}
            max={60}
            step="1"
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.age_at_inscription ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango válido para la inscripción: 18 – 60 años.
          </p>
          {validationErrors.age_at_inscription && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.age_at_inscription}</p>
          )}
        </div>

        {/* Detalles del Contrato */}
        <div>
          <label
            htmlFor="contract_details"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Comentarios o Detalles Adicionales (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Solicito cobertura adicional de AD&D según lo conversado."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce cualquier detalle o comentario que desees que el agente considere.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Vida Suplementaria ———————————— */}

        {/* Monto de Cobertura de Vida */}
        <div>
          <label
            htmlFor="coverage_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Monto de Cobertura de Vida ($)
          </label>
          <input
            type="number"
            id="coverage_amount"
            name="coverage_amount"
            value={formData.coverage_amount}
            onChange={handleChange}
            required
            min={10000}
            step="1"
            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.coverage_amount ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Monto mínimo: $10,000 (prima mínima $20). El monto final puede depender de su salario y aprobación médica.
          </p>
          {validationErrors.coverage_amount && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.coverage_amount}</p>
          )}
        </div>

        {/* Checkbox AD&D opcional */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="ad_d_included"
            name="ad_d_included"
            checked={formData.ad_d_included}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="ad_d_included"
            className="ml-2 block text-sm text-gray-700"
          >
            Incluir Cobertura AD&D (Muerte y Desmembramiento Accidental, Opcional)
          </label>
        </div>

        {/* Si AD&D está marcado, mostrar input de ad_d_coverage */}
        {formData.ad_d_included && (
          <div>
            <label
              htmlFor="ad_d_coverage"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Monto de Cobertura AD&D ($)
            </label>
            <input
              type="number"
              id="ad_d_coverage"
              name="ad_d_coverage"
              value={formData.ad_d_coverage}
              onChange={handleChange}
              required={formData.ad_d_included}
              min={1}
              max={formData.coverage_amount! * 2}
              step="1"
              className={`mt-1 block w-full px-3 py-2 border ${validationErrors.ad_d_coverage ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Si incluyes AD&D, su cobertura puede ascender hasta 2 veces tu monto de vida.
            </p>
            {validationErrors.ad_d_coverage && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.ad_d_coverage}</p>
            )}
          </div>
        )}

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
        </div>

        {/* Campos dinámicos para cada beneficiario */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Información de los Beneficiarios</h3>
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
                  onChange={e =>
                    handleBeneficiaryChange(idx, 'name', e.target.value)
                  }
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
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
                  onChange={e =>
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
                  onChange={e =>
                    handleBeneficiaryChange(idx, 'percentage', e.target.value)
                  }
                  required
                  min={1}
                  max={100}
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ingresa el porcentaje que recibirá este beneficiario.
                </p>
              </div>
            </div>
          ))}
          {validationErrors.beneficiaries && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.beneficiaries}</p>
          )}
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