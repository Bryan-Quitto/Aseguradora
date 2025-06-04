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

interface Dependent {
  name: string;
  birth_date: string;
  relationship: string; // 'spouse' o 'child'
}

/**
 * Formulario para el Seguro de Vida para Dependientes.
 */
export default function VidaDependientesForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -----------------------------------------------------
  // Estado base + campos específicos Vida Dependientes
  // -----------------------------------------------------
  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0, // Se calcula según dependientes (backend)
    payment_frequency: 'monthly',
    status: 'pending',
    contract_details: '',
    // ↓ Campos propios Vida Dependientes
    num_dependents: 0, // Hasta 4: 1 cónyuge + hasta 3 hijos
    dependents_details: [] as Dependent[],
    ad_d_included: false, // AD&D opcional (por dependiente)
    dependent_type_counts: { spouse: 0, children: 0 },
  });

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vidaDependientesProduct, setVidaDependientesProduct] = useState<InsuranceProduct | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Cargar productos (solo Vida para Dependientes)
      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro.');
        setLoading(false);
        return;
      }
      if (productsData) {
        // --- ENCUENTRA Y ESTABLECE EL PRODUCTO ESPECÍFICO "Seguro de Vida con Dependientes" ---
        const foundVidaDependientesProduct = productsData.find(p => p.name === 'Seguro de Vida con Dependientes'); // <-- Asegúrate de que el nombre sea EXACTO
        if (foundVidaDependientesProduct) {
          setVidaDependientesProduct(foundVidaDependientesProduct);
          setFormData(prev => ({
            ...prev,
            product_id: foundVidaDependientesProduct.id, // Establece el ID en el formData
          }));
        } else {
          setError('Error: El producto "Seguro de Vida con Dependientes" no fue encontrado. Asegúrate de que existe en la base de datos.');
          setLoading(false);
          return; // Detener la carga si el producto no se encuentra
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

      // Inicializa sin dependientes (esto se manejará más dinámicamente con el nuevo useEffect)
      setFormData(prev => ({
        ...prev,
        num_dependents: 0,
        dependents_details: [],
        ad_d_included: false,
        dependent_type_counts: { spouse: 0, children: 0 },
      }));

      setLoading(false);
    };

    fetchInitialData();
  }, []);

  // --- Nuevo useEffect para sincronizar num_dependents y dependents_details ---
  useEffect(() => {
    // Asegura que dependents_details tiene la cantidad correcta de objetos vacíos
    setFormData(prev => {
      const currentNum = prev.num_dependents || 0;
      const currentDetails = prev.dependents_details || [];
      const newDetails: Dependent[] = [];

      for (let i = 0; i < currentNum; i++) {
        // Si ya existe un dependiente en esta posición, reutilízalo. De lo contrario, crea uno nuevo.
        newDetails.push(currentDetails[i] || { name: '', birth_date: '', relationship: '' });
      }

      // Recalcular conteos de tipos de dependientes
      let spouseCount = 0;
      let childrenCount = 0;
      newDetails.forEach(dep => {
        if (dep.relationship === 'spouse') spouseCount++;
        if (dep.relationship === 'child') childrenCount++;
      });

      return {
        ...prev,
        dependents_details: newDetails,
        dependent_type_counts: { spouse: spouseCount, children: childrenCount },
      };
    });
  }, [formData.num_dependents]); // Se ejecuta cada vez que num_dependents cambia

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  const generatePolicyNumber = () => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target; // 'type' y 'checked' pueden ser inferidos o manejados por separado

    setFormData(prev => {
      // Número de dependientes (0–4)
      if (name === 'num_dependents') {
        const num = parseInt(value) || 0;
        // Validar rango directamente en la UI para una mejor UX
        if (num < 0 || num > 4) return prev; // No actualiza si está fuera de rango
        return { ...prev, num_dependents: num }; // Deja que el useEffect posterior ajuste dependents_details
      }
      // Checkbox AD&D
      if (name === 'ad_d_included') {
        // Casting seguro para HTMLInputElement
        const isCheckbox = (target: EventTarget): target is HTMLInputElement =>
          (target as HTMLInputElement).type === 'checkbox';

        if (isCheckbox(e.target)) {
          return { ...prev, ad_d_included: e.target.checked };
        }
        return prev; // Si no es un checkbox, no hacemos nada con esta propiedad
      }
      // Resto (client_id, product_id, fechas, etc.)
      return { ...prev, [name]: value };
    });
  };

  // Cambios en datos de cada dependiente
  const handleDependentChange = (
    idx: number,
    field: 'name' | 'birth_date' | 'relationship',
    value: string
  ) => {
    setFormData(prev => {
      const newDeps = [...(prev.dependents_details || [])];
      // Asegúrate de que el objeto en newDeps[idx] exista y sea de tipo Dependent
      if (!newDeps[idx]) {
        newDeps[idx] = { name: '', birth_date: '', relationship: '' };
      }

      newDeps[idx] = {
        ...newDeps[idx],
        [field]: value,
      };

      // Recalcular conteo de spouse vs children para validaciones inmediatas
      let spouseCount = 0;
      let childrenCount = 0;
      newDeps.forEach(dep => {
        if (dep.relationship === 'spouse') spouseCount++;
        if (dep.relationship === 'child') childrenCount++;
      });

      return {
        ...prev,
        dependents_details: newDeps,
        dependent_type_counts: { spouse: spouseCount, children: childrenCount },
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user?.id) {
      setError('No se pudo obtener el ID del agente. Por favor, intente iniciar sesión nuevamente.');
      return;
    }

    // Validaciones Vida Dependientes
    const currentNumDependents = formData.num_dependents || 0;
    const currentDependentDetails = formData.dependents_details || [];
    const currentDependentTypeCounts = formData.dependent_type_counts || { spouse: 0, children: 0 };

    // 1) num_dependents entre 1 y 4
    if (currentNumDependents < 1 || currentNumDependents > 4) {
      setError('Debe haber entre 1 y 4 dependientes.');
      return;
    }

    // 2) Solo 1 cónyuge permitido
    if (currentDependentTypeCounts.spouse > 1) {
      setError('Solo se permite 1 cónyuge.');
      return;
    }

    // 3) Hijos máximo 3
    if (currentDependentTypeCounts.children > 3) {
      setError('Solo se permiten hasta 3 hijos.');
      return;
    }

    // 4) Todos los dependientes deben tener datos completos
    if (currentDependentDetails.length !== currentNumDependents) {
        setError('El número de dependientes no coincide con los detalles ingresados. Por favor, verifique.');
        return;
    }

    for (let i = 0; i < currentDependentDetails.length; i++) {
      const d = currentDependentDetails[i];
      if (!d.name.trim() || !d.birth_date || !d.relationship) {
        setError(`Completa todos los datos del dependiente ${i + 1}.`);
        return;
      }
      // Si es hijo, validar edad ≤ 25
      if (d.relationship === 'child') {
        const birth = new Date(d.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--; // Si no ha cumplido años este año
        }
        if (age > 25) {
          setError(`El hijo(a) "${d.name}" excede la edad máxima de 25 años.`);
          return;
        }
      }
    }

    // El monto de la prima se calcula en backend según dependientes:
    // Cónyuge = $10, Hijo = $3 cada uno, AD&D opcional +$2 por dependiente si se marca.
    // Aquí dejamos premium_amount en 0 y backend calculará.
    const policyNumber = generatePolicyNumber();
    const payload: CreatePolicyData = { // Tipado como CreatePolicyData
      ...formData,
      policy_number: policyNumber,
      agent_id: user.id,
      premium_amount: 0,  // lo calcula backend
      // dependents_details y ad_d_included ya están en formData, no es necesario re-añadirlos explícitamente aquí
    };

    const { data, error: createError } = await createPolicy(payload);
    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message || 'Error desconocido'}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Resetear formulario
      setFormData({
        policy_number: '',
        client_id: '',
        product_id: vidaDependientesProduct?.id || '', // Vuelve a establecer el product_id si existe
        start_date: '',
        end_date: '',
        premium_amount: 0,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '',
        num_dependents: 0,
        dependents_details: [],
        ad_d_included: false,
        dependent_type_counts: { spouse: 0, children: 0 },
      });
      setTimeout(() => {
        navigate('/agent/dashboard/policies');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos para Vida Dependientes…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        Crear Póliza – Seguro de Vida para Dependientes
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
            value={vidaDependientesProduct ? vidaDependientesProduct.name : 'Cargando producto...'}
            readOnly // ¡Importante! Hace que el campo sea de solo lectura
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este formulario es específicamente para el "Seguro de Vida con Dependientes".
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
            placeholder='Ej.: "Incluye cobertura de $5,000 para cónyuge y $2,000 por hijo."'
          />
          <p className="mt-1 text-xs text-gray-500">
            Introduce detalles adicionales si los hay.
          </p>
        </div>

        {/* ———————————— Campos Específicos: Vida Dependientes ———————————— */}

        {/* Número de Dependientes (1–4) */}
        <div>
          <label
            htmlFor="num_dependents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de Dependientes (1–4)
          </label>
          <input
            type="number"
            id="num_dependents"
            name="num_dependents"
            value={formData.num_dependents}
            onChange={handleChange}
            required
            min={0} // Permitir 0 inicialmente para limpiar
            max={4}
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Máximo 1 cónyuge + hasta 3 hijos (cada hijo debe tener ≤ 25 años).
          </p>
        </div>

        {/* Campos dinámicos para cada dependiente */}
        {(formData.num_dependents || 0) > 0 && formData.dependents_details && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">Detalles de Dependientes</h3>
            {formData.dependents_details.map((dep, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <p className="font-medium text-gray-800">Dependiente #{idx + 1}</p>
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
                    Tipo de Dependiente
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
                    <option value="">Selecciona tipo</option>
                    <option value="spouse">Cónyuge</option>
                    <option value="child">Hijo(a)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

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
            Incluir Cobertura AD&D para Dependientes (+$2/mes c/u)
          </label>
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