import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from 'react';
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

// Interfaz para los errores de validación
interface FormErrors {
  client_id?: string;
  product_id?: string;
  start_date?: string;
  end_date?: string;
  premium_amount?: string;
  payment_frequency?: string;
  coverage_amount?: string;
  num_beneficiaries?: string;
  age_at_inscription?: string;
  beneficiaries?: string;
  general?: string;
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
    premium_amount: 5, // Prima inicial, el usuario puede ajustarla, pero con un mínimo
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    // ↓ Campos propios AD&D Stand-Alone
    coverage_amount: 5000, // Rango: $5,000 – $100,000
    num_beneficiaries: 1, // 1–3
    beneficiaries: [] as Beneficiary[],
    age_at_inscription: 18, // Rango: 18–65
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adndProduct, setAdndProduct] = useState<InsuranceProduct | null>(null);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({}); // Nuevo estado para errores de validación

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

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
          setError(
            'Error: El producto "Seguro por muerte accidental y desmembramiento (AD&D)" no fue encontrado.'
          );
        }
      }

      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        setError((prev) => (prev ? prev + ' Y clientes.' : 'Error al cargar los clientes.'));
        setLoading(false);
        return;
      }
      if (clientsData) {
        setClients(clientsData);
      }

      setFormData((prev) => ({
        ...prev,
        beneficiaries: [{ name: '', relationship: '', percentage: 100 }],
      }));

      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const generatePolicyNumber = () => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const calculateEstimatedPremium = (coverage: number, age: number, frequency: string): number => {
    console.log('--- Calculando Prima Estimada ---');
    console.log('Cobertura (coverage):', coverage);
    console.log('Edad (age):', age);
    console.log('Frecuencia (frequency):', frequency);

    let baseRate = 0.03; // <-- INCREASED THIS VALUE SIGNIFICANTLY
    let ageFactor = 1;

    if (age > 40 && age <= 50) {
      ageFactor = 1.2;
    } else if (age > 50 && age <= 60) {
      ageFactor = 1.5;
    } else if (age > 60) {
      ageFactor = 2.0;
    }

    let premium = (coverage * baseRate * ageFactor) / 12; // Prima mensual inicial

    switch (frequency) {
      case 'quarterly':
        premium *= 3;
        break;
      case 'annually':
        premium *= 12;
        break;
      case 'monthly':
      default:
        break;
    }

    const finalPremium = Math.max(premium, 5);
    console.log('Prima Calculada:', finalPremium);
    console.log('---------------------------------');
    return finalPremium;
  };
  const calculatedPremium = useMemo(() => {
    // Este console.log se activará cada vez que useMemo recalcule
    console.log('useMemo se está re-ejecutando con:', {
      coverage: formData.coverage_amount,
      age: formData.age_at_inscription,
      frequency: formData.payment_frequency
    });
    return calculateEstimatedPremium(
      formData.coverage_amount || 0,
      formData.age_at_inscription || 0,
      formData.payment_frequency
    );
  }, [formData.coverage_amount, formData.age_at_inscription, formData.payment_frequency]); // Dependencias

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    console.log(`handleChange - Campo: ${name}, Valor: ${value}`);

    setFormData((prev) => {
      let newValue: string | number | Beneficiary[] = value;

      if (name === 'premium_amount' || name === 'coverage_amount' || name === 'age_at_inscription') {
        const numValue = parseFloat(value);
        newValue = isNaN(numValue) ? 0 : numValue;
        console.log(`  -> Es campo numérico. Valor convertido: ${newValue}, Tipo: ${typeof newValue}`);
      }

      if (name === 'num_beneficiaries') {
        const num = parseInt(value, 10);
        const newNumBeneficiaries = isNaN(num) || num < 1 ? 1 : Math.min(num, 3);

        const arr: Beneficiary[] = [];
        const existingBeneficiaries = prev.beneficiaries || [];
        for (let i = 0; i < newNumBeneficiaries; i++) {
          arr.push(existingBeneficiaries[i] || { name: '', relationship: '', percentage: 0 });
        }
        console.log(`  -> num_beneficiaries actualizado a: ${newNumBeneficiaries}`);
        return { ...prev, num_beneficiaries: newNumBeneficiaries, beneficiaries: arr };
      }

      const updatedFormData = { ...prev, [name]: newValue };
      console.log('  -> formData después de la actualización:', updatedFormData);
      return updatedFormData;
    });

    if (validationErrors[name as keyof FormErrors]) {
      setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBeneficiaryChange = (
    idx: number,
    field: 'name' | 'relationship' | 'percentage',
    value: string
  ) => {
    console.log(`handleBeneficiaryChange - Beneficiario #${idx}, Campo: ${field}, Valor: ${value}`);
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
      console.log('  -> Beneficiarios actualizados:', newBens);
      return { ...prev, beneficiaries: newBens };
    });
    if (validationErrors.beneficiaries) {
      setValidationErrors((prev) => ({ ...prev, beneficiaries: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.client_id) {
      errors.client_id = 'Por favor, selecciona un cliente.';
    }
    if (!formData.product_id) {
      errors.product_id = 'El producto de seguro no está seleccionado.';
    }
    if (!formData.start_date) {
      errors.start_date = 'La fecha de inicio es requerida.';
    }
    if (!formData.end_date) {
      errors.end_date = 'La fecha de fin es requerida.';
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }

    if (typeof formData.age_at_inscription !== 'number' || formData.age_at_inscription < 18 || formData.age_at_inscription > 65) {
      errors.age_at_inscription = 'La edad de inscripción debe estar entre 18 y 65 años.';
    }
    if (typeof formData.coverage_amount !== 'number' || formData.coverage_amount < 5000 || formData.coverage_amount > 100000) {
      errors.coverage_amount = 'La cobertura debe estar entre $5,000 y $100,000.';
    }
    if (typeof formData.premium_amount !== 'number' || formData.premium_amount < calculatedPremium) {
      errors.premium_amount = `La prima ingresada debe ser al menos $${calculatedPremium.toFixed(2)}.`;
    }


    if (!formData.beneficiaries || formData.beneficiaries.length === 0) {
      errors.beneficiaries = 'Debe haber al menos un beneficiario.';
    } else {
      let sumaPct = 0;
      for (let i = 0; i < formData.beneficiaries.length; i++) {
        const b = formData.beneficiaries[i];
        if (!b.name.trim()) {
          errors.beneficiaries = `El nombre del beneficiario ${i + 1} es requerido.`;
          break;
        }
        if (!b.relationship.trim()) {
          errors.beneficiaries = `El parentesco del beneficiario ${i + 1} es requerido.`;
          break;
        }
        if (typeof b.percentage !== 'number' || b.percentage <= 0 || b.percentage > 100) {
          errors.beneficiaries = `El porcentaje del beneficiario ${i + 1} debe ser entre 1 y 100.`;
          break;
        }
        sumaPct += b.percentage;
      }

      if (!errors.beneficiaries && Math.abs(sumaPct - 100) > 0.01) {
        errors.beneficiaries = 'La suma de porcentajes de todos los beneficiarios debe ser 100%.';
      }
    }

    setValidationErrors(errors);
    console.log('Errores de validación:', errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});

    if (!user?.id) {
      setError('No se pudo obtener el ID del agente. Por favor, inicia sesión de nuevo.');
      return;
    }

    if (!validateForm()) {
      setError('Por favor, corrige los errores en el formulario.');
      return;
    }

    const policyNumber = generatePolicyNumber();
    const payload: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: Number(formData.premium_amount),
      coverage_amount: Number(formData.coverage_amount),
      age_at_inscription: Number(formData.age_at_inscription),
      num_beneficiaries: Number(formData.num_beneficiaries),
    };

    console.log('Payload enviado:', payload);

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message || 'Error desconocido'}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      setFormData((prev) => ({
        ...prev,
        policy_number: '',
        client_id: '',
        product_id: adndProduct ? adndProduct.id : '',
        start_date: '',
        end_date: '',
        premium_amount: 5,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        coverage_amount: 5000,
        num_beneficiaries: 1,
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
            {clients.map((client) => (
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
          {validationErrors.product_id && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.product_id}</p>
          )}
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
          {validationErrors.payment_frequency && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.payment_frequency}</p>
          )}
        </div>

        {/* Monto de la Prima (Editable, con validación contra el precio total actual) */}
        <div>
          <label
            htmlFor="premium_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Monto de la Prima ($) (Ingrese el valor, mínimo ${calculatedPremium.toFixed(2)})
          </label>
          <input
            type="number"
            id="premium_amount"
            name="premium_amount"
            value={formData.premium_amount}
            onChange={handleChange}
            required
            min={5}
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este campo representa la prima que desea pagar. Debe ser igual o mayor al precio total actual.
          </p>
          {validationErrors.premium_amount && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.premium_amount}</p>
          )}
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
            placeholder='Ej.: "Cobertura AD&D $50,000 con prima $25."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
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
          {validationErrors.num_beneficiaries && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.num_beneficiaries}</p>
          )}
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
                  onChange={(e) =>
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
                  <option value="sibling">Hermano(a)</option>
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
                  onChange={(e) =>
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
          {validationErrors.beneficiaries && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.beneficiaries}</p>
          )}
        </div>

        {/* PRECIO TOTAL ACTUAL (DISPLAY DEL VALOR CALCULADO) */}
        <div className="bg-blue-50 p-4 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Precio total actual:</h3>
          <p className="text-2xl font-bold text-blue-900">
            ${calculatedPremium.toFixed(2)} / {formData.payment_frequency}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Este es el costo mínimo de la póliza basado en las opciones seleccionadas.
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