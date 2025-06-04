import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import {
  CreatePolicyData,
  InsuranceProduct,
  CreateVidaSuplementariaPolicyData,
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
 * Formulario para el Seguro de Vida Suplementaria.
 */
export default function VidaSuplementariaForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos específicos Vida Suplementaria
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 20, // Prima mínima ($20 equivale a cobertura de $10,000)
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    // ↓ Campos propios Vida Suplementaria
    coverage_amount: 10000, // Rango: $10,000 – (5× salario mensual), se valida backend
    ad_d_included: false, // AD&D es opcional
    ad_d_coverage: 0, // Si ad_d_included=true, puede llegarse hasta 2×coverage_amount
    num_beneficiaries: 1, // 1–3
    beneficiaries: [] as Beneficiary[],
    age_at_inscription: 18, // Rango: 18–60
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vidaSuplementariaProduct, setVidaSuplementariaProduct] = useState<InsuranceProduct | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Cargar productos (solo Vida Suplementaria)
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }
      if (productsData) {
        // --- ENCUENTRA Y ESTABLECE EL PRODUCTO ESPECÍFICO "Seguro de Vida Suplementario" ---
        const foundVidaSuplementariaProduct = productsData.find(p => p.name === 'Seguro de Vida Suplementario'); // <-- Asegúrate de que el nombre sea EXACTO
        if (foundVidaSuplementariaProduct) {
          setVidaSuplementariaProduct(foundVidaSuplementariaProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundVidaSuplementariaProduct.id, // Establece el ID en el formData
          }));
        } else {
          setError('Error: El producto "Seguro de Vida Suplementario" no fue encontrado. Asegúrate de que existe en la base de datos.');
        }
        // -------------------------------------------------------------------------------------
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
      // Prima
      if (name === 'premium_amount') {
        return { ...prev, [name]: parseFloat(value) };
      }
      // Coverage Amount
      if (name === 'coverage_amount') {
        return { ...prev, coverage_amount: parseFloat(value) };
      }
      // Age at inscription
      if (name === 'age_at_inscription') {
        return { ...prev, age_at_inscription: parseInt(value) };
      }
      // Checkbox AD&D
      if (name === 'ad_d_included') {
        const isCheckbox = (target: EventTarget): target is HTMLInputElement =>
          (target as HTMLInputElement).type === 'checkbox';

        if (isCheckbox(e.target)) {
          // Si se desmarca, asegura que ad_d_coverage se establezca a 0
          return { ...prev, ad_d_included: e.target.checked, ad_d_coverage: e.target.checked ? (prev.ad_d_coverage || 0) : 0 };
        }
        return prev;
      }
      // Coverage AD&D (solo si ad_d_included = true)
      if (name === 'ad_d_coverage') {
        return { ...prev, ad_d_coverage: parseFloat(value) };
      }
      // Número de beneficiarios
      if (name === 'num_beneficiaries') { // Corregido: 'numBeneficiaries' a 'num_beneficiaries' para coincidir con el estado
        const num = parseInt(value);
        // Validar que el número esté entre 1 y 3. Si no es un número válido, se mantiene el valor actual o se fuerza a 1.
        const validNum = isNaN(num) ? 1 : Math.max(1, Math.min(3, num));

        const arr: Beneficiary[] = [];
        const existingBeneficiaries = prev.beneficiaries || [];

        for (let i = 0; i < validNum; i++) {
          arr.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
        }
        return { ...prev, num_beneficiaries: validNum, beneficiaries: arr };
      }
      // Resto de inputs (client_id, product_id, start_date, etc.)
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
      const newBens = [...(prev.beneficiaries || [])];
      // Asegúrate de que el beneficiario en el índice exista
      if (!newBens[idx]) {
        newBens[idx] = { name: '', relationship: '', percentage: 0 };
      }

      // Manejo específico para el porcentaje, asegurando que sea un número válido y con dos decimales
      const parsedValue = field === 'percentage' ? parseFloat(value) : value;

      newBens[idx] = {
        ...newBens[idx],
        [field]: parsedValue,
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

    // Validaciones Vida Suplementaria
    // 1) Edad entre 18 y 60
    if (formData.age_at_inscription! < 18 || formData.age_at_inscription! > 60) {
      setError('La edad de inscripción debe estar entre 18 y 60 años.');
      return;
    }
    // 2) coverage_amount >= 10000
    if (formData.coverage_amount! < 10000) {
      setError('La cobertura mínima es $10,000.');
      return;
    }
    // (Si ad_d_included): ad_d_coverage <= 2×coverage_amount
    if (formData.ad_d_included) {
      if (formData.ad_d_coverage === undefined || formData.ad_d_coverage < 1 || formData.ad_d_coverage > formData.coverage_amount! * 2) {
        setError(
          `Si incluye AD&D, su cobertura debe estar entre $1 y $${(formData.coverage_amount!) * 2}.`
        );
        return;
      }
    }
    // 3) premium_amount >= 20 (prima mínima) y backend validará tope máximo
    if (formData.premium_amount < 20) {
      setError('La prima mínima es $20.');
      return;
    }
    // 4) Validar beneficiarios: al menos 1, máximo 3, suma porcentajes = 100%
    if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
      setError('Debe haber al menos un beneficiario.');
      return;
    }

    // Validar que el número de beneficiarios en el estado sea consistente con lo que se está mostrando
    if (formData.beneficiaries.length !== formData.num_beneficiaries) {
      setError('Hay un desajuste entre el número de beneficiarios ingresados y el número declarado.');
      return;
    }

    let sumaPct = 0;
    for (let i = 0; i < formData.beneficiaries.length; i++) {
      const b = formData.beneficiaries[i];
      if (!b.name.trim() || !b.relationship.trim() || b.percentage <= 0) {
        setError(`Completa todos los datos del beneficiario ${i + 1}.`);
        return;
      }
      sumaPct += b.percentage;
    }
    // Corregido: Usar toFixed para la comparación de suma de porcentajes
    if (parseFloat(sumaPct.toFixed(2)) !== 100) {
      setError('La suma de porcentajes de todos los beneficiarios debe ser 100%.');
      return;
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePolicyData = { // Usar el tipo CreatePolicyData para el payload
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: Number(formData.premium_amount),
      coverage_amount: formData.coverage_amount,
      ad_d_included: formData.ad_d_included,
      ad_d_coverage: formData.ad_d_included ? formData.ad_d_coverage : 0,
      beneficiaries: formData.beneficiaries,
      age_at_inscription: formData.age_at_inscription,
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Resetear formulario a valores iniciales
      setFormData(prev => ({
        ...prev,
        policy_number: '',
        client_id: '',
        product_id: vidaSuplementariaProduct?.id || '', // Asegura que el product_id se mantenga si el producto ya está cargado
        start_date: '',
        end_date: '',
        premium_amount: 20,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 10000,
        ad_d_included: false,
        ad_d_coverage: 0,
        num_beneficiaries: 1, // Corregido el nombre de la propiedad
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
        <p className="text-blue-600 text-xl">Cargando datos para Vida Suplementaria…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Crear Póliza – Seguro de Vida Suplementaria
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
            // Muestra el nombre del producto si ya se cargó, o un mensaje de carga
            value={vidaSuplementariaProduct ? vidaSuplementariaProduct.name : 'Cargando producto...'}
            readOnly // ¡Importante! Hace que el campo sea de solo lectura
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro de Vida Suplementario".
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
              min="20"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              La prima mínima es $20 (cobertura $10,000).
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
            max={60}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Rango válido: 18 – 60 años.
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
            placeholder='Ej.: "Cobertura adicional de AD&D opcional hasta 2× el monto de vida."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Monto mínimo: $10,000 (prima mínima $20). Tope depende de salario y aprobación médica.
          </p>
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
            Incluir Cobertura AD&D (Opcional)
          </label>
        </div>

        {/* Si AD&D está marcado, mostrar input de ad_d_coverage */}
        {formData.ad_d_included && (
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
              onChange={handleChange}
              required={formData.ad_d_included}
              min={1}
              max={formData.coverage_amount! * 2}
              step="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Si incluyes AD&D, su cobertura puede ascender hasta 2× tu monto de vida.
            </p>
          </div>
        )}

        {/* Número de Beneficiarios (1–3) */}
        <div>
          <label
            htmlFor="num_beneficiaries" // Corregido: 'numBeneficiaries' a 'num_beneficiaries'
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Beneficiarios (1–3)
          </label>
          <input
            type="number"
            id="num_beneficiaries" // Corregido: 'numBeneficiaries' a 'num_beneficiaries'
            name="num_beneficiaries" // Corregido: 'numBeneficiaries' a 'num_beneficiaries'
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
                  step="0.01" // Asegura que se permitan dos decimales
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