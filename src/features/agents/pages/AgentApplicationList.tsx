import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/useAuth';
import { Policy, getPoliciesByAgentId, getInsuranceProductById } from '../../policies/policy_management';
import { getClientProfileById } from '../../clients/hooks/cliente_backend';

export default function AgentApplicationList() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [clientCedulas, setClientCedulas] = useState<Map<string, string>>(new Map());
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());
  const [searchCedula, setSearchCedula] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) {
        setError('No se pudo cargar el ID del agente.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: policiesData, error: policiesError } = await getPoliciesByAgentId(user.id);

      if (policiesError) {
        setError('Error al cargar las solicitudes.');
        setLoading(false);
        return;
      }

      if (policiesData) {
        const filteredApplications = policiesData.filter(
          policy => policy.status === 'pending' || policy.status === 'awaiting_signature'
        );
        
        filteredApplications.sort((a, b) => {
            if (a.status === 'awaiting_signature' && b.status !== 'awaiting_signature') return -1;
            if (a.status !== 'awaiting_signature' && b.status === 'awaiting_signature') return 1;
            return 0;
        });

        setApplications(filteredApplications);

        const uniqueClientIds = new Set(filteredApplications.map(p => p.client_id));
        const uniqueProductIds = new Set(filteredApplications.map(p => p.product_id));

        const newClientNames = new Map<string, string>();
        const newClientCedulas = new Map<string, string>();
        for (const clientId of uniqueClientIds) {
            const { data: clientData } = await getClientProfileById(clientId);
            if (clientData) {
              newClientNames.set(clientId, clientData.full_name || `${clientData.primer_nombre || ''} ${clientData.primer_apellido || ''}`.trim() || 'N/A');
              newClientCedulas.set(clientId, clientData.numero_identificacion || '');
            }
        }
        setClientNames(newClientNames);
        setClientCedulas(newClientCedulas);

        const newProductNames = new Map<string, string>();
        for (const productId of uniqueProductIds) {
            const { data: productData } = await getInsuranceProductById(productId);
            if (productData) {
              newProductNames.set(productId, productData.name);
            }
        }
        setProductNames(newProductNames);
      }
      setLoading(false);
    };

    if (user?.id) {
      fetchApplications();
    }
  }, [user?.id]);

  const filteredApplications = applications.filter((app) => {
    const cedula = clientCedulas.get(app.client_id) || '';
    return searchCedula === '' || cedula.startsWith(searchCedula);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando solicitudes...</p>
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl border border-blue-100 mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-6">Solicitudes Pendientes de Revisión</h2>

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

      {filteredApplications.length === 0 ? (
        <p className="text-lg text-gray-600 text-center py-10">
          No hay solicitudes pendientes de revisión en este momento.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Póliza</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.policy_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{clientNames.get(app.client_id) || 'Cargando...'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{clientCedulas.get(app.client_id) || 'Cargando...'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{productNames.get(app.product_id) || 'Cargando...'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'awaiting_signature' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {app.status === 'awaiting_signature' ? 'Revisión de Firma' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/agent/dashboard/applications/${app.id}`} className="text-blue-600 hover:text-blue-900 mr-4">Revisar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}