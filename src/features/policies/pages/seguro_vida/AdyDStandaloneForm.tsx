import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../../policies/policy_management';
import { ClientProfile, getAllClientProfiles } from '../../../clients/hooks/cliente_backend';

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
  const { user } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos específicos AD&D Stand-Alone
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 5,    // Prima mínima para AD&D: $5
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    // ↓ Campos propios AD&D Stand-Alone
    coverage_amount: 5000,  // Rango: $5,000 – $100,000
    numBeneficiaries: 1,    // 1–3
    beneficiaries: [] as Beneficiary[],
    age_at_inscription: 18, // Rango: 18–65
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Cargar productos (solo AD&D Stand-Alone)
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }
      if (productsData) {
        setProducts(productsData);
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

      // Inicializar 1 beneficiario vacío
      setFormData(prev => ({
        ...prev,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
      }));

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
    // Eliminamos 'checked' de la desestructuración aquí
    const { name, value, type } = e.target;
    setFormData(prev => {
      // Prima
      if (name === 'premium_amount') {
        return { ...prev, [name]: parseFloat(value) };
      }
      // Coverage Amount
      if (name === 'coverage_amount') {
        return { ...prev, coverage_amount: parseFloat(value) };
      }
      // Edad al inscribirse
      if (name === 'age_at_inscription') {
        return { ...prev, age_at_inscription: parseInt(value) };
      }
      // Número de beneficiarios
      // En este formulario no veo un campo 'ad_d_included', así que solo ajusto la desestructuración.
      // Si en el código completo de este formulario sí tienes un checkbox que usa handleChange,
      // deberías aplicar la protección de tipo para 'checked' aquí también.
      if (name === 'numBeneficiaries') {
        const num = parseInt(value) || 1;
        if (num < 1 || num > 3) return prev;
        const arr: Beneficiary[] = [];
        // Asegúrate de que prev.beneficiaries existe antes de intentar acceder a sus elementos
        const existingBeneficiaries = prev.beneficiaries || []; // Agregado para seguridad
        for (let i = 0; i < num; i++) {
          arr.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
        }
        return { ...prev, numBeneficiaries: num, beneficiaries: arr };
      }
      // Resto (client_id, product_id, etc.)
      return { ...prev, [name]: value };
    });
  };

  // Cambios en datos de cada beneficiario
  const handleBeneficiaryChange = (
    idx: number,
    field: 'name' | 'relationship' | 'percentage',
    value: string
  ) => {
    setFormData(prev => {
      // Asegúrate de que prev.beneficiaries exista antes de copiarlo
      const newBens = [...(prev.beneficiaries || [])];
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

    if (!user?.id) {
      setError('No se pudo obtener el ID del agente.');
      return;
    }

    // Validaciones AD&D Stand-Alone
    // 1) Edad entre 18 y 65
    if (formData.age_at_inscription! < 18 || formData.age_at_inscription! > 65) { // Usar '!'
        setError('La edad de inscripción debe estar entre 18 y 65 años.');
        return;
      }
      // 2) coverage_amount entre 5000 y 100000
      if (formData.coverage_amount! < 5000 || formData.coverage_amount! > 100000) { // Usar '!'
        setError('La cobertura debe estar entre $5,000 y $100,000.');
        return;
      }
      // 3) premium_amount ≥ 5 y ≤ 50 (se asume relación premium/cobertura)
      if (formData.premium_amount! < 5) { // Usar '!'
        setError('La prima mínima es $5.');
        return;
      }
      // 4) Beneficiarios (1–3) y suma porcentajes = 100%
      // Asegúrate de que formData.beneficiaries existe antes de acceder a .length
      if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
        setError('Debe haber al menos un beneficiario.');
        return;
      }
      let sumaPct = 0;
      for (let i = 0; i < formData.beneficiaries.length; i++) {
        const b = formData.beneficiaries[i]; // Aquí 'b' ya es seguro que existe si beneficiaries existe y length > 0
        if (!b.name.trim() || !b.relationship.trim() || b.percentage <= 0) {
          setError(`Completa todos los datos del beneficiario ${i + 1}.`);
          return;
        }
        sumaPct += b.percentage;
      }
      if (Math.abs(sumaPct - 100) > 0.01) {
        setError('La suma de porcentajes de todos los beneficiarios debe ser 100%.');
        return;
      }

    const policyNumber = generatePolicyNumber();
    const payload: any = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: Number(formData.premium_amount),
      coverage_amount: formData.coverage_amount,
      beneficiaries: formData.beneficiaries,
      age_at_inscription: formData.age_at_inscription,
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Resetear
      setFormData(prev => ({
        ...prev,
        policy_number: '',
        client_id: '',
        product_id: '',
        start_date: '',
        end_date: '',
        premium_amount: 5,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 5000,
        numBeneficiaries: 1,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
        age_at_inscription: 18,
      }));
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
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
        Crear Póliza – AD&D Independiente
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
              min="5"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Rango permitido: $5 – $50 mensuales (dependiendo de cobertura).
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
            Edad al Inscribirse
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
            Rango válido: 18 – 65 años.
          </p>
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
            placeholder='Ej.: "Cobertura AD&D\$50,000 con prima $25."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
          </p>
        </div>

        {/* ———————————— Campos Específicos: AD&D Stand-Alone ———————————— */}

        {/* Monto de Cobertura AD&D */}
        <div>
          <label
            htmlFor="coverage_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cobertura AD&D ($)
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
        </div>

        {/* Número de Beneficiarios (1–3) */}
        <div>
          <label
            htmlFor="numBeneficiaries"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Beneficiarios (1–3)
          </label>
          <input
            type="number"
            id="numBeneficiaries"
            name="numBeneficiaries"
            value={formData.numBeneficiaries}
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
          <h3 className="text-lg font-medium text-gray-700">Beneficiarios</h3>
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
                  step="0.1"
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