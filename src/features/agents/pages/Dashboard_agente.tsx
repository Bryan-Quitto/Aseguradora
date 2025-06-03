import { useLocation, Link, useParams } from 'react-router-dom'; // Importa Link y useParams
import { useAuth } from 'src/contexts/AuthContext';

// Importa los nuevos componentes
import AgentPolicyList from './AgentPolicyList';
import AgentPolicyForm from './AgentPolicyForm';
import AgentPolicyDetail from './AgentPolicyDetail'; // Importa el componente de detalle de póliza
import AgentApplicationList from './AgentApplicationList'; // Importa el componente de lista de solicitudes
import AgentApplicationDetail from './AgentApplicationDetail'; // Importa el componente de detalle de solicitud

export default function DashboardAgente() {
  const location = useLocation();
  const { profile } = useAuth(); // Obtén el perfil del usuario
  const { id: policyId } = useParams<{ id: string }>(); // Obtiene el ID de la póliza de la URL
  const { id: applicationId } = useParams<{ id: string }>(); // Obtiene el ID de la solicitud de la URL

  // Construye el nombre completo
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  const renderContent = () => {
    // Definimos un prefijo para las rutas de pólizas del agente
    const policyPathPrefix = '/agent/dashboard/policies';
    // Definimos un prefijo para las rutas de solicitudes del agente
    const applicationPathPrefix = '/agent/dashboard/applications';

    if (location.pathname === policyPathPrefix) {
      return <AgentPolicyList />; // Vista para listar pólizas
    } else if (location.pathname === `${policyPathPrefix}/new`) {
      return <AgentPolicyForm />; // Vista para crear nueva póliza
    } else if (location.pathname.startsWith(`${policyPathPrefix}/`)) {
      // Esta ruta capturará /agent/dashboard/policies/:id
      return <AgentPolicyDetail />; // Renderiza el componente de detalle de póliza
    } else if (location.pathname === applicationPathPrefix) {
      return <AgentApplicationList />; // Vista para listar solicitudes de seguro
    } else if (location.pathname.startsWith(`${applicationPathPrefix}/`)) {
      // Esta ruta capturará /agent/dashboard/applications/:id
      return <AgentApplicationDetail />; // Renderiza el componente de detalle de solicitud
    } else {
      // Contenido por defecto si la ruta no coincide con ninguna específica
      return (
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100">
          <h1 className="text-4xl font-bold text-blue-800 mb-4">
            ¡Bienvenido, {fullName || "Agente"}!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Este es tu panel de control como agente. Aquí podrás gestionar tus pólizas y clientes.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/agent/dashboard/policies" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300">
              Ver y gestionar pólizas
            </Link>
            <Link to="/agent/dashboard/applications" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
              Revisar solicitudes
            </Link>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        {/* Menú Lateral (aquí iría el Sidebar) */}

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}