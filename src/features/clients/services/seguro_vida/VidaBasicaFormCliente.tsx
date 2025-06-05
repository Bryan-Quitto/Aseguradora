import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
// Importa la nueva interfaz y función para agentes
import { AgentProfile, getAllAgentProfiles } from '../../../agents/hooks/agente_backend'; // Asegúrate que la ruta sea correcta

interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
}

/**
 * Formulario para el Seguro de Vida Básica.
 */
export default function VidaBasicaForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // user aquí es el cliente que llena el formulario

  // -----------------------------------------------------
  // Estado base + campos específicos Vida Básica
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    // 'agent_id' ahora contendrá el user_id del agente seleccionado por el cliente
    agent_id: '',
    client_id: '', // Este campo ahora contendrá el ID del cliente logueado que crea la póliza
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0, // Puede ir de 0 hasta 1× salario mensual (se valida en backend)
    payment_frequency: 'monthly',
    status: 'pending', // Fijo en 'pending' para el envío del cliente
    contract_details: '',
    // ↓ Campos propios Vida Básica
    coverage_amount: 0, // Monto de cobertura de vida
    ad_d_included: true, // AD&D está incluido al 100% de coverage_amount
    ad_d_coverage: 0, // Se iguala a coverage_amount automáticamente
    beneficiaries: [{ name: '', relationship: '', percentage: 100 }] as Beneficiary[], // Array dinámico (1–5) - Inicializar con un beneficiario por defecto
  });

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Aunque no se usa directamente en el select, es bueno mantenerlo si hay planes futuros.
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Para controlar cuántos beneficiarios mostrar (1–5)
  const [numBeneficiaries, setNumBeneficiaries] = useState<number>(1);
  const [vidaBasicaProduct, setVidaBasicaProduct] = useState<InsuranceProduct | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Cargar productos de seguro
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }

      if (productsData) {
        // --- ENCUENTRA Y ESTABLECE EL PRODUCTO ESPECÍFICO "Seguro de Vida Básico" ---
        const foundVidaBasicaProduct = productsData.find(p => p.name === 'Seguro de Vida Básico'); // <-- Asegúrate de que el nombre sea EXACTO
        if (foundVidaBasicaProduct) {
          setVidaBasicaProduct(foundVidaBasicaProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundVidaBasicaProduct.id, // Establece el ID en el formData
          }));
        } else {
          setError('Error: El producto "Seguro de Vida Básico" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
        // -------------------------------------------------------------------------
      }

      // Cargar agentes
      const { data: agentsData, error: agentsError } = await getAllAgentProfiles(); // Usar la nueva función
      if (agentsError) {
        console.error('Error al cargar agentes:', agentsError);
        setError(prev => (prev ? prev + ' Y agentes.' : 'Error al cargar los agentes.')); // Mensaje de error actualizado
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
    const { name, value } = e.target;

    setFormData(prev => {
      if (name === 'premium_amount') {
        const numValue = parseFloat(value);
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }
      if (name === 'coverage_amount') {
        const cov = parseFloat(value);
        // Igualar ad_d_coverage a coverage_amount (AD&D incluido al 100%)
        return { ...prev, coverage_amount: isNaN(cov) ? 0 : cov, ad_d_coverage: isNaN(cov) ? 0 : cov };
      }
      // Actualiza 'agent_id' con el ID del agente seleccionado
      if (name === 'agent_id') {
        return { ...prev, agent_id: value };
      }
      return { ...prev, [name]: value };
    });
  };

  // Cuando cambia el número de beneficiarios (1–5)
  const handleNumBeneficiariesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value);
    // Asegurarse de que num sea un número válido y dentro del rango (1-5)
    const newNum = isNaN(num) ? 1 : Math.max(1, Math.min(5, num));

    setNumBeneficiaries(newNum);

    setFormData(prev => {
      const existingBeneficiaries = prev.beneficiaries || [];
      const newBeneficiaries: Beneficiary[] = [];

      for (let i = 0; i < newNum; i++) {
        // Conservamos datos anteriores si existían, o inicializamos vacíos con 0% por defecto
        // La suma de porcentajes será validada al hacer submit
        newBeneficiaries.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
      }
      return { ...prev, beneficiaries: newBeneficiaries };
    });
  };

  // Cambios en datos de cada beneficiario
  const handleBeneficiaryChange = (
    idx: number,
    field: 'name' | 'relationship' | 'percentage',
    value: string
  ) => {
    setFormData(prev => {
      const newBens = [...(prev.beneficiaries || [])]; // Asegúrate de que es un array
      // Si el índice no existe (ej. se añadió un nuevo campo de beneficiario), inicialízalo.
      if (!newBens[idx]) {
        newBens[idx] = { name: '', relationship: '', percentage: 0 };
      }

      newBens[idx] = {
        ...newBens[idx],
        [field]: field === 'percentage' ? parseFloat(value) : value,
      };
      return { ...prev, beneficiaries: newBens };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // El ID del usuario logueado es el cliente que está creando la póliza
    if (!user?.id) {
      setError('No se pudo obtener el ID del cliente. Por favor, asegúrate de estar logueado.');
      return;
    }

    // Validar que se haya seleccionado un agente para la póliza
    if (!formData.agent_id) { // formData.agent_id ahora contiene el ID del agente seleccionado
      setError('Debes seleccionar un agente para esta póliza.');
      return;
    }

    // Validaciones Vida Básica
    // 1) coverage_amount > 0
    if (formData.coverage_amount! <= 0) {
      setError('Debes indicar un monto de cobertura mayor que 0.');
      return;
    }
    // 2) premium_amount >= 0 (se asume que backend valida tope máximo según salario)
    if (formData.premium_amount < 0) {
      setError('La prima no puede ser negativa.');
      return;
    }
    // 3) Validar beneficiarios: al menos 1, máximo 5, suma de porcentajes = 100%
    if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
      setError('Debe haber al menos un beneficiario.');
      return;
    }

    let sumaPct = 0;
    // Iterar sobre los beneficiarios mostrados actualmente (controlado por numBeneficiaries)
    // Esto asegura que solo se validan los que el usuario ha especificado que quiere.
    for (let i = 0; i < numBeneficiaries; i++) {
      const b = formData.beneficiaries[i];
      if (!b) { // Si por alguna razón el beneficiario no existe en formData.beneficiaries, es un error
        setError(`Faltan datos para el beneficiario ${i + 1}.`);
        return;
      }
      if (!b.name.trim() || !b.relationship.trim() || b.percentage <= 0) {
        setError(`Completa todos los datos y asegúrate que el porcentaje sea mayor que 0 para el beneficiario ${i + 1}.`);
        return;
      }
      sumaPct += b.percentage;
    }

    // Usar una tolerancia para la suma de porcentajes debido a la aritmética de punto flotante
    if (Math.abs(sumaPct - 100) > 0.01) {
      setError('La suma de porcentajes de todos los beneficiarios debe ser 100%.');
      return;
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      // El cliente logueado es el 'client_id' de la póliza
      client_id: user.id,
      // El agente seleccionado en el dropdown es el 'agent_id' de la póliza
      agent_id: formData.agent_id,
      // Asegurar que los números sean parseados correctamente, aunque los inputs ya son de tipo "number"
      premium_amount: Number(formData.premium_amount),
      coverage_amount: Number(formData.coverage_amount),
      ad_d_included: true, // Siempre true para Vida Básica
      ad_d_coverage: Number(formData.ad_d_coverage),
      status: 'pending', // El cliente solo puede enviar pólizas en estado pendiente
      // Solo enviar los beneficiarios que realmente se están mostrando/usando
      beneficiaries: formData.beneficiaries.slice(0, numBeneficiaries).map(b => ({
        ...b,
        percentage: Number(b.percentage) // Asegurarse de que el porcentaje sea numérico
      })),
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message || 'Error desconocido'}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente. Esperando aprobación del agente.`);
      // Resetear formulario a su estado inicial
      setFormData({
        policy_number: '',
        agent_id: '', // Resetear la selección del agente
        client_id: '',
        product_id: vidaBasicaProduct?.id || '', // Vuelve a establecer el product_id si está disponible
        start_date: '',
        end_date: '',
        premium_amount: 0,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 0,
        ad_d_included: true,
        ad_d_coverage: 0,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }], // Resetear a 1 beneficiario con 100%
      });
      setNumBeneficiaries(1); // Resetear el control de beneficiarios a 1

      setTimeout(() => {
        // Redirige al dashboard del cliente, o a una página de pólizas pendientes
        navigate('/client/dashboard/policies'); // Ajusta esta ruta si es necesario
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Vida Básica…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Propuesta de Póliza – Seguro de Vida Básica
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

        {/* Agente Designado para la póliza */}
        <div>
          <label
            htmlFor="agent_id" // Cambiado a agent_id para reflejar su propósito
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agente Designado para la Póliza
          </label>
          <select
            id="agent_id"
            name="agent_id"
            value={formData.agent_id ?? ''} // <-- MODIFICACIÓN CLAVE AQUÍ
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
          <p className="mt-1 text-xs text-gray-500">
            Selecciona el agente que quieres que gestione esta póliza.
          </p>
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
            value={vidaBasicaProduct ? vidaBasicaProduct.name : 'Cargando producto...'}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro de Vida Básico".
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
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Puede quedar en $0 (cubierto por la empresa) o más según la cobertura.
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
            Detalles del Contrato (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            value={formData.contract_details || ''}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Ej.: "Incluye cobertura básica para fallecimiento natural y accidental."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Vida Básica ———————————— */}

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
            min={1}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ingresa el monto que deseas cubrir (mínimo $1). AD&D se iguala a este monto.
          </p>
        </div>

        {/* Cobertura AD&D (incluida) */}
        <div>
          <label
            htmlFor="ad_d_coverage"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cobertura AD&D ($)
          </label>
          <input
            type="number"
            id="ad_d_coverage"
            name="ad_d_coverage"
            value={formData.ad_d_coverage}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            AD&D está incluido al 100 % de la cobertura de vida.
          </p>
        </div>

        {/* Número de Beneficiarios (1–5) */}
        <div>
          <label
            htmlFor="num_beneficiaries"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Beneficiarios (1–5)
          </label>
          <input
            type="number"
            id="num_beneficiaries"
            name="num_beneficiaries"
            value={numBeneficiaries}
            onChange={handleNumBeneficiariesChange}
            required
            min={1}
            max={5}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            La suma de porcentajes de todos los beneficiarios debe ser 100 %.
          </p>
        </div>

        {/* Campos dinámicos para cada beneficiario */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Beneficiarios</h3>
          {/* Mapear solo hasta numBeneficiaries para renderizar los campos */}
          {formData.beneficiaries && formData.beneficiaries.slice(0, numBeneficiaries).map((ben, idx) => (
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
                  min={0.01}
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