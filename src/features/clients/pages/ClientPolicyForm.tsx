import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from 'src/contexts/AuthContext'; // Asume que tienes un contexto de autenticación

// Importa los nuevos formularios genéricos adaptados para el cliente
import ClientGenericLifePolicyForm from './ClientGenericLifePolicyForm';
import ClientGenericHealthPolicyForm from './ClientGenericHealthPolicyForm';

// Define la interfaz para los productos de seguro, coincidiendo con tu tabla 'insurance_products'
interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null;
    coverage_details: {
        coverage_amount?: number;
        ad_d_included?: boolean;
        ad_d_coverage_amount?: number;
        wellness_rebate_percentage?: number;
        max_age_for_inscription?: number;
        max_beneficiaries?: number;
        deductible?: number;
        coinsurance_percentage?: number;
        max_annual_out_of_pocket?: number;
        includes_dental_basic?: boolean;
        includes_dental_premium?: boolean;
        includes_vision_basic?: boolean;
        includes_vision_full?: boolean;
        max_dependents?: number;
        [key: string]: any;
    };
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    created_at: string;
    updated_at: string;
}

// Interfaz para los perfiles de agente (para selección aleatoria)
interface AgentProfile {
    user_id: string;
    full_name: string;
    email: string;
}

// Declara las variables globales proporcionadas por el entorno Canvas (si aplica)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Instancia del cliente de Supabase
let supabase: any = null;

/**
 * Función para obtener productos de seguro activos desde Supabase.
 */
async function getActiveInsuranceProducts(): Promise<{ data: InsuranceProduct[] | null; error: any }> {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const { data, error } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('is_active', true);
    return { data, error };
}

/**
 * Función para obtener agentes activos desde Supabase.
 */
async function getActiveAgents(): Promise<{ data: AgentProfile[] | null; error: any }> {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('role', 'agent')
        .eq('status', 'active'); // Solo agentes con estado 'active'
    return { data, error };
}


/**
 * Componente principal para que un cliente pueda contratar una nueva póliza.
 * Permite al cliente seleccionar un producto de seguro y luego renderiza el formulario
 * genérico correspondiente (Vida o Salud) para completar los detalles de la póliza.
 */
export default function ClientPolicyForm() {
    const { user } = useAuth(); // Obtener el usuario autenticado (cliente)

    const [products, setProducts] = useState<InsuranceProduct[]>([]);
    const [agents, setAgents] = useState<AgentProfile[]>([]); // Lista de agentes activos
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<InsuranceProduct | null>(null);

    /**
     * Hook useEffect para inicializar el cliente de Supabase y cargar los productos y agentes.
     */
    useEffect(() => {
        const initializeAndFetch = async () => {
            try {
                // Inicialización de Supabase si no está globalmente disponible
                if (!supabase) {
                    const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
                    const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
                    supabase = createClient(supabaseUrl, supabaseAnonKey);
                    console.log("Cliente de Supabase inicializado en ClientPolicyForm.");
                }

                // Cargar productos de seguro activos
                setLoading(true);
                setError(null);
                const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
                if (productsError) {
                    console.error('Error al cargar productos de seguro:', productsError);
                    setError('Error al cargar los productos de seguro: ' + productsError.message);
                } else if (productsData) {
                    setProducts(productsData);
                }

                // Cargar agentes activos
                const { data: agentsData, error: agentsError } = await getActiveAgents();
                if (agentsError) {
                    console.error('Error al cargar agentes:', agentsError);
                    setError(prev => prev ? prev + '; Error al cargar agentes.' : 'Error al cargar agentes: ' + agentsError.message);
                } else if (agentsData) {
                    setAgents(agentsData);
                }

            } catch (err: any) {
                console.error("Error al inicializar o cargar datos:", err);
                setError("Error fatal al cargar datos: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        initializeAndFetch();
    }, []);

    /**
     * Selecciona un agente aleatorio de la lista de agentes disponibles.
     * @returns El ID del agente seleccionado o null si no hay agentes.
     */
    const selectRandomAgentId = (): string | null => {
        if (agents.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * agents.length);
        return agents[randomIndex].user_id;
    };

    /**
     * Maneja el cambio en la selección del producto de seguro.
     */
    const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        setSelectedProductId(productId);

        const product = products.find(p => p.id === productId);
        setSelectedProduct(product || null);
        setError(null);
    };

    /**
     * Resetea la selección del producto para volver al selector.
     */
    const resetProductSelection = () => {
        setSelectedProductId(null);
        setSelectedProduct(null);
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando productos y agentes disponibles...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">¡Error!</strong>
                <span className="block sm:inline"> {error}</span>
                <button onClick={resetProductSelection} className="ml-4 text-sm underline">Reintentar</button>
            </div>
        );
    }

    if (!user || !user.id) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">Advertencia:</strong>
                <span className="block sm:inline"> No se pudo obtener el ID del cliente. Asegúrese de estar autenticado.</span>
            </div>
        );
    }

    // Selecciona un agente aleatorio SOLO cuando un producto va a ser mostrado
    const assignedAgentId = selectedProduct ? selectRandomAgentId() : null;

    if (selectedProduct && !assignedAgentId) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">¡Error!</strong>
                <span className="block sm:inline"> No hay agentes activos disponibles para asignación. No se puede crear la póliza en este momento.</span>
                <button onClick={resetProductSelection} className="ml-4 text-sm underline">Volver a selección</button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl border border-blue-100">
            <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Contratar Nueva Póliza</h2>

            {!selectedProduct ? ( // Mostrar selector de producto si no hay uno seleccionado
                <div className="space-y-6">
                    {/* Campo Producto de Seguro */}
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
                                    {product.name} ({product.type.charAt(0).toUpperCase() + product.type.slice(1)})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : ( // Mostrar el formulario específico si un producto ha sido seleccionado
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">Formulario para: {selectedProduct.name}</h3>
                        <button
                            type="button"
                            onClick={resetProductSelection}
                            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
                        >
                            Volver a la selección de producto
                        </button>
                    </div>
                    {/* Renderizado condicional de formularios genéricos para el cliente */}
                    {selectedProduct.type === 'life' && (
                        <ClientGenericLifePolicyForm
                            product={selectedProduct}
                            clientId={user.id}
                            agentId={assignedAgentId!} // Ya validamos que assignedAgentId no es null si selectedProduct existe
                        />
                    )}
                    {selectedProduct.type === 'health' && (
                        <ClientGenericHealthPolicyForm
                            product={selectedProduct}
                            clientId={user.id}
                            agentId={assignedAgentId!} // Ya validamos que assignedAgentId no es null si selectedProduct existe
                        />
                    )}
                    {/* Mensaje si el tipo de producto no está soportado */}
                    {selectedProduct.type !== 'life' && selectedProduct.type !== 'health' && (
                        <div className="text-red-500 text-center">
                            Tipo de producto no soportado para la contratación en línea: {selectedProduct.type}.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}