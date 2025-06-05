// src/features/clients/components/DashboardCliente.tsx (or wherever DashboardCliente is defined)
import React from 'react';
import { Outlet, Link, useParams } from 'react-router-dom'; // Importa Outlet
import { useAuth } from 'src/contexts/AuthContext'; // Asumo que el perfil es para mostrar el saludo inicial.

// No necesitas importar ClientPolicyList, ClientPolicyForm, ClientPolicyDetail aquí,
// porque React Router se encarga de renderizarlos a través del <Outlet />
// import ClientPolicyList from './ClientPolicyList';
// import ClientPolicyForm from './ClientPolicyForm';
// import ClientPolicyDetail from './ClientPolicyDetail';

export default function DashboardCliente() {
  // Solo necesitas el perfil para el mensaje de bienvenida en la ruta raíz de DashboardCliente.
  const { profile } = useAuth();
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  // `policyId` de useParams solo sería relevante si DashboardCliente fuera el que maneja el useParams,
  // pero en tu setup, ClientPolicyDetail lo maneja. Así que, si no lo usas aquí, puedes quitarlo.
  // const { id: policyId } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        {/* Menú Lateral (aquí iría el Sidebar) */}

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {/*
            El contenido de la ruta principal /client/dashboard debe ir aquí.
            Para rutas anidadas como /client/dashboard/policies o /client/dashboard/policies/:id,
            se usa <Outlet />.

            Si la ruta actual es exactamente /client/dashboard, puedes mostrar el mensaje de bienvenida.
            De lo contrario, <Outlet /> manejará el renderizado de los componentes hijos.
          */}
          {/* Example: Display welcome message ONLY if on the base client dashboard route */}
          {window.location.pathname === '/client/dashboard' || window.location.pathname === '/client/dashboard/' ? (
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
          ) : (
            // For all other nested routes (e.g., /policies, /policies/:id, /policies/new)
            // React Router will render the appropriate component here.
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}