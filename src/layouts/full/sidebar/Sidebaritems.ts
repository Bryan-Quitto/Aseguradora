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
  requiredRole?: string; // Add this line
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
  requiredRole?: string; // Add this line
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
    heading: "Administración", // New heading
    requiredRole: "admin", // This heading will only appear for admins
    children: [
      {
        name: "Crear usuarios",
        icon: "solar:user-plus-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/create-users", // Define a new route for creating users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar usuarios",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-users", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar admins",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-admins", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar clientes",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-users", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar agentes",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-agents", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
    ],
  },
  {
    heading: "Gestión de Agentes", // Nuevo encabezado para funcionalidades de agente
    requiredRole: "agent", // Este encabezado solo aparecerá para agentes
    children: [
      {
        name: "Gestionar Pólizas",
        icon: "solar:document-text-line-duotone", // Icono para pólizas
        id: uniqueId(),
        url: "/agent/dashboard/policies",
        isPro: false,
        requiredRole: "agent",
      },
      {
        name: "Crear Póliza",
        icon: "solar:document-add-line-duotone", // Icono para crear póliza
        id: uniqueId(),
        url: "/agent/dashboard/policies/new",
        isPro: false,
        requiredRole: "agent",
      },
      {
        name: "Revisar Solicitudes",
        icon: "solar:checklist-minimalistic-line-duotone", // Icono para solicitudes
        id: uniqueId(),
        url: "/agent/dashboard/applications",
        isPro: false,
        requiredRole: "agent",
      },
    ],
  },
  {
    heading: "Servicios para Clientes", // Nuevo encabezado para funcionalidades de cliente
    children: [
      {
        name: "Mis Pólizas",
        icon: "solar:document-text-line-duotone", // Icono para pólizas
        id: uniqueId(),
        url: "/client/dashboard/policies",
        isPro: false,
        requiredRole: "client",
      },
      {
        name: "Contratar Póliza",
        icon: "solar:document-add-line-duotone", // Icono para contratar póliza
        id: uniqueId(),
        url: "/client/dashboard/policies/new",
        isPro: false,
        requiredRole: "client",
      },
    ],
  },
];

export default SidebarContent;