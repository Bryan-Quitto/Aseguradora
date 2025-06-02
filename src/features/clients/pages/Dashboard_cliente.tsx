import { useLocation, Link, useParams } from 'react-router-dom'; // Importa Link y useParams
import { useAuth } from 'src/contexts/AuthContext';

// Importa los nuevos componentes (los crearemos a continuación)
import ClientPolicyList from './ClientPolicyList';
import ClientPolicyForm from './ClientPolicyForm';
// import ClientPolicyDetail from './ClientPolicyDetail'; // Lo crearemos en un paso posterior

export default function DashboardCliente() {
  const location = useLocation();
  const { profile } = useAuth(); // Obtén el perfil del usuario
  const { id: policyId } = useParams<{ id: string }>(); // Obtiene el ID de la póliza de la URL

  // Construye el nombre completo
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  const renderContent = () => {
    // Definimos un prefijo para las rutas de pólizas del cliente
    const policyPathPrefix = '/client/dashboard/policies';

    if (location.pathname === policyPathPrefix) {
      return <ClientPolicyList />;
    } else if (location.pathname === `${policyPathPrefix}/new`) {
      return <ClientPolicyForm />;
    } else if (location.pathname.startsWith(`${policyPathPrefix}/`)) {
      // Esta ruta capturará /client/dashboard/policies/:id
      return (
        // return <ClientPolicyDetail />; // Descomentar cuando ClientPolicyDetail esté listo
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100">
          <h2 className="text-3xl font-bold text-blue-700 mb-4">Detalle de Póliza</h2>
          <p className="text-lg text-gray-600">Aquí se mostrarán los detalles de la póliza con ID: {policyId}.</p>
          <Link to="/client/dashboard/policies" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">
            Volver a Mis Pólizas
          </Link>
        </div>
      );
    } else {
      return (
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100">
          <h1 className="text-4xl font-bold text-blue-800 mb-4">
            ¡Bienvenido, {fullName || "Cliente"}!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Este es tu panel de control como cliente. Aquí podrás ver tus pólizas y gestionar tu información.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/client/dashboard/policies" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300">
              Ver Mis Pólizas
            </Link>
            <Link to="/client/dashboard/policies/new" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
              Contratar Nueva Póliza
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