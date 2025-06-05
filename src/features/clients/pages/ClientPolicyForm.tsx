import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext'; // Asegúrate de que la ruta a AuthContext sea correcta
import {
  InsuranceProduct,
  getActiveInsuranceProducts,
  // createPolicy ya no se llama directamente aquí, sino desde los sub-formularios
} from '../../policies/policy_management';

// Importaciones de los formularios de póliza específicos para el cliente
import AdyDStandaloneFormCliente from '../services/seguro_vida/AdyDStandaloneFormCliente';
import VidaBasicaFormCliente from '../services/seguro_vida/VidaBasicaFormCliente';
import VidaDependientesFormCliente from '../services/seguro_vida/VidaDependientesFormCliente';
import VidaSuplementariaFormCliente from '../services/seguro_vida/VidaSuplementariaFormCliente';
import PlanBasicoFormCliente from '../services/seguros_salud/PlanBasicoFormCliente';
import PlanFamiliarFormCliente from '../services/seguros_salud/PlanFamiliarFormCliente';
import PlanIntermedioFormCliente from '../services/seguros_salud/PlanIntermedioFormCliente';
import PlanPremierFormCliente from '../services/seguros_salud/PlanPremierFormCliente';

/**
 * Componente para el formulario de contratación de una nueva póliza por parte del cliente.
 * Permite al cliente seleccionar un tipo de producto y luego carga el formulario específico para sus detalles.
 */
export default function ClientPolicyForm() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtiene el objeto user del cliente autenticado

  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Lista de productos de seguro activos
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga inicial
  const [error, setError] = useState<string | null>(null); // Estado de error

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null); // ID del producto seleccionado
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null); // Nombre del producto seleccionado
  const [selectedProductDetails, setSelectedProductDetails] = useState<InsuranceProduct | null>(null); // Objeto completo del producto seleccionado
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito
  
  // Mapeo de nombres de productos a sus componentes de formulario específicos para el cliente
  // Asegúrate de que las claves coincidan con el 'name' de tus InsuranceProduct
  const FORM_COMPONENTS_MAP: { [key: string]: React.ComponentType<any> } = useMemo(() => ({
    "Seguro por muerte accidental y desmembramiento (AD&D)": AdyDStandaloneFormCliente,
    "Seguro de Vida Básico": VidaBasicaFormCliente,
    "Seguro de Vida con Dependientes": VidaDependientesFormCliente,
    "Seguro de Vida Suplementario": VidaSuplementariaFormCliente,
    "Seguro de Salud Plan Básico": PlanBasicoFormCliente,
    "Seguro de Salud Plan Familiar": PlanFamiliarFormCliente,
    "Seguro de Salud Plan Intermedio": PlanIntermedioFormCliente,
    "Seguro de Salud Plan Premier": PlanPremierFormCliente,
    // Agrega aquí otros mapeos para tus productos de seguro
  }), []);

  useEffect(() => {
    /**
     * Función asíncrona para cargar los productos de seguro activos al inicio.
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
   * Maneja el cambio en la selección del producto de seguro desde el dropdown.
   * Actualiza el ID, nombre y los detalles completos del producto seleccionado.
   */
  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setSelectedProductId(productId);

    // Encuentra el objeto de producto completo para obtener su nombre y otros detalles
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductName(product.name);
      setSelectedProductDetails(product); // Guardar el objeto completo del producto
    } else {
      setSelectedProductName(null);
      setSelectedProductDetails(null);
    }
  };

  /**
   * Resetea la selección del producto, permitiendo al cliente volver al selector inicial.
   */
  const resetProductSelection = () => {
    setSelectedProductId(null);
    setSelectedProductName(null);
    setSelectedProductDetails(null);
    setError(null); // Limpiar cualquier error previo al cambiar de selección
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando productos de seguro...</p>
      </div>
    );
  }

  // Determinar el componente de formulario específico a renderizar
  const FormToRender = selectedProductName ? FORM_COMPONENTS_MAP[selectedProductName] : null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Contratar Nueva Póliza</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!selectedProductId ? ( // Mostrar el selector de producto si aún no se ha seleccionado uno
        <div className="space-y-6">
          <div>
            <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
              Selecciona un Producto de Seguro
            </label>
            <select
              id="product_id"
              name="product_id"
              value={selectedProductId || ''}
              onChange={handleProductSelectChange}
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
        </div>
      ) : ( // Mostrar el formulario específico una vez que un producto ha sido seleccionado
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Formulario para: {selectedProductName}</h3>
            <button
              type="button"
              onClick={resetProductSelection}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
            >
              Volver a la selección de producto
            </button>
          </div>
          {/* Detalles del Producto Seleccionado (visible solo cuando un producto está seleccionado) */}
          {selectedProductDetails && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Información del Producto:</h3>
              <p><strong className="font-medium">Nombre:</strong> {selectedProductDetails.name}</p>
              <p><strong className="font-medium">Tipo:</strong> {selectedProductDetails.type.charAt(0).toUpperCase() + selectedProductDetails.type.slice(1)}</p>
              <p><strong className="font-medium">Prima Base:</strong> ${selectedProductDetails.base_premium.toFixed(2)}</p>
              <p><strong className="font-medium">Descripción:</strong> {selectedProductDetails.description || 'N/A'}</p>
              {selectedProductDetails.coverage_details && Object.keys(selectedProductDetails.coverage_details).length > 0 && (
                <div className="mt-2">
                  <strong className="font-medium">Cobertura:</strong>
                  <pre className="bg-blue-100 p-2 rounded-md text-xs overflow-x-auto font-mono mt-1">
                    {JSON.stringify(selectedProductDetails.coverage_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {FormToRender ? (
            // Renderiza el componente de formulario específico y le pasa las props necesarias
            // Cada formulario específico será responsable de manejar su propio estado,
            // llamar a `createPolicy`, y manejar la navegación/mensajes de éxito.
            <FormToRender
              clientId={user?.id}
              productId={selectedProductId}
              basePremium={selectedProductDetails?.base_premium} // Pasa la prima base
              onSuccess={() => {
                // Función de callback para cuando la póliza se crea exitosamente
                setSuccessMessage('¡Solicitud de póliza enviada exitosamente! Un agente la revisará pronto.');
                setTimeout(() => {
                  navigate('/client/dashboard/policies'); // Redirigir al listado de pólizas del cliente
                }, 3000);
              }}
              onError={(msg: string) => setError(msg)} // Función de callback para errores
            />
          ) : (
            <div className="text-red-500 text-center py-4">
              No se encontró un formulario específico para el producto seleccionado: **{selectedProductName}**.
              Por favor, verifica el mapeo en `FORM_COMPONENTS_MAP`.
            </div>
          )}
        </div>
      )}

      {/* Los botones de acción ahora estarán dentro de los formularios específicos o manejados por ellos */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={() => navigate('/client/dashboard')}
          className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
        >
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
}