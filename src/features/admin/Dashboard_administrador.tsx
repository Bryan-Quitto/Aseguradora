import { Outlet, useLocation } from 'react-router-dom'; // Importa Outlet
import { useAuth } from 'src/contexts/AuthContext';

import ListarUsuarios from './ListarUsuarios';
import CrearUsuarios from './CrearUsuarios';
import ListarSoloUsuarios from './ListarSoloUsuarios';
import ListarSoloAgentes from './ListarSoloAgentes';
import ListarSoloAdmins from './ListarSoloAdmins';
import AdminPolicyList from './AdminPolicyList'; // Tampoco necesitas importar este aquí

export default function Dashboard_administrador() { // Renombré para que coincida con tu Router.tsx
  const location = useLocation();
  const { profile } = useAuth();

  // Construye el nombre completo
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  // Puedes mantener una lógica para la "bienvenida" si quieres
  const isDashboardRoot = location.pathname === '/admin/dashboard' || location.pathname === '/admin/dashboard/';

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        {/*
          Tu Menú Lateral (Sidebar) iría aquí.
          Asegúrate de que los enlaces del sidebar usen Link o NavLink de react-router-dom
          y apunten a las rutas correctas (ej. /admin/dashboard/policies).
        */}
        {/* Si tu sidebar está en FullLayout, no lo coloques aquí */}

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {isDashboardRoot ? (
            <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100">
              <h1 className="text-4xl font-bold text-blue-800 mb-4">
                ¡Bienvenido, {fullName || "Administrador"}!
              </h1>
              <p className="text-lg text-gray-600">
                Selecciona una opción del menú lateral para comenzar.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}