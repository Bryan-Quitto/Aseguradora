import { useAuth } from 'src/contexts/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function DashboardAgente() {
  const location = useLocation();
  const { profile } = useAuth();

  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  const isBaseDashboard = location.pathname === '/agent/dashboard' || location.pathname === '/agent/dashboard/';

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        {/* Menú Lateral (aquí iría el Sidebar) */}

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {isBaseDashboard ? (
            <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-4xl text-center border border-blue-100 mx-auto">
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
                <Link to="/agent/dashboard/create-client" className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-300">
                  Crear Cliente
                </Link>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}