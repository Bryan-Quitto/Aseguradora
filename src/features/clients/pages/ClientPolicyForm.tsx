import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from 'src/contexts/useAuth';
import ClientGenericLifePolicyForm from './ClientGenericLifePolicyForm';
import ClientGenericHealthPolicyForm from './ClientGenericHealthPolicyForm';
import PageContainer from 'src/components/container/PageContainer';
import { Spinner } from 'flowbite-react';

interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null;
    coverage_details: { [key: string]: any; };
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    created_at: string;
    updated_at: string;
}

interface AgentProfile {
    user_id: string;
    full_name: string;
    email: string;
}

declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

let supabase: any = null;

async function getActiveInsuranceProducts(): Promise<{ data: InsuranceProduct[] | null; error: any }> {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const { data, error } = await supabase.from('insurance_products').select('*').eq('is_active', true);
    return { data, error };
}

async function getActiveAgents(): Promise<{ data: AgentProfile[] | null; error: any }> {
    if (!supabase) {
        const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const { data, error } = await supabase.from('profiles').select('user_id, full_name, email').eq('role', 'agent').eq('status', 'active');
    return { data, error };
}

export default function ClientPolicyForm() {
    const { user } = useAuth();
    const [products, setProducts] = useState<InsuranceProduct[]>([]);
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<InsuranceProduct | null>(null);

    useEffect(() => {
        const initializeAndFetch = async () => {
            try {
                if (!supabase) {
                    const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
                    const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
                    supabase = createClient(supabaseUrl, supabaseAnonKey);
                }
                setLoading(true);
                setError(null);
                const { data: productsData, error: productsError } = await getActiveInsuranceProducts();
                if (productsError) setError('Error al cargar los productos de seguro: ' + productsError.message);
                else if (productsData) setProducts(productsData);

                const { data: agentsData, error: agentsError } = await getActiveAgents();
                if (agentsError) setError(prev => prev ? `${prev}; Error al cargar agentes.` : 'Error al cargar agentes: ' + agentsError.message);
                else if (agentsData) setAgents(agentsData);
            } catch (err: any) {
                setError("Error fatal al cargar datos: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        initializeAndFetch();
    }, []);

    const selectRandomAgentId = (): string | null => {
        if (agents.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * agents.length);
        return agents[randomIndex].user_id;
    };

    const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        setSelectedProductId(productId);
        const product = products.find(p => p.id === productId);
        setSelectedProduct(product || null);
        setError(null);
    };

    const resetProductSelection = () => {
        setSelectedProductId(null);
        setSelectedProduct(null);
        setError(null);
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="xl" /></div>;
    if (error) return <div className="text-red-500 text-center p-4">{error}<button onClick={resetProductSelection} className="ml-4 text-sm underline">Reintentar</button></div>;
    if (!user || !user.id) return <div className="text-yellow-500 text-center p-4">No se pudo obtener el ID del cliente. Asegúrese de estar autenticado.</div>;

    const assignedAgentId = selectedProduct ? selectRandomAgentId() : null;
    if (selectedProduct && !assignedAgentId) return <div className="text-red-500 text-center p-4">No hay agentes activos disponibles. No se puede crear la póliza.<button onClick={resetProductSelection} className="ml-4 text-sm underline">Volver</button></div>;

    const content = !selectedProduct ? (
        <div className="w-full max-w-md mx-auto">
            <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                Selecciona un Producto de Seguro
            </label>
            <select id="product_id" name="product_id" value={selectedProductId || ''} onChange={handleProductSelectChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">-- Selecciona un producto --</option>
                {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} ({product.type.charAt(0).toUpperCase() + product.type.slice(1)})</option>
                ))}
            </select>
        </div>
    ) : (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Formulario para: {selectedProduct.name}</h3>
                <button type="button" onClick={resetProductSelection} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Volver
                </button>
            </div>
            {selectedProduct.type === 'life' && <ClientGenericLifePolicyForm product={selectedProduct} clientId={user.id} agentId={assignedAgentId!} />}
            {selectedProduct.type === 'health' && <ClientGenericHealthPolicyForm product={selectedProduct} clientId={user.id} agentId={assignedAgentId!} />}
            {selectedProduct.type !== 'life' && selectedProduct.type !== 'health' && <div className="text-red-500 text-center">Tipo de producto no soportado para la contratación en línea: {selectedProduct.type}.</div>}
        </div>
    );
    
    return (
        <div className="flex justify-center w-full">
            <div className="w-full max-w-4xl">
                 <PageContainer title="Contratar Nueva Póliza">
                    {content}
                 </PageContainer>
            </div>
        </div>
    );
}