import { useAuth } from 'src/contexts/useAuth';
import { Link, Outlet, useLocation } from 'react-router-dom';

const DashboardAgent = () => {
    const location = useLocation();
    const { user } = useAuth();
    
    const displayName = user?.user_metadata?.full_name || user?.email || 'Agente';
    const isBaseDashboard = location.pathname === '/agent/dashboard' || location.pathname === '/agent/dashboard/';

    if (isBaseDashboard) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 117px)' }}>
                <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-4xl text-center border border-gray-200 mx-auto">
                    <h1 className="text-4xl font-bold text-blue-800 mb-4">
                        ¡Bienvenido, {displayName}!
                    </h1>
                    <p className="text-lg text-gray-600 mb-6">
                        Este es tu panel de control. Aquí podrás gestionar tus pólizas y clientes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/agent/dashboard/policies" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300">
                            Gestionar Pólizas
                        </Link>
                        <Link to="/agent/dashboard/applications" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
                            Revisar Solicitudes
                        </Link>
                        <Link to="/agent/dashboard/create-client" className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition duration-300">
                            Crear Cliente
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default DashboardAgent;