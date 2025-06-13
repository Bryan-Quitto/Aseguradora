import { useState, useEffect } from 'react';
// Importamos el cliente de Supabase desde la ruta correcta
import { supabase } from '../../supabase/client';
import { Link } from 'react-router-dom'; // Importa Link para los botones de acción

// Interfaz para el producto de seguro, coincidiendo con la tabla 'insurance_products'
interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null;
    coverage_details: {
        [key: string]: any; // Para permitir cualquier detalle de cobertura
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

/**
 * Componente para listar todos los productos de seguro para el administrador.
 * Permite visualizar los detalles de cada tipo de seguro creado en la plataforma.
 */
export default function AdminInsuranceList() {
    const [products, setProducts] = useState<InsuranceProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Nuevo estado para controlar el diálogo de confirmación de eliminación
    const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
    // Nuevo estado para guardar el ID del producto que se intenta eliminar
    const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // Estado para el rol del usuario actual

    useEffect(() => {
        const fetchInsuranceProductsAndUserRole = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Obtener el usuario autenticado de Supabase
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    console.error('Error al obtener el usuario autenticado:', userError);
                    setError('Error al cargar la información del usuario.');
                    setLoading(false);
                    return;
                }

                if (user) {
                    // 2. Consultar la tabla 'administrators' para obtener el admin_role
                    const { data: adminData, error: adminRoleError } = await supabase
                        .from('administrators')
                        .select('admin_role')
                        .eq('user_id', user.id)
                        .single(); // Esperamos un solo resultado para un user_id

                    if (adminRoleError && adminRoleError.code !== 'PGRST116') { // PGRST116 es 'No rows found'
                        console.error('Error al obtener el rol del administrador:', adminRoleError);
                        // No establecer error aquí, ya que el usuario podría no ser un administrador (lo cual es normal)
                    } else if (adminData) {
                        // Si se encontró un registro y tiene un admin_role
                        setCurrentUserRole(adminData.admin_role);
                    } else {
                        setCurrentUserRole(null); // Si no es un administrador, no tiene un rol admin específico
                    }
                } else {
                    setCurrentUserRole(null); // Si no hay usuario autenticado, no hay rol de administrador
                }

                // 3. Cargar los productos de seguro
                const { data, error: fetchError } = await supabase
                    .from('insurance_products')
                    .select('*'); // Selecciona todas las columnas

                if (fetchError) {
                    console.error('Error al cargar productos de seguro:', fetchError);
                    setError('Error al cargar los productos de seguro: ' + fetchError.message);
                } else if (data) {
                    setProducts(data);
                }
            } catch (err: any) {
                console.error("Error fatal al cargar datos:", err);
                setError("Error fatal al cargar los productos de seguro: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInsuranceProductsAndUserRole();
    }, []);

    // Helper para Capitalizar la primera letra
    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    /**
     * Maneja el clic en el botón de eliminar, mostrando el diálogo de confirmación.
     * @param productId El ID del producto a eliminar.
     */
    const handleDeleteClick = (productId: string) => {
        setProductToDeleteId(productId);
        setShowConfirmDialog(true);
    };

    /**
     * Confirma la eliminación del producto seleccionado.
     */
    const confirmDelete = async () => {
        if (!productToDeleteId) return;

        setLoading(true);
        setError(null);
        setShowConfirmDialog(false); // Cierra el diálogo de confirmación

        try {
            const { error: deleteError } = await supabase
                .from('insurance_products')
                .delete()
                .eq('id', productToDeleteId);

            if (deleteError) {
                throw deleteError;
            }

            // Actualiza la lista de productos después de la eliminación exitosa
            setProducts(products.filter(product => product.id !== productToDeleteId));
            // Cambiado de alert a un mensaje en la UI para mejor UX
            // alert('Producto de seguro eliminado exitosamente.');
            // Podrías añadir un estado para un mensaje de éxito temporal aquí
        } catch (err: any) {
            console.error('Error al eliminar el producto:', err);
            setError('Error al eliminar el producto de seguro: ' + err.message);
        } finally {
            setLoading(false);
            setProductToDeleteId(null); // Limpia el ID del producto a eliminar
        }
    };

    /**
     * Cancela la operación de eliminación, cerrando el diálogo.
     */
    const cancelDelete = () => {
        setShowConfirmDialog(false);
        setProductToDeleteId(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-blue-600 text-xl">Cargando tipos de seguros...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong className="font-bold">¡Error!</strong>
                <span className="block sm:inline"> {error}</span>
                <button onClick={() => window.location.reload()} className="ml-4 text-sm underline">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-7xl mx-auto border border-blue-100">
            <h2 className="text-3xl font-bold text-blue-700 mb-8 text-center">Listado de seguros</h2>

            {products.length === 0 ? (
                <div className="text-center text-gray-500 text-lg py-10">
                    No se encontraron productos de seguro.
                </div>
            ) : (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="py-3 px-6">Nombre</th>
                                <th scope="col" className="py-3 px-6">Tipo</th>
                                <th scope="col" className="py-3 px-6">Descripción</th>
                                <th scope="col" className="py-3 px-6">Duración (Meses)</th>
                                <th scope="col" className="py-3 px-6">Prima Base</th>
                                <th scope="col" className="py-3 px-6">Moneda</th>
                                <th scope="col" className="py-3 px-6">Frecuencia de Pago</th>
                                <th scope="col" className="py-3 px-6">Estado</th>
                                <th scope="col" className="py-3 px-6">Notas del Admin</th>
                                <th scope="col" className="py-3 px-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{product.name}</td>
                                    <td className="py-4 px-6">{capitalize(product.type)}</td>
                                    <td className="py-4 px-6 max-w-xs overflow-hidden text-ellipsis">{product.description || 'N/A'}</td>
                                    <td className="py-4 px-6">{product.duration_months || 'N/A'}</td>
                                    <td className="py-4 px-6">{product.base_premium.toFixed(2)}</td>
                                    <td className="py-4 px-6">{product.currency}</td>
                                    <td className="py-4 px-6">{capitalize(product.fixed_payment_frequency)}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 max-w-xs overflow-hidden text-ellipsis">{product.admin_notes || 'N/A'}</td>
                                    <td className="py-4 px-6 whitespace-nowrap">
                                        {/* Botón de Editar */}
                                        <Link
                                            to={`/admin/dashboard/insurance-products/${product.id}/edit`}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                                        >
                                            Editar
                                        </Link>
                                        {/* Botón de Eliminar - SOLO VISIBLE PARA SUPERADMINISTRADORES */}
                                        {currentUserRole === 'superadministrator' && (
                                            <button
                                                onClick={() => handleDeleteClick(product.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Diálogo de Confirmación de Eliminación (Modal) */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que quieres eliminar este producto de seguro? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}