import { uniqueId } from "lodash";

export interface ChildItem {
    id?: number | string;
    name?: string;
    icon?: any;
    children?: ChildItem[];
    item?: any;
    url?: any;
    color?: string;
    isPro?: boolean;
    requiredRole?: string | string[];
}

export interface MenuItem {
    heading?: string;
    name?: string;
    icon?: any;
    id?: number;
    to?: string;
    items?: MenuItem[];
    children?: ChildItem[];
    url?: any;
    isPro?: boolean;
    requiredRole?: string | string[];
}

const allMenuItems: MenuItem[] = [
    {
        heading: "Principal",
        children: [
            { name: "Panel de Control", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/admin/dashboard", requiredRole: ['admin', 'superadministrator'] },
            { name: "Panel de Control", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/agent/dashboard", requiredRole: 'agent' },
            { name: "Panel de Control", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/client/dashboard", requiredRole: 'client' },
            { name: "Página Principal", icon: "solar:global-line-duotone", id: uniqueId(), url: "/" },
        ],
    },
    {
        heading: "Gestión de usuarios",
        requiredRole: ['admin', 'superadministrator'],
        children: [
            { name: "Crear Usuario", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/admin/dashboard/create-users", requiredRole: ['admin', 'superadministrator'] },
            { name: "Crear Cliente", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/admin/dashboard/create-clients", requiredRole: ['admin', 'superadministrator'] },
            { name: "Listar usuarios", icon: "solar:users-group-rounded-linear", id: uniqueId(), url: "/admin/dashboard/list-users", requiredRole: ['admin', 'superadministrator'] },
            { name: "Listar clientes", icon: "solar:user-circle-linear", id: uniqueId(), url: "/admin/dashboard/list-only-users", requiredRole: ['admin', 'superadministrator'] },
            { name: "Listar Agentes", icon: "solar:user-id-linear", id: uniqueId(), url: "/admin/dashboard/list-only-agents", requiredRole: ['admin', 'superadministrator'] },
            { name: "Listar Admins", icon: "solar:user-check-rounded-linear", id: uniqueId(), url: "/admin/dashboard/list-only-admins", requiredRole: ['admin', 'superadministrator'] },    
        ],
    },
    {
        heading: "Administración",
        requiredRole: ['admin', 'superadministrator'],
        children: [
            { name: "Crear Producto", icon: "solar:file-add-line-duotone", id: uniqueId(), url: "/admin/dashboard/create-insurance", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestionar Productos", icon: "solar:shield-check-line-duotone", id: uniqueId(), url: "/admin/dashboard/insurance-products", requiredRole: ['admin', 'superadministrator'] },
            { name: "Crear Póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/admin/dashboard/policies/new", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestionar Pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/admin/dashboard/policies", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestionar Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/admin/dashboard/reimbursements", requiredRole: ['admin', 'superadministrator'] },
        ],
    },
    {
        heading: "Agente",
        requiredRole: 'agent',
        children: [
            { name: "Gestionar Pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/agent/dashboard/policies", requiredRole: 'agent' },
            { name: "Crear Cliente", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/agent/dashboard/create-client", requiredRole: 'agent' },
            { name: "Crear Póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/agent/dashboard/policies/new", requiredRole: 'agent' },
            { name: "Revisar Solicitudes", icon: "solar:checklist-minimalistic-line-duotone", id: uniqueId(), url: "/agent/dashboard/applications", requiredRole: 'agent' },
            { name: "Gestionar Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/agent/dashboard/reimbursements", requiredRole: 'agent' },
        ],
    },
    {
        heading: "Reportes",
        requiredRole: ['admin', 'superadministrator', 'agent'],
        children: [
            { name: "Reporte de Pólizas", icon: "solar:chart-line-duotone", id: uniqueId(), url: "/admin/dashboard/reports/policies", requiredRole: ['admin', 'superadministrator'] },
            { name: "Pólizas a Vencer", icon: "solar:danger-triangle-line-duotone", id: uniqueId(), url: "/admin/dashboard/reports/expiring-policies", requiredRole: ['admin', 'superadministrator'] },
            { name: "Pólizas Vencidas", icon: "solar:close-circle-line-duotone", id: uniqueId(), url: "/admin/dashboard/reports/expired-policies", requiredRole: ['admin', 'superadministrator'] },
            { name: "Reporte de Reembolsos", icon: "solar:bill-list-line-duotone", id: uniqueId(), url: "/admin/dashboard/reports/reimbursements", requiredRole: ['admin', 'superadministrator'] },
            { name: "Producción por Agente", icon: "solar:user-star-shine-line-duotone", id: uniqueId(), url: "/admin/dashboard/reports/agent-production", requiredRole: ['admin', 'superadministrator'] },
            { name: "Reporte de Pólizas", icon: "solar:chart-line-duotone", id: uniqueId(), url: "/agent/dashboard/reports/policies", requiredRole: 'agent' },
            { name: "Pólizas a Vencer", icon: "solar:danger-triangle-line-duotone", id: uniqueId(), url: "/agent/dashboard/reports/expiring-policies", requiredRole: 'agent' },
            { name: "Pólizas Vencidas", icon: "solar:close-circle-line-duotone", id: uniqueId(), url: "/agent/dashboard/reports/expired-policies", requiredRole: 'agent' },
            { name: "Reporte de Reembolsos", icon: "solar:bill-list-line-duotone", id: uniqueId(), url: "/agent/dashboard/reports/reimbursements", requiredRole: 'agent' },
        ],
    },
    {
        heading: "Servicios al cliente",
        requiredRole: 'client',
        children: [
            { name: "Mis Pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/client/dashboard/policies", requiredRole: 'client' },
            { name: "Contratar Póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/client/dashboard/policies/new", requiredRole: 'client' },
            { name: "Mis Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/client/dashboard/reimbursements", requiredRole: 'client' },
            { name: "Mis Documentos", icon: "solar:folder-with-files-line-duotone", id: uniqueId(), url: "/client/dashboard/documents", requiredRole: 'client' },
        ],
    },
];

const checkRole = (item: MenuItem | ChildItem, userRole: string): boolean => {
    if (!item.requiredRole) {
        return true; 
    }
    if (Array.isArray(item.requiredRole)) {
        return item.requiredRole.includes(userRole);
    }
    return item.requiredRole === userRole;
};

export const getFilteredMenu = (userRole: string | null | undefined): MenuItem[] => {
    if (!userRole) return [];

    return allMenuItems.reduce((acc: MenuItem[], item: MenuItem) => {
        if (checkRole(item, userRole)) {
            const filteredChildren = item.children?.filter(child => checkRole(child, userRole));
            
            if (filteredChildren && filteredChildren.length > 0) {
                acc.push({ ...item, children: filteredChildren });
            }
        }
        return acc;
    }, []);
};