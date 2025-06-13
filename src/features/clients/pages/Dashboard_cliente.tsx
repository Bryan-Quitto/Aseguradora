import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/AuthContext';

// Definimos el componente de bienvenida aquí mismo para no crear otro archivo.
const ClientWelcome = () => {
    const { profile } = useAuth();
    const fullName = profile ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim() : '';
    
    return (
        // Este div es el "card" blanco que se centrará.
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100 mx-auto">
            <h1 className="text-4xl font-bold text-blue-800 mb-4">
                ¡Bienvenido, {fullName || "Cliente"}!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
                Este es tu panel de control. Aquí podrás ver tus pólizas y gestionar tu información.
            </p>
            <div className="flex justify-center gap-4">
                <Link to="/client/dashboard/policies" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-300">
                    Ver Mis Pólizas
                </Link>
                <Link to="/client/dashboard/policies/new" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors duration-300">
                    Contratar Nueva Póliza
                </Link>
            </div>
        </div>
    );
};


export default function DashboardCliente() {
  const location = useLocation();
  const isBaseDashboardPath = location.pathname === '/client/dashboard' || location.pathname === '/client/dashboard/';

  return (
    // ESTE ES EL LAYOUT QUE RESTAURAMOS, idéntico al del agente
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {/* 
            Aquí dentro va el contenido que será centrado por el <main>.
            Usamos la misma lógica de antes para decidir qué mostrar.
          */}
          {isBaseDashboardPath ? <ClientWelcome /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}