import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from 'src/contexts/useAuth';

const DashboardAdmin = () => {
    const location = useLocation();
    const { user } = useAuth();
    
    const displayName = user?.user_metadata?.full_name || user?.email || 'Administrador';
    const isDashboardRoot = location.pathname === '/admin/dashboard' || location.pathname === '/admin/dashboard/';

    if (isDashboardRoot) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 117px)' }}>
                <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-gray-200">
                    <h1 className="text-4xl font-bold text-blue-800 mb-4">
                        ¡Bienvenido, {displayName}!
                    </h1>
                    <p className="text-lg text-gray-600">
                        Selecciona una opción del menú lateral para comenzar.
                    </p>
                </div>
            </div>
        );
    }
    
    return <Outlet />;
};

export default DashboardAdmin;