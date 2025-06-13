// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy, ReactNode } from 'react'; // Añadido ReactNode para tipar
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
const AdminEditPolicy = Loadable(lazy(() => import('../features/admin/AdminEditPolicy')));
const AdminCreateInsurance = Loadable(lazy(() => import('../features/admin/AdminCreateInsurance')));
import { EditarUsuarioWrapper } from '../features/admin/EditarUsuario';
const ListarUsuarios = Loadable(lazy(() => import('../features/admin/ListarUsuarios')));
const CrearUsuarios = Loadable(lazy(() => import('../features/admin/CrearUsuarios')));
const CrearClientes = Loadable(lazy(() => import('../features/admin/CrearClientes')));
const ListarSoloUsuarios = Loadable(lazy(() => import('../features/admin/ListarSoloUsuarios')));
const ListarSoloAgentes = Loadable(lazy(() => import('../features/admin/ListarSoloAgentes')));
const ListarSoloAdmins = Loadable(lazy(() => import('../features/admin/ListarSoloAdmins')));
const AdminPolicyForm = Loadable(lazy(() => import('../features/admin/AdminPolicyForm')));
const AdminInsuranceList = Loadable(lazy(() => import('../features/admin/AdminInsuranceList')));
const AdminEditInsurance = Loadable(lazy(() => import('../features/admin/AdminEditInsurance')));

// Dashboard del Agente
const DashboardAgent = Loadable(lazy(() => import('../features/agents/pages/Dashboard_agente')));
const AgentPolicyList = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyList')));
const AdminPolicyDetail = Loadable(lazy(() => import('../features/admin/AdminPolicyDetail')));
const AgentPolicyForm = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyForm')));
const AgentPolicyDetail = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyDetail')));
const AgentEditPolicy = Loadable(lazy(() => import('../features/agents/pages/AgentEditPolicy')));
// CORRECCIÓN 1: Asegúrate de que el nombre del archivo en tu explorador sea 'CrearCliente.tsx' (con 'C' mayúscula)
const CrearClienteAgente  = Loadable(lazy(() => import('../features/agents/pages/CrearClienteAgente')));
const AgentApplicationList = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationList')));
const AgentApplicationDetail = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationDetail')));

// Dashboard del Cliente
const DashboardClient = Loadable(lazy(() => import('../features/clients/pages/Dashboard_cliente')));
const ClientPolicyList = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyList')));
const ClientPolicyForm = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyForm')));
const ClientPolicyDetail = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyDetail')));
const ContractSignature = Loadable(lazy(() => import('../features/clients/pages/ContractSignature')));
const ClientDocumentUpload = Loadable(lazy(() => import('../features/clients/pages/ClientDocumentUpload')));

const AgentCreateSignatureLink = Loadable(lazy(() => import('../features/agents/pages/AgentCreateSignatureLink')));

import AuthRoutes from '../features/auth/auth.routes';
import LandingRoutes from '../features/landing/landing.routes';

import { useAuth } from '../contexts/AuthContext';
// CORRECCIÓN 2: Eliminamos la importación de 'path' que no se usa.
// import path from 'path';

interface PrivateRouteProps {
    children: ReactNode; // Tipado correcto
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

// Renombrado para evitar conflicto de nombres.
const RouterConfig = [
    LandingRoutes,
    {
        path: '/',
        element: <FullLayout />,
        children: [
            // 'exact' ya no se usa en react-router-dom v6
            { path: '/dashboard', element: <Dashboard /> },
            {
                path: '/admin/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['admin', 'superadministrator']}>
                        <DashboardAdmin />
                    </PrivateRoute>
                ),
                children: [
                    { path: '', element: <Navigate to="list-users" /> },
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
                    {path: 'create-client', element: <CrearClienteAgente />},
                    { path: 'send-signature-link', element: <AgentCreateSignatureLink /> },
                ]
            },
            {
                path: '/agent/dashboard/policies/:policyId/edit',
                element: (
                    <PrivateRoute allowedRoles={['agent']}>
                        <AgentEditPolicy />
                    </PrivateRoute>
                ),
            },
            {
                path: '/client/dashboard',
                element: (
                    <PrivateRoute allowedRoles={['client']}>
                        <DashboardClient /> 
                    </PrivateRoute>
                ),
                children: [
                    // Tu lógica de bienvenida ya está en DashboardClient, así que una redirección por defecto es una buena opción
                    { path: '', element: <Navigate to="policies" /> },
                    { path: 'policies', element: <ClientPolicyList /> },
                    { path: 'policies/new', element: <ClientPolicyForm /> },
                    { path: 'policies/:id', element: <ClientPolicyDetail /> },
                    { path: 'documents', element: <ClientDocumentUpload /> },
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
            {
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

const router = createBrowserRouter(RouterConfig);

export default router;