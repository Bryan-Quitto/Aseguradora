import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';
import { InsuranceProduct, getActiveInsuranceProducts } from '../../policies/policy_management';

// Importaciones condicionales para los formularios de póliza específicos
import AdyDStandaloneForm from '../../policies/pages/seguro_vida/AdyDStandaloneForm';
import VidaBasicaForm from '../../policies/pages/seguro_vida/VidaBasicaForm';
import VidaDependientesForm from '../../policies/pages/seguro_vida/VidaDependientesForm';
import VidaSuplementariaForm from '../../policies/pages/seguro_vida/VidaSuplementariaForm';
import PlanBasicoForm from '../../policies/pages/seguros_salud/PlanBasicoForm';
import PlanFamiliarForm from '../../policies/pages/seguros_salud/PlanFamiliarForm';
import PlanIntermedioForm from '../../policies/pages/seguros_salud/PlanIntermedioForm';
import PlanPremierForm from '../../policies/pages/seguros_salud/PlanPremierForm';

/**
 * Componente para el formulario de creación de una nueva póliza.
 * Permite al agente seleccionar un tipo de producto y luego carga el formulario específico.
 */
export default function AgentPolicyForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<InsuranceProduct[]>([]); // Lista de productos de seguro
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga inicial
  const [error, setError] = useState<string | null>(null); // Estado de error
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null); // ID del producto seleccionado
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null); // Nombre del producto seleccionado

  // Mapeo de nombres de productos a sus componentes de formulario
  const FORM_COMPONENTS_MAP: { [key: string]: React.ComponentType<any> } = useMemo(() => ({
    "Seguro por muerte accidental y desmembramiento (AD&D)": AdyDStandaloneForm,
    "Seguro de Vida Básico": VidaBasicaForm,
    "Seguro de Vida con Dependientes": VidaDependientesForm,
    "Seguro de Vida Suplementario": VidaSuplementariaForm,
    "Seguro de Salud Plan Básico": PlanBasicoForm,
    "Seguro de Salud Plan Familiar": PlanFamiliarForm,
    "Seguro de Salud Plan Intermedio": PlanIntermedioForm,
    "Seguro de Salud Plan Premier": PlanPremierForm,
  }), []);

  useEffect(() => {
    /**
     * Función asíncrona para cargar los productos de seguro.
     */
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
      }
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  /**
   * Maneja el cambio en la selección del producto de seguro.
   * Carga el componente de formulario correspondiente.
   */
  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setSelectedProductId(productId);

    // Encuentra el nombre del producto seleccionado
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductName(product.name);
    } else {
      setSelectedProductName(null);
    }
  };

  /**
   * Resetea la selección del producto para volver al selector.
   */
  const resetProductSelection = () => {
    setSelectedProductId(null);
    setSelectedProductName(null);
    setError(null); // Limpiar cualquier error previo al cambiar de selección
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando productos de seguro...</p>
      </div>
    );
  }

  // Determinar el componente de formulario a renderizar
  const FormToRender = selectedProductName ? FORM_COMPONENTS_MAP[selectedProductName] : null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Crear nueva póliza</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">¡Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!selectedProductId ? ( // Mostrar selector de producto si no hay uno seleccionado
        <div className="space-y-6">
          {/* Campo Producto de Seguro */}
          <div>
            <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
              Producto de Seguro
            </label>
            <select
              id="product_id"
              name="product_id"
              value={selectedProductId || ''}
              onChange={handleProductSelectChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.type.charAt(0).toUpperCase() + product.type.slice(1)})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : ( // Mostrar el formulario específico si un producto ha sido seleccionado
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
          {FormToRender ? (
            <FormToRender agentId={user?.id} /> // Pasar el agentId al formulario específico
          ) : (
            <div className="text-red-500 text-center">
              No se encontró un formulario para el producto seleccionado: {selectedProductName}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}