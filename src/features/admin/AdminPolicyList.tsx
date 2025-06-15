import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import { Policy, getAllPolicies, getInsuranceProductById } from '../policies/policy_management';
import { getClientProfileById } from '../clients/hooks/cliente_backend';

type PolicyWithDetails = Policy & { 
  numero_identificacion: string; 
  product_id: string;
};

interface Document {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string;
  document_type?: string;
}

async function getPolicyDocumentsForDeletion(policyId: string): Promise<{ data: Document[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('policy_documents') 
      .select('id, document_name, file_path')
      .eq('policy_id', policyId);

    if (error) {
      throw new Error(`Error al cargar documentos para eliminación: ${error.message}`);
    }
    return { data: data as Document[], error: null };
  } catch (err) {
    console.error(`Error en getPolicyDocumentsForDeletion para policyId ${policyId}:`, err);
    return { data: null, error: err };
  }
}

export default function AdminPolicyList() {
  const [policies, setPolicies] = useState<PolicyWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());
  const [searchCedula, setSearchCedula] = useState('');
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<PolicyWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const setupAuthAndRole = async () => {
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError("Error de autenticación. Por favor, intente recargar.");
        setUserRole(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          setError(`Error al cargar el rol de usuario: ${profileError.message}.`);
          setUserRole(null);
          setLoading(false);
        } else if (profileData?.role) {
          setUserRole(profileData.role);
        } else {
            setError("No se encontró el perfil o rol de usuario. Acceso denegado.");
            setUserRole(null);
            setLoading(false);
        }
      } else {
        setUserRole(null);
        setLoading(false);
      }
    };

    setupAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              setUserRole(null);
            } else if (profileData?.role) {
              setUserRole(profileData.role);
            } else {
              setUserRole(null);
            }
          });
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchPoliciesAndDetails = async () => {
      if (userRole === null) return; 

      setLoading(true);
      setError(null);
      setDeleteStatusMessage(null);

      try {
        const { data: policiesData, error: policiesError } = await getAllPolicies();
        if (policiesError) {
          setError('Error al cargar las pólizas.');
          return;
        }

        if (policiesData) {
          const uniqueClientIds = new Set(policiesData.map(p => p.client_id));
          const uniqueProductIds = new Set(policiesData.map(p => p.product_id));

          const newClientNames = new Map<string, string>();
          const cedulasPorCliente = new Map<string, string>();
          for (const clientId of uniqueClientIds) {
            const { data: clientData } = await getClientProfileById(clientId);
            if (clientData) {
              newClientNames.set(clientId, clientData.full_name || `${clientData.primer_nombre || ''} ${clientData.primer_apellido || ''}`.trim() || 'Nombre no disponible');
              cedulasPorCliente.set(clientId, clientData.numero_identificacion || '');
            }
          }
          setClientNames(newClientNames);

          const policiesWithCedula = policiesData.map(policy => ({
            ...policy,
            numero_identificacion: cedulasPorCliente.get(policy.client_id) || '',
            product_id: policy.product_id, 
          }));
          setPolicies(policiesWithCedula);

          const newProductNames = new Map<string, string>();
          for (const productId of uniqueProductIds) {
            const { data: productData } = await getInsuranceProductById(productId);
            if (productData) {
              newProductNames.set(productId, productData.name);
            }
          }
          setProductNames(newProductNames);
        }
      } catch (err: any) {
        setError('Ocurrió un error inesperado al cargar los datos.');
      } finally {
        setLoading(false);
      }
    };

    if (userRole !== null) { 
      fetchPoliciesAndDetails();
    }
  }, [userRole]);

  const filteredPolicies = policies.filter((policy) => {
    return searchCedula === '' || policy.numero_identificacion.startsWith(searchCedula);
  });

  const confirmDeletePolicy = (policy: PolicyWithDetails) => {
    setPolicyToDelete(policy);
    setShowDeleteModal(true);
  };

  const executeDeletePolicy = async () => {
    if (!policyToDelete) return; 

    setIsDeleting(true); 
    setError(null); 
    setDeleteStatusMessage(null); 
    setShowDeleteModal(false); 

    try {
      const { data: documents } = await getPolicyDocumentsForDeletion(policyToDelete.id);
      if (documents && documents.length > 0) {
        const filePaths = documents.map(doc => doc.file_path);
        await supabase.storage.from('documents').remove(filePaths);
        await supabase.from('policy_documents').delete().eq('policy_id', policyToDelete.id);
      }

      const { error: policyDeleteError } = await supabase
        .from('policies')
        .delete()
        .eq('id', policyToDelete.id);
      if (policyDeleteError) throw new Error(`Error al eliminar la póliza: ${policyDeleteError.message}`);

      setPolicies(prevPolicies => prevPolicies.filter(p => p.id !== policyToDelete.id));
      setDeleteStatusMessage(`Póliza ${policyToDelete.policy_number} eliminada exitosamente.`);
      setPolicyToDelete(null); 
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar la póliza.');
      setDeleteStatusMessage(`Error al eliminar la póliza: ${err.message}`);
    } finally {
      setIsDeleting(false); 
    }
  };

  if (loading || userRole === null) { 
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando pólizas y verificando permisos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  if (userRole !== 'superadministrator') {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-2xl font-bold mb-4">Acceso Denegado</h2>
        <p className="mb-4 text-lg">
          No tienes los permisos necesarios para acceder a esta página.
        </p>
        <Link
          to="/admin/dashboard"
          className="mt-6 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg shadow-md"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl border border-blue-100 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Todas las Pólizas del Sistema</h2>
        <Link
          to="/admin/dashboard/policies/new" 
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          Crear Nueva Póliza
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por cédula..."
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={searchCedula}
          maxLength={10}
          inputMode="numeric"
          pattern="\d*"
          onChange={e => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
            setSearchCedula(value);
          }}
        />
      </div>

      {deleteStatusMessage && (
        <div className={`mb-4 p-3 rounded-md text-center ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {deleteStatusMessage}
        </div>
      )}

      {filteredPolicies.length === 0 ? (
        <p className="text-lg text-gray-600 text-center py-10">
          No hay pólizas que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Póliza
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Prima
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPolicies.map((policy) => {
                const clientFullName = clientNames.get(policy.client_id) || 'Cargando...';
                const productName = productNames.get(policy.product_id) || 'Cargando...';

                return (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {policy.policy_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {clientFullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {policy.numero_identificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${policy.premium_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        policy.status === 'active' ? 'bg-green-100 text-green-800' :
                        policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        policy.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        policy.status === 'expired' ? 'bg-gray-400 text-gray-900' :
                        policy.status === 'awaiting_signature' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {policy.status.charAt(0).toUpperCase() + policy.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/admin/dashboard/policies/${policy.id}`} 
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Ver Detalles
                      </Link>
                      <Link
                        to={`/admin/dashboard/policies/${policy.id}/edit`} 
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Editar
                      </Link>
                      {userRole === 'superadministrator' && (
                        <button
                          onClick={() => confirmDeletePolicy(policy)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteModal && policyToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación de Póliza</h3>
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas eliminar la póliza "<span className="font-semibold">{policyToDelete.policy_number}</span>" (Cliente: <span className="font-semibold">{clientNames.get(policyToDelete.client_id) || 'Cargando...'}</span>)?
              Esta acción eliminará también todos los documentos y registros asociados a esta póliza y no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={executeDeletePolicy}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Póliza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}