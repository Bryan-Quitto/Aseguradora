// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from "react-router-dom";
import Loadable from 'src/layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

// Dashboard (general)
const Dashboard = Loadable(lazy(() => import('../views/dashboards/Dashboard')));

// Dashboard del Administrador (¡Nueva importación!)
const DashboardAdmin = Loadable(lazy(() => import('../features/admin/Dashboard_administrador')));

// utilities
const Typography = Loadable(lazy(() => import("../views/typography/Typography")));
const Table = Loadable(lazy(() => import("../views/tables/Table")));
const Form = Loadable(lazy(() => import("../views/forms/Form")));
const Alert = Loadable(lazy(() => import("../views/alerts/Alerts")));

// icons
const Solar = Loadable(lazy(() => import("../views/icons/Solar")));

const SamplePage = Loadable(lazy(() => import('../views/sample-page/SamplePage')));

// Importa las rutas de autenticación y de la landing page desde sus nuevos archivos
import AuthRoutes from '../features/auth/auth.routes';
import LandingRoutes from '../features/landing/landing.routes';

// Componente para la redirección condicional después del login
// Necesitarás una función o hook para obtener el rol del usuario de Supabase
import { useAuth } from '../contexts/AuthContext'; // Importa useAuth desde la nueva ubicación

interface PrivateRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
    const { user, loading, userRole } = useAuth();

    if (loading) {
        return <div>Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/auth/login" />;
    }

    const currentUserRole = userRole; 

    // Asegurarse de que currentUserRole no sea null antes de usar includes
    if (allowedRoles && currentUserRole && !allowedRoles.includes(currentUserRole)) {
        return <Navigate to="/access-denied" />;
    }

    return children;
};

// Importa el wrapper para editar usuario
import EditarUsuarioWrapper from '../features/admin/ListarUsuarios'; // Asegúrate de que esté exportado correctamente
import ListarSoloUsuarios from '../features/admin/ListarSoloUsuarios'; // Nueva importación
import ListarSoloAgentes from '../features/admin/ListarSoloAgentes';
import ListarSoloAdmins from '../features/admin/ListarSoloAdmins';

const Router = [
    LandingRoutes,
    {
        path: '/',
        element: <FullLayout />,
        children: [
            { path: '/dashboard', exact: true, element: <Dashboard /> },
            {
                path: '/admin/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['admin']}>
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
                children: [
                    { path: 'list-users', element: <DashboardAdmin /> },
                    { path: 'create-users', element: <DashboardAdmin /> },
                    { path: '', element: <DashboardAdmin /> },
                    { path: 'edit-user/:id', element: <EditarUsuarioWrapper /> },
                    { path: 'list-only-users', element: <ListarSoloUsuarios /> }, // Nueva ruta
                    { path: 'list-only-agents', element: <ListarSoloAgentes /> },
                    { path: 'list-only-admins', element: <ListarSoloAdmins /> }
                ]
            },
            {
                path: '/auth/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['admin']}>
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
            },
            { path: '*', element: <Navigate to="/auth/404" /> },
        ],
    },
    AuthRoutes,
    {
        path: '/access-denied',
        element: <BlankLayout />,
        children: [
            { path: '', element: <div>Acceso Denegado. No tienes permisos para ver esta página.</div> }
        ]
    }
];

const router = createBrowserRouter(Router)

export default router;