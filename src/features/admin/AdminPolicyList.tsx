import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase/client'; // ¡Ruta corregida a tu cliente Supabase!
// RUTA CORREGIDA: Ajuste para que apunte correctamente a policy_management.ts
import { Policy, getAllPolicies, deletePolicy } from '../policies/policy_management'; // Importa deletePolicy

/**
 * Componente para mostrar una lista de todas las pólizas disponibles para los administradores.
 * Permite ver un resumen de cada póliza y navegar a sus detalles.
 */
export default function AdminPolicyList() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false); // Estado para controlar la visibilidad del modal de confirmación
    const [policyToDeleteId, setPolicyToDeleteId] = useState<string | null>(null); // Estado para guardar el ID de la póliza a eliminar
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // Estado para el rol del usuario actual

    /**
     * Hook useEffect para cargar todas las pólizas al montar el componente.
     * También, para obtener el rol del usuario autenticado.
     */
    useEffect(() => {
        const fetchPoliciesAndUserRole = async () => {
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
                        // Si el usuario está autenticado pero no está en la tabla 'administrators',
                        // podemos asumir que no es un administrador para este contexto,
                        // o podrías consultar la tabla 'profiles' para su rol general si lo necesitas.
                        // Para este caso, simplemente no establecemos un admin_role, lo que por defecto
                        // evitará que vea el botón de eliminar.
                        setCurrentUserRole(null); // O un rol por defecto como 'client' si lo manejas así
                    }
                } else {
                    // Si no hay usuario autenticado, no hay rol de administrador
                    setCurrentUserRole(null);
                }

                // 3. Llama a la función getAllPolicies
                const { data, error: policiesError } = await getAllPolicies();
                if (policiesError) {
                    setError('No se pudieron cargar las pólizas: ' + policiesError.message);
                    console.error('Error al obtener pólizas:', policiesError);
                } else {
                    setPolicies(data || []);
                }
            } catch (e: any) {
                setError('Ocurrió un error inesperado al cargar los datos: ' + e.message);
                console.error('Error inesperado:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchPoliciesAndUserRole();
    }, []); // El array vacío asegura que este efecto se ejecuta una sola vez al montar el componente

    /**
     * Maneja el clic en el botón de eliminar.
     * Guarda el ID de la póliza y muestra el diálogo de confirmación.
     * @param policyId El ID de la póliza a eliminar.
     */
    const handleDeleteClick = (policyId: string) => {
        setPolicyToDeleteId(policyId);
        setShowConfirmDialog(true);
    };

    /**
     * Cancela la operación de eliminación y cierra el diálogo de confirmación.
     */
    const cancelDelete = () => {
        setPolicyToDeleteId(null);
        setShowConfirmDialog(false);
    };

    /**
     * Confirma la eliminación de la póliza.
     * Aquí iría la lógica para llamar a tu API de Supabase para eliminar el registro.
     */
    const confirmDelete = async () => {
        if (policyToDeleteId) {
            setLoading(true); // Opcional: mostrar un estado de carga mientras se elimina
            const { error: deleteError } = await deletePolicy(policyToDeleteId); // Llama a la función de eliminación

            if (deleteError) {
                setError('Error al eliminar la póliza: ' + deleteError.message);
                console.error('Error de eliminación:', deleteError);
            } else {
                // Si la eliminación es exitosa, cierra el modal y recarga la lista de pólizas
                setShowConfirmDialog(false);
                setPolicyToDeleteId(null);
                // Vuelve a cargar las pólizas para reflejar el cambio
                const { data, error: fetchError } = await getAllPolicies();
                if (fetchError) {
                    setError('No se pudieron recargar las pólizas después de la eliminación: ' + fetchError.message);
                } else {
                    setPolicies(data || []);
                }
            }
            setLoading(false); // Finaliza el estado de carga
        }
    };


    // Muestra un indicador de carga mientras se obtienen los datos
    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <p className="text-blue-600 text-lg">Cargando pólizas...</p>
            </div>
        );
    }

    // Muestra un mensaje de error si algo salió mal durante la carga
    if (error) {
        return (
            <div className="flex justify-center items-center h-48">
                <p className="text-red-500 text-lg">Error: {error}</p>
            </div>
        );
    }

    // Muestra un mensaje si no hay pólizas registradas después de la carga
    if (policies.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 text-center">
                <h2 className="text-3xl font-bold text-blue-700 mb-6">Lista de Pólizas</h2>
                <p className="text-gray-600">No hay pólizas registradas en el sistema.</p>
            </div>
        );
    }

    // Si hay pólizas, las muestra en una tabla
    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-5xl border border-blue-100 mx-auto">
            <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Lista de pólizas</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Póliza</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Fin</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Premium</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th> {/* Nueva columna */}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {policies.map((policy) => (
                            <tr key={policy.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.policy_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                        policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        policy.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.start_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.end_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.premium_amount.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                    <div className="flex items-center space-x-2"> {/* Contenedor para los botones de acción */}
                                        <Link
                                            to={`/admin/dashboard/policies/${policy.id}`}
                                            className="text-blue-600 hover:text-blue-900 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Ver Detalles
                                        </Link>
                                        <Link
                                            to={`/admin/dashboard/policies/${policy.id}/edit`}
                                            className="text-green-600 hover:text-green-900 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            Editar
                                        </Link>
                                        {/* Botón de Eliminar - SOLO VISIBLE PARA SUPERADMINISTRADORES */}
                                        {currentUserRole === 'superadministrator' && (
                                            <button
                                                onClick={() => handleDeleteClick(policy.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Diálogo de Confirmación de Eliminación (Modal) */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que quieres eliminar esta póliza? Esta acción no se puede deshacer.
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