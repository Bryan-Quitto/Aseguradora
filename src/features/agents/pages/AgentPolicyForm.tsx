import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext'; // Asegúrate de que la ruta a AuthContext sea correcta
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../policies/policy_management'; // Corregido: policy_mangament -> policy_management
import { ClientProfile, getAllClientProfiles } from '../../clients/hooks/cliente_backend'; // Importa getAllClientProfiles

/**
 * Componente para el formulario de creación de una nueva póliza.
 */
export default function AgentPolicyForm() {
  const navigate = useNavigate();
  // Eliminado 'profile' ya que no se utiliza, resolviendo la advertencia TS6133
  const { user } = useAuth(); 

  const [formData, setFormData] = useState<CreatePolicyData>({
    policy_number: '',
    client_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    premium_amount: 0,
    payment_frequency: 'monthly', // Valor por defecto
    status: 'pending', // Valor por defecto
    // Cambiado de {} a '' para aceptar texto simple, alineado con la base de datos y ClientPolicyForm
    contract_details: '', 
  });

  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Lista de productos de seguro
  const [clients, setClients] = useState<ClientProfile[]>([]); // Lista de clientes
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga inicial
  const [error, setError] = useState<string | null>(null); // Estado de error
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito

  useEffect(() => {
    /**
     * Función asíncrona para cargar los productos de seguro y los clientes.
     */
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
        setProducts(productsData);
      }

      // Cargar perfiles de clientes
      const { data: clientsData, error: clientsError } = await getAllClientProfiles();
      if (clientsError) {
        console.error('Error al cargar clientes:', clientsError);
        setError(prev => prev ? prev + ' Y clientes.' : 'Error al cargar los clientes.');
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

  /**
   * Maneja los cambios en los campos del formulario.
   * @param e Evento de cambio del input.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData: CreatePolicyData) => ({ // Corregido: Añadido tipo explícito para prevData
      ...prevData,
      [name]: name === 'premium_amount' ? parseFloat(value) : value,
    }));
  };

  /**
   * Genera un número de póliza simple (para fines de demostración).
   * En un entorno real, esto debería ser generado por un servicio de backend.
   */
  const generatePolicyNumber = () => {
    return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  /**
   * Maneja el envío del formulario para crear una nueva póliza.
   * @param e Evento de envío del formulario.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user?.id) {
      setError('No se pudo obtener el ID del agente para asignar la póliza.');
      return;
    }

    const policyNumber = generatePolicyNumber(); // Genera el número de póliza

    const policyToCreate: CreatePolicyData = {
      ...formData,
      policy_number: policyNumber, // Asigna el número de póliza generado
      agent_id: user.id, // Asigna el agente actual
      premium_amount: Number(formData.premium_amount), // Asegura que sea un número
      // contract_details ahora se pasa como un string directamente
      contract_details: formData.contract_details, 
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al crear póliza:', createError);
      setError(`Error al crear la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`Póliza ${data.policy_number} creada exitosamente.`);
      // Opcional: limpiar el formulario o redirigir
      setFormData((prevData: CreatePolicyData) => ({ // Corregido: Añadido tipo explícito para prevData
        ...prevData, // Mantener los valores por defecto si se quieren limpiar solo algunos
        policy_number: '',
        client_id: '',
        product_id: '',
        start_date: '',
        end_date: '',
        premium_amount: 0,
        payment_frequency: 'monthly',
        status: 'pending',
        contract_details: '', // Limpiar a string vacío
      }));
      setTimeout(() => {
        navigate('/agent/dashboard/policies'); // Redirigir al listado de pólizas
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando datos necesarios...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Crear Nueva Póliza</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Éxito!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campo Cliente */}
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
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
                {client.full_name || `${client.primer_nombre || ''} ${client.primer_apellido || ''}`.trim()} ({client.email})
              </option>
            ))}
          </select>
        </div>

        {/* Campo Producto de Seguro */}
        <div>
          <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
            Producto de Seguro
          </label>
          <select
            id="product_id"
            name="product_id"
            value={formData.product_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Selecciona un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.type.charAt(0).toUpperCase() + product.type.slice(1)}) - ${product.base_premium.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Fechas de Inicio y Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Monto de la Prima y Frecuencia de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="premium_amount" className="block text-sm font-medium text-gray-700 mb-1">
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
          </div>
          <div>
            <label htmlFor="payment_frequency" className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Estado de la Póliza */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Detalles del Contrato (ahora como texto simple) */}
        <div>
          <label htmlFor="contract_details" className="block text-sm font-medium text-gray-700 mb-1">
            Detalles del Contrato (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            // Ahora el valor es directamente la cadena de texto
            value={formData.contract_details || ''} // Asegura que sea una cadena vacía si es null/undefined
            // El onChange simplemente actualiza el estado con el valor del textarea
            onChange={handleChange} 
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Introduce cualquier detalle adicional aquí, por ejemplo: "Beneficiarios: Juan Pérez, María García. Cobertura adicional para mascotas."'
          ></textarea>
          <p className="mt-1 text-xs text-gray-500">
            Introduce los detalles adicionales relevantes para la póliza.
          </p>
        </div>

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