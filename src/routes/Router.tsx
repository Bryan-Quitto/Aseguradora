import { lazy, ReactNode } from 'react';
import { Navigate, createBrowserRouter } from "react-router-dom";
import Loadable from 'src/layouts/full/shared/loadable/Loadable';

const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

const Dashboard = Loadable(lazy(() => import('../views/dashboards/Dashboard')));

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
const AdminPolicyDetail = Loadable(lazy(() => import('../features/admin/AdminPolicyDetail')));
const AdminReimbursementList = Loadable(lazy(() => import('../features/admin/reimbursements/AdminReimbursementList')));
const AdminReimbursementDetail = Loadable(lazy(() => import('../features/admin/reimbursements/AdminReimbursementDetail')));
const AdminManageRequiredDocs = Loadable(lazy(() => import('../features/admin/reimbursements/AdminManageRequiredDocs')));
const AdminEditReimbursement = Loadable(lazy(() => import('../features/admin/reimbursements/AdminEditReimbursement')));

const DashboardAgent = Loadable(lazy(() => import('../features/agents/pages/Dashboard_agente')));
const AgentPolicyList = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyList')));
const AgentPolicyForm = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyForm')));
const AgentPolicyDetail = Loadable(lazy(() => import('../features/agents/pages/AgentPolicyDetail')));
const AgentEditPolicy = Loadable(lazy(() => import('../features/agents/pages/AgentEditPolicy')));
const CrearClienteAgente = Loadable(lazy(() => import('../features/agents/pages/CrearClienteAgente')));
const AgentApplicationList = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationList')));
const AgentApplicationDetail = Loadable(lazy(() => import('../features/agents/pages/AgentApplicationDetail')));
const AgentCreateSignatureLink = Loadable(lazy(() => import('../features/agents/pages/AgentCreateSignatureLink')));
const AgentReimbursementList = Loadable(lazy(() => import('../features/agents/pages/reimbursements/AgentReimbursementList')));
const AgentReimbursementDetail = Loadable(lazy(() => import('../features/agents/pages/reimbursements/AgentReimbursementDetail')));
const AgentEditReimbursement = Loadable(lazy(() => import('../features/agents/pages/reimbursements/AgentEditReimbursement')));

const DashboardClient = Loadable(lazy(() => import('../features/clients/pages/Dashboard_cliente')));
const ClientPolicyList = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyList')));
const ClientPolicyForm = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyForm')));
const ClientPolicyDetail = Loadable(lazy(() => import('../features/clients/pages/ClientPolicyDetail')));
const ContractSignature = Loadable(lazy(() => import('../features/clients/pages/ContractSignature')));
const ClientDocumentUpload = Loadable(lazy(() => import('../features/clients/pages/ClientDocumentUpload')));
const ClientReimbursementList = Loadable(lazy(() => import('../features/clients/pages/reimbursements/ClientReimbursementList')));
const ClientNewReimbursement = Loadable(lazy(() => import('../features/clients/pages/reimbursements/ClientNewReimbursement')));
const ClientReimbursementDetail = Loadable(lazy(() => import('../features/clients/pages/reimbursements/ClientReimbursementDetail')));
const ClientEditReimbursement = Loadable(lazy(() => import('../features/clients/pages/reimbursements/ClientEditReimbursement')));

import AuthRoutes from '../features/auth/auth.routes';
import LandingRoutes from '../features/landing/landing.routes';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
    children: ReactNode;
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

const RouterConfig = [
    LandingRoutes,
    {
        path: '/',
        element: <FullLayout />,
        children: [
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
                    { path: 'insurance-products/:productId/required-documents', element: <AdminManageRequiredDocs /> },
                    { path: 'reimbursements', element: <AdminReimbursementList /> },
                    { path: 'reimbursements/:id', element: <AdminReimbursementDetail /> },
                    { path: 'reimbursements/:id/edit', element: <AdminEditReimbursement /> },
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
                    { path: 'create-client', element: <CrearClienteAgente /> },
                    { path: 'send-signature-link', element: <AgentCreateSignatureLink /> },
                    { path: 'reimbursements', element: <AgentReimbursementList /> },
                    { path: 'reimbursements/:id', element: <AgentReimbursementDetail /> },
                    { path: 'reimbursements/:id/edit', element: <AgentEditReimbursement /> },
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
                    { path: '', element: <Navigate to="policies" /> },
                    { path: 'policies', element: <ClientPolicyList /> },
                    { path: 'policies/new', element: <ClientPolicyForm /> },
                    { path: 'policies/:id', element: <ClientPolicyDetail /> },
                    { path: 'documents', element: <ClientDocumentUpload /> },
                    { path: 'reimbursements', element: <ClientReimbursementList /> },
                    { path: 'reimbursements/new', element: <ClientNewReimbursement /> },
                    { path: 'reimbursements/:id', element: <ClientReimbursementDetail /> },
                    { path: 'reimbursements/:id/edit', element: <ClientEditReimbursement /> },
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