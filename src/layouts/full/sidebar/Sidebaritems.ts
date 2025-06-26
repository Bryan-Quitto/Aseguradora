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
        heading: "Inicio",
        children: [
            { name: "Dashboard", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/admin/dashboard", requiredRole: ['admin', 'superadministrator'] },
            { name: "Dashboard", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/agent/dashboard", requiredRole: 'agent' },
            { name: "Dashboard", icon: "solar:widget-add-line-duotone", id: uniqueId(), url: "/client/dashboard", requiredRole: 'client' },
        ],
    },
    {
        heading: "Gestión de usuarios",
        requiredRole: ['admin', 'superadministrator'],
        children: [
            { name: "Crear usuarios", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/admin/dashboard/create-users", requiredRole: ['admin', 'superadministrator'] },
            { name: "Crear clientes", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/admin/dashboard/create-clients", requiredRole: ['admin', 'superadministrator'] },
            { name: "Listar usuarios", icon: "solar:users-group-rounded-linear", id: uniqueId(), url: "/admin/dashboard/list-users", requiredRole: ['admin', 'superadministrator'] },
        ],
    },
    {
        heading: "Administración de seguros",
        requiredRole: ['admin', 'superadministrator'],
        children: [
            { name: "Crear nuevo seguro", icon: "solar:file-add-line-duotone", id: uniqueId(), url: "/admin/dashboard/create-insurance", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestión de seguros", icon: "solar:eye-bold", id: uniqueId(), url: "/admin/dashboard/insurance-products", requiredRole: ['admin', 'superadministrator'] },
            { name: "Crear póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/admin/dashboard/policies/new", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestionar Pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/admin/dashboard/policies", requiredRole: ['admin', 'superadministrator'] },
            { name: "Gestionar Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/admin/dashboard/reimbursements", requiredRole: ['admin', 'superadministrator'] },
        ],
    },
    {
        heading: "Gestión de Agentes",
        requiredRole: 'agent',
        children: [
            { name: "Gestionar pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/agent/dashboard/policies", requiredRole: 'agent' },
            { name: "Crear cliente", icon: "solar:user-plus-rounded-linear", id: uniqueId(), url: "/agent/dashboard/create-client", requiredRole: 'agent' },
            { name: "Crear póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/agent/dashboard/policies/new", requiredRole: 'agent' },
            { name: "Revisar solicitudes", icon: "solar:checklist-minimalistic-line-duotone", id: uniqueId(), url: "/agent/dashboard/applications", requiredRole: 'agent' },
            { name: "Gestionar Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/agent/dashboard/reimbursements", requiredRole: 'agent' },
        ],
    },
    {
        heading: "Servicios para clientes",
        requiredRole: 'client',
        children: [
            { name: "Mis pólizas", icon: "solar:document-text-line-duotone", id: uniqueId(), url: "/client/dashboard/policies", requiredRole: 'client' },
            { name: "Contratar póliza", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/client/dashboard/policies/new", requiredRole: 'client' },
            { name: "Mis Reembolsos", icon: "solar:wallet-money-line-duotone", id: uniqueId(), url: "/client/dashboard/reimbursements", requiredRole: 'client' },
            { name: "Mis documentos", icon: "solar:document-add-line-duotone", id: uniqueId(), url: "/client/dashboard/documents", requiredRole: 'client' },
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