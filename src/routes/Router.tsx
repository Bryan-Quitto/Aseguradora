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

// Dashboard del Administrador
const DashboardAdmin = Loadable(lazy(() => import('../features/admin/Dashboard_administrador')));
const AdminPolicyList = Loadable(lazy(() => import('../features/admin/AdminPolicyList')));
const AdminEditPolicy = Loadable(lazy(() => import('../features/admin/AdminEditPolicy'))); // ASUME que tienes o crearás este componente
const AdminCreateInsurance = Loadable(lazy(() => import('../features/admin/AdminCreateInsurance')));
import { EditarUsuarioWrapper } from '../features/admin/EditarUsuario'; // Importa el wrapper
const ListarUsuarios = Loadable(lazy(() => import('../features/admin/ListarUsuarios'))); // Usamos lazy loading aquí
const CrearUsuarios = Loadable(lazy(() => import('../features/admin/CrearUsuarios'))); // ¡Añadido! lazy loading para CrearUsuarios
const CrearClientes = Loadable(lazy(() => import('../features/admin/CrearClientes')));
const ListarSoloUsuarios = Loadable(lazy(() => import('../features/admin/ListarSoloUsuarios')));
const ListarSoloAgentes = Loadable(lazy(() => import('../features/admin/ListarSoloAgentes')));
const ListarSoloAdmins = Loadable(lazy(() => import('../features/admin/ListarSoloAdmins')));
const AdminPolicyForm = Loadable(lazy(() => import('../features/admin/AdminPolicyForm')));
const AdminInsuranceList = Loadable(lazy(() => import('../features/admin/AdminInsuranceList')));
const AdminEditInsurance = Loadable(lazy(() => import('../features/admin/AdminEditInsurance')));

// Dashboard del Agente
const DashboardAgent = Loadable(lazy(() => import('../features/agents/pages/Dashboard_agente')));

// Componentes de Pólizas para Agentes
const AgentPolicyList = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyList')));
const AdminPolicyDetail = Loadable(lazy(() => import('../features/admin/AdminPolicyDetail')));
const AgentPolicyForm = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyForm')));
const AgentPolicyDetail = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyDetail')));
const AgentEditPolicy = Loadable(lazy(() => import('../features/agents/pages/AgentEditPolicy')));

// Componente de Solicitudes para Agentes
const AgentApplicationList = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationList')));
const AgentApplicationDetail = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationDetail')));

// Dashboard del Cliente
const DashboardClient = Loadable(lazy(() => import('../features/clients/pages/Dashboard_cliente')));

// Componentes de Pólizas para Clientes
const ClientPolicyList = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyList')));
const ClientPolicyForm = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyForm')));
const ClientPolicyDetail = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyDetail')));
const ContractSignature = Loadable(lazy(() => import('../features/clients/pages/ContractSignature')));
const ClientDocumentUpload = Loadable(lazy(() => import('../features/clients/pages/ClientDocumentUpload')));

// ¡NUEVA IMPORTACIÓN! Componente para Agente para enviar link de firma
const AgentCreateSignatureLink = Loadable(lazy(() => import('../features/agents/pages/AgentCreateSignatureLink')));

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
                    <PrivateRoute allowedRoles={['admin', 'superadministrator']}>
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
                children: [
                    { path: '', element: <Navigate to="list-users" /> }, // Redirige por defecto a listar usuarios
                    { path: 'list-users', element: <ListarUsuarios /> },
                    { path: 'create-users', element: <CrearUsuarios /> },
                    { path: 'create-clients', element: <CrearClientes /> },
                    { path: 'edit-user/:id', element: <EditarUsuarioWrapper /> },
                    { path: 'list-only-users', element: <ListarSoloUsuarios /> },
                    { path: 'list-only-agents', element: <ListarSoloAgentes /> },
                    { path: 'list-only-admins', element: <ListarSoloAdmins /> },
                    { path: 'policies', element: <AdminPolicyList /> },
                    { path: 'policies/:id', element: <AdminPolicyDetail /> },
                    { path: 'policies/:id/edit', element: <AdminEditPolicy /> },
                    { path: 'create-insurance', element: <AdminCreateInsurance /> },
                    { path: 'policies/new', element: <AdminPolicyForm /> },
                    { path: 'insurance-products', element: <AdminInsuranceList /> },
                    { path: 'insurance-products/:id/edit', element: <AdminEditInsurance /> },
                ]
            },
            // Rutas para AGENTE
            {
                path: '/agent/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['agent']}>
                        <DashboardAgent />
                    </PrivateRoute>
                ),
                children: [
                    { path: 'policies/new', element: <AgentPolicyForm /> },
                    { path: 'policies/:id', element: <AgentPolicyDetail /> },
                    { path: 'policies', element: <AgentPolicyList /> },
                    { path: 'applications', element: <AgentApplicationList /> },
                    { path: 'applications/:id', element: <AgentApplicationDetail /> },
                    { path: '', element: <Navigate to="policies" /> },
                    { path: 'send-signature-link', element: <AgentCreateSignatureLink /> },
                ]
            },
            // RUTA ESPECÍFICA DE EDICIÓN DE PÓLIZAS PARA AGENTES
            {
                path: '/agent/dashboard/policies/:policyId/edit',
                element: (
                    <PrivateRoute allowedRoles={['agent']}>
                        <AgentEditPolicy />
                    </PrivateRoute>
                ),
            },

            // Rutas para CLIENTE
            {
                path: '/client/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['client']}>
                        {/* El elemento padre es simplemente el componente switcher */}
                        <DashboardClient /> 
                    </PrivateRoute>
                ),
                children: [
                    // Las rutas hijas se renderizarán dentro del <Outlet />
                    { path: 'policies', element: <ClientPolicyList /> },
                    { path: 'policies/new', element: <ClientPolicyForm /> },
                    { path: 'policies/:id', element: <ClientPolicyDetail /> },
                    { path: 'documents', element: <ClientDocumentUpload /> },
                ]
            },

            // Probable ruta duplicada/redundante que deberías revisar
            {
                path: '/auth/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['admin']}>
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
            },
            {
                // Esta es la ruta para la página de firma a la que redirige el magic link
                // ¡IMPORTANTE! Se ha quitado el PrivateRoute para que el magic link pueda funcionar
                // El componente ContractSignature.tsx es el responsable de verificar la sesión.
                path: 'contract-signature',
                element: <ContractSignature />,
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