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

const Router = [
    LandingRoutes, // Incluye las rutas de la landing page aquí
    {
        path: '/',
        element: <FullLayout />,
        children: [
            // { path: '/', exact: true, element: <LandingPage /> }, // Ya no es necesario aquí
            { path: '/dashboard', exact: true, element: <Dashboard /> }, // Dashboard general para usuarios normales (si lo deseas)
            {
                path: '/admin/dashboard', // Ruta específica para el dashboard del administrador
                element: (
                    <PrivateRoute allowedRoles={['admin']}> {/* Protege esta ruta solo para administradores */}
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
                children: [
                    { path: 'list-users', element: <DashboardAdmin /> }, // Child route for ListarUsuarios
                    { path: 'create-users', element: <DashboardAdmin /> }, // Child route for CrearUsuarios
                    { path: '', element: <DashboardAdmin /> }, // Default child route for /admin/dashboard
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
    AuthRoutes, // Incluye las rutas de autenticación aquí
    {
        path: '/access-denied', // Ruta para acceso denegado
        element: <BlankLayout />, // O un layout simple
        children: [
            { path: '', element: <div>Acceso Denegado. No tienes permisos para ver esta página.</div> }
        ]
    }
];

const router = createBrowserRouter(Router)

export default router;