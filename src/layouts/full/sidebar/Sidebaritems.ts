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
    heading: "HOME",
    children: [
      {
        name: "Dashboard",
        icon: "solar:widget-add-line-duotone",
        id: uniqueId(),
        url: "/admin/dashboard", // <-- Cambia esto
        isPro: false,
      },
    ],
  },
  {
    heading: "ADMINISTRATION", // New heading
    children: [
      {
        name: "Crear Usuarios",
        icon: "solar:user-plus-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/create-users", // Define a new route for creating users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar Usuarios",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-users", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar Admins",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-admins", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar Clientes",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-users", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      {
        name: "Listar Agentes",
        icon: "solar:users-group-rounded-linear", // You might need to find a suitable icon
        id: uniqueId(),
        url: "/admin/dashboard/list-only-agents", // Define a new route for listing users
        isPro: false,
        requiredRole: "admin",
      },
      
    ],
  },
];

export default SidebarContent;