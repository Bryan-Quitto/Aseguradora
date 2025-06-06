// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from "react-router-dom";
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import EditarUsuario from '../features/admin/EditarUsuario'; // Asegúrate de que esté exportado correctamente

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout'))); // Asegúrate de que esta ruta sea correcta para tu proyecto

// Dashboard (general)
const Dashboard = Loadable(lazy(() => import('../views/dashboards/Dashboard')));

// Dashboard del Administrador
const DashboardAdmin = Loadable(lazy(() => import('../features/admin/Dashboard_administrador')));

// Dashboard del Agente
const DashboardAgent = Loadable(lazy(() => import('../features/agents/pages/Dashboard_agente')));

// Dashboard del Cliente
const DashboardClient = Loadable(lazy(() => import('../features/clients/pages/Dashboard_cliente')));

// Componentes de Pólizas para Agentes
const AgentPolicyList = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyList')));
const AgentPolicyForm = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyForm')));
const AgentPolicyDetail = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyDetail')));
const AgentEditPolicy = Loadable(lazy(() => import('../features/agents/pages/AgentEditPolicy'))); // lazy loading

// Componente de Solicitudes para Agentes
const AgentApplicationList = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationList')));
const AgentApplicationDetail = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationDetail')));

// Componentes de Pólizas para Clientes
const ClientPolicyList = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyList')));
const ClientPolicyForm = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyForm')));
const ClientPolicyDetail = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyDetail')));
const ClientEditPolicy = Loadable(lazy(() => import('../features/clients/pages/ClientEditPolicy'))); // lazy loading


// utilities
const Typography = Loadable(lazy(() => import("../components/typography/BasicTypography")));
const Table = Loadable(lazy(() => import("../views/tables/Table")));
const Form = Loadable(lazy(() => import("../components/forms/BasicForm")));
const Alert = Loadable(lazy(() => import("../components/alerts/BasicAlerts")));

// Importa las rutas de autenticación y de la landing page desde sus nuevos archivos
import AuthRoutes from '../features/auth/auth.routes';
import LandingRoutes from '../features/landing/landing.routes';

// Componente para la redirección condicional después del login
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
                    { path: 'list-only-users', element: <ListarSoloUsuarios /> },
                    { path: 'list-only-agents', element: <ListarSoloAgentes /> },
                    { path: 'list-only-admins', element: <ListarSoloAdmins /> }
                ]
            },
            // Rutas para AGENTE
            {
                path: '/agent/dashboard', // Mantén el dashboard general del agente
                element: (
                    <PrivateRoute allowedRoles={['agent']}>
                        <DashboardAgent />
                    </PrivateRoute>
                ),
                children: [
                    { path: 'policies/new', element: <AgentPolicyForm /> },
                    { path: 'policies/:id', element: <AgentPolicyDetail /> }, // Ruta de detalle sigue aquí
                    { path: 'policies', element: <AgentPolicyList /> },
                    { path: 'applications', element: <AgentApplicationList /> },
                    { path: 'applications/:id', element: <AgentApplicationDetail /> },
                    { path: '', element: <Navigate to="policies" /> },
                ]
            },
            // RUTA ESPECÍFICA DE EDICIÓN DE PÓLIZAS PARA AGENTES (NUEVA UBICACIÓN)
            // Esta ruta se define FUERA de los `children` de `DashboardAgent`
            // para evitar la colisión con `:id` en el mismo nivel de enrutamiento.
            {
                path: '/agent/dashboard/policies/:policyId/edit', // La misma URL que antes
                element: (
                    <PrivateRoute allowedRoles={['agent']}>
                        {/* Renderizamos directamente AgentEditPolicy aquí, sin el DashboardAgent como layout */}
                        <AgentEditPolicy />
                    </PrivateRoute>
                ),
            },

            // Rutas para CLIENTE
            {
                path: '/client/dashboard', // Mantén el dashboard general del cliente
                element: (
                    <PrivateRoute allowedRoles={['client']}>
                        <DashboardClient />
                    </PrivateRoute>
                ),
                children: [
                    { path: 'policies/new', element: <ClientPolicyForm /> },
                    { path: 'policies/:id', element: <ClientPolicyDetail /> }, // Ruta de detalle sigue aquí
                    { path: 'policies', element: <ClientPolicyList /> },
                    { path: '', element: <Navigate to="policies" /> },
                ]
            },
            // RUTA ESPECÍFICA DE EDICIÓN DE PÓLIZAS PARA CLIENTES (NUEVA UBICACIÓN)
            {
                path: '/client/dashboard/policies/:policyId/edit', // La misma URL que antes
                element: (
                    <PrivateRoute allowedRoles={['client']}>
                        {/* Renderizamos directamente ClientEditPolicy aquí */}
                        <ClientEditPolicy />
                    </PrivateRoute>
                ),
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

const router = createBrowserRouter(Router);

export default router;