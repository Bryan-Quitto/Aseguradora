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
    requiredRole?: string;
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
    requiredRole?: string;
}

const SidebarContent: MenuItem[] = [
    {
        heading: "Inicio",
        children: [
            {
                name: "Dashboard",
                icon: "solar:widget-add-line-duotone",
                id: uniqueId(),
                url: "/admin/dashboard",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Dashboard",
                icon: "solar:widget-add-line-duotone",
                id: uniqueId(),
                url: "/agent/dashboard",
                isPro: false,
                requiredRole: "agent",
            },
            {
                name: "Dashboard",
                icon: "solar:widget-add-line-duotone",
                id: uniqueId(),
                url: "/client/dashboard",
                isPro: false,
                requiredRole: "client",
            },
        ],
    },

    {
        heading: "Gestión de usuarios",
        requiredRole: "admin",
        children: [
            {
                name: "Crear usuarios",
                icon: "solar:user-plus-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/create-users",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Crear clientes",
                icon: "solar:user-plus-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/create-clients",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Listar usuarios",
                icon: "solar:users-group-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/list-users",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Listar admins",
                icon: "solar:users-group-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/list-only-admins",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Listar clientes",
                icon: "solar:users-group-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/list-only-users",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Listar agentes",
                icon: "solar:users-group-rounded-linear",
                id: uniqueId(),
                url: "/admin/dashboard/list-only-agents",
                isPro: false,
                requiredRole: "admin",
            },
        ],
    },

    {
        heading: "Administración de seguros",
        requiredRole: "admin",
        children: [
            {
                name: "Crear nuevo seguro",
                icon: "solar:file-add-line-duotone",
                id: uniqueId(),
                url: "/admin/dashboard/create-insurance",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Gestión de seguros",
                icon: "solar:eye-bold",
                id: uniqueId(),
                url: "/admin/dashboard/insurance-products",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Crear póliza",
                icon: "solar:document-add-line-duotone",
                id: uniqueId(),
                url: "/admin/dashboard/policies/new",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Gestionar Pólizas",
                icon: "solar:document-text-line-duotone",
                id: uniqueId(),
                url: "/admin/dashboard/policies",
                isPro: false,
                requiredRole: "admin",
            },
            {
                name: "Gestionar Reembolsos",
                icon: "solar:wallet-money-line-duotone",
                id: uniqueId(),
                url: "/admin/dashboard/reimbursements",
                isPro: false,
                requiredRole: "admin",
            },
        ],
    },

    {
        heading: "Gestión de Agentes",
        requiredRole: "agent",
        children: [
            {
                name: "Gestionar pólizas",
                icon: "solar:document-text-line-duotone",
                id: uniqueId(),
                url: "/agent/dashboard/policies",
                isPro: false,
                requiredRole: "agent",
            },
            {
                name: "Crear cliente",
                icon: "solar:user-plus-rounded-linear",
                id: uniqueId(),
                url: "/agent/dashboard/create-client",
                isPro: false,
                requiredRole: "agent",
            },
            {
                name: "Crear póliza",
                icon: "solar:document-add-line-duotone",
                id: uniqueId(),
                url: "/agent/dashboard/policies/new",
                isPro: false,
                requiredRole: "agent",
            },
            {
                name: "Revisar solicitudes",
                icon: "solar:checklist-minimalistic-line-duotone",
                id: uniqueId(),
                url: "/agent/dashboard/applications",
                isPro: false,
                requiredRole: "agent",
            },
            {
                name: "Gestionar Reembolsos",
                icon: "solar:wallet-money-line-duotone",
                id: uniqueId(),
                url: "/agent/dashboard/reimbursements",
                isPro: false,
                requiredRole: "agent",
            },
        ],
    },

    {
        heading: "Servicios para clientes",
        requiredRole: "client",
        children: [
            {
                name: "Mis pólizas",
                icon: "solar:document-text-line-duotone",
                id: uniqueId(),
                url: "/client/dashboard/policies",
                isPro: false,
                requiredRole: "client",
            },
            {
                name: "Contratar póliza",
                icon: "solar:document-add-line-duotone",
                id: uniqueId(),
                url: "/client/dashboard/policies/new",
                isPro: false,
                requiredRole: "client",
            },
            {
                name: "Mis Reembolsos",
                icon: "solar:wallet-money-line-duotone",
                id: uniqueId(),
                url: "/client/dashboard/reimbursements",
                isPro: false,
                requiredRole: "client",
            },
            {
                name: "Mis documentos",
                icon: "solar:document-add-line-duotone",
                id: uniqueId(),
                url: "/client/dashboard/documents",
                isPro: false,
                requiredRole: "client",
            },
        ],
    },
];

export default SidebarContent;