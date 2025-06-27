import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from 'src/contexts/useAuth';

const DashboardClient = () => {
    const location = useLocation();
    const { user } = useAuth();

    const displayName = user?.user_metadata?.full_name || user?.email || 'Cliente';
    const isBaseDashboardPath = location.pathname === '/client/dashboard' || location.pathname === '/client/dashboard/';

    if (isBaseDashboardPath) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 117px)' }}>
                <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-gray-200 mx-auto">
                    <h1 className="text-4xl font-bold text-blue-800 mb-4">
                        ¡Bienvenido, {displayName}!
                    </h1>
                    <p className="text-lg text-gray-600 mb-6">
                        Este es tu panel de control. Gestiona tus pólizas y solicita reembolsos.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/client/dashboard/policies" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-300">
                            Ver Mis Pólizas
                        </Link>
                        <Link to="/client/dashboard/reimbursements" className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors duration-300">
                            Mis Reembolsos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    
    return <Outlet />;
};

export default DashboardClient;