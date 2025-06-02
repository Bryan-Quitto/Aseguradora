import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext'; // Asegúrate de que la ruta a AuthContext sea correcta
import {
  CreatePolicyData,
  InsuranceProduct,
  getActiveInsuranceProducts,
  createPolicy,
} from '../../policies/policy_management';

/**
 * Componente para el formulario de contratación de una nueva póliza por parte del cliente.
 */
export default function ClientPolicyForm() {
  const navigate = useNavigate();
  const { profile, user } = useAuth(); // Obtiene el perfil del cliente autenticado y el objeto user

  const [formData, setFormData] = useState<{
    product_id: string;
    start_date: string;
    end_date: string;
    payment_frequency: 'monthly' | 'quarterly' | 'annually';
    // Cambiado de Record<string, any> a string para aceptar cualquier texto
    contract_details: string; 
  }>({
    product_id: '',
    start_date: '',
    end_date: '',
    payment_frequency: 'monthly', // Valor por defecto
    // Cambiado de {} a '' para aceptar texto simple
    contract_details: '', 
  });

  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Lista de productos de seguro
  const [selectedProduct, setSelectedProduct] = useState<InsuranceProduct | null>(null); // Producto seleccionado
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga inicial
  const [error, setError] = useState<string | null>(null); // Estado de error
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito

  useEffect(() => {
    /**
     * Función asíncrona para cargar los productos de seguro activos.
     */
    const fetchActiveProducts = async () => {
      setLoading(true);
      setError(null);

      const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
      if (productsError) {
        console.error('Error al cargar productos de seguro:', productsError);
        setError('Error al cargar los productos de seguro disponibles.');
        setLoading(false);
        return;
      }
      if (productsData) {
        setProducts(productsData);
      }
      setLoading(false);
    };

    fetchActiveProducts();
  }, []);

  /**
   * Maneja los cambios en los campos del formulario.
   * @param e Evento de cambio del input.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Si el producto cambia, actualiza el producto seleccionado
    if (name === 'product_id') {
      const product = products.find(p => p.id === value);
      setSelectedProduct(product || null);
    }
  };

  /**
   * Genera un número de póliza simple (para fines de demostración).
   * En un entorno real, esto debería ser generado por un servicio de backend.
   */
  const generatePolicyNumber = () => {
    return `POL-CLI-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  };

  /**
   * Maneja el envío del formulario para solicitar una nueva póliza.
   * @param e Evento de envío del formulario.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user?.id) {
      setError('No se pudo obtener el ID del cliente. Por favor, inicia sesión de nuevo.');
      return;
    }
    if (!selectedProduct) {
      setError('Por favor, selecciona un producto de seguro.');
      return;
    }

    const policyNumber = generatePolicyNumber(); // Genera el número de póliza

    const policyToCreate: CreatePolicyData = {
      policy_number: policyNumber,
      client_id: user.id,
      product_id: formData.product_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      premium_amount: selectedProduct.base_premium, // Usa el premium base del producto seleccionado
      payment_frequency: formData.payment_frequency,
      status: 'pending', // Las pólizas solicitadas por el cliente inician como 'pending'
      // contract_details ahora se pasa como un string directamente
      contract_details: formData.contract_details, 
    };

    const { data, error: createError } = await createPolicy(policyToCreate);

    if (createError) {
      console.error('Error al solicitar póliza:', createError);
      setError(`Error al solicitar la póliza: ${createError.message}`);
    } else if (data) {
      setSuccessMessage(`¡Solicitud de póliza ${data.policy_number} enviada exitosamente! Un agente la revisará pronto.`);
      // Opcional: limpiar el formulario o redirigir
      setFormData({
        product_id: '',
        start_date: '',
        end_date: '',
        payment_frequency: 'monthly',
        contract_details: '', // Limpiar a string vacío
      });
      setSelectedProduct(null);
      setTimeout(() => {
        navigate('/client/dashboard/policies'); // Redirigir al listado de pólizas del cliente
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando productos de seguro...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Contratar Nueva Póliza</h2>

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
        {/* Campo Producto de Seguro */}
        <div>
          <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
            Selecciona un Producto de Seguro
          </label>
          <select
            id="product_id"
            name="product_id"
            value={formData.product_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">-- Selecciona un producto --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.type === 'life' ? 'Vida' : product.type === 'health' ? 'Salud' : 'Otro'}) - ${product.base_premium.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Detalles del Producto Seleccionado:</h3>
            <p><strong className="font-medium">Nombre:</strong> {selectedProduct.name}</p>
            <p><strong className="font-medium">Tipo:</strong> {selectedProduct.type.charAt(0).toUpperCase() + selectedProduct.type.slice(1)}</p>
            <p><strong className="font-medium">Prima Base:</strong> ${selectedProduct.base_premium.toFixed(2)}</p>
            <p><strong className="font-medium">Descripción:</strong> {selectedProduct.description || 'N/A'}</p>
            {/* Si aún quieres mostrar detalles de cobertura del producto, pero no del contrato */}
            {selectedProduct.coverage_details && Object.keys(selectedProduct.coverage_details).length > 0 && (
              <div className="mt-2">
                <strong className="font-medium">Cobertura:</strong>
                <pre className="bg-blue-100 p-2 rounded-md text-xs overflow-x-auto font-mono mt-1">
                  {JSON.stringify(selectedProduct.coverage_details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Fechas de Inicio y Fin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio de la Póliza
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
              Fecha de Fin de la Póliza
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

        {/* Frecuencia de Pago */}
        <div>
          <label htmlFor="payment_frequency" className="block text-sm font-medium text-gray-700 mb-1">
            Frecuencia de Pago Preferida
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

        {/* Detalles del Contrato (ahora como texto simple) */}
        <div>
          <label htmlFor="contract_details" className="block text-sm font-medium text-gray-700 mb-1">
            Detalles Adicionales (Opcional)
          </label>
          <textarea
            id="contract_details"
            name="contract_details"
            // Ahora el valor es directamente la cadena de texto
            value={formData.contract_details} 
            // El onChange simplemente actualiza el estado con el valor del textarea
            onChange={handleChange} 
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder='Introduce cualquier detalle adicional aquí, por ejemplo: "Beneficiarios: Juan Pérez, María García. Cobertura adicional para mascotas."'
          ></textarea>
          <p className="mt-1 text-xs text-gray-500">
            Introduce cualquier detalle adicional relevante para la póliza.
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/client/dashboard')}
            className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300"
          >
            Solicitar Póliza
          </button>
        </div>
      </form>
    </div>
  );
}