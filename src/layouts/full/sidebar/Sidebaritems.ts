export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: any;
  children?: ChildItem[];
  item?: any;
  url?: any;
  color?: string;
  isPro?:boolean;
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
  isPro?:boolean;
  requiredRole?: string; // Add this line
}

import { uniqueId } from "lodash";
 
const SidebarContent: MenuItem[] = [
  {
    heading: "HOME",
    children: [
      {
        name: "Dashboard",
        icon: "solar:widget-add-line-duotone",
        id: uniqueId(),
        url: "",
        isPro: false,
      },
    ],
  },
  {
    heading: "Auth",
    children: [
      {
        name: "Login",
        icon: "solar:login-2-linear",
        id: uniqueId(),
        url: "/auth/login",
       isPro: false,
      
      },
      {
        name: "Register",
        icon: "solar:shield-user-outline",
        id: uniqueId(),
        url: "/auth/register",
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
    ],
  },
  {
    heading: "UTILITIES",
    children: [
      {
        name: "Typography",
        icon: "solar:text-circle-outline",
        id: uniqueId(),
        url: "/ui/typography",
        isPro: false,        
      },
      {
        name: "Table",
        icon: "solar:bedside-table-3-linear",
        id: uniqueId(),
        url: "/ui/table",
       isPro: false,
      },
      {
        name: "Form",
        icon: "solar:password-minimalistic-outline",
        id: uniqueId(),
        url: "/ui/form",
       isPro: false,
      },
      {
        name: "Alert",
        icon: "solar:airbuds-case-charge-outline",
        id: uniqueId(),
        url: "/ui/alert",
       isPro: false,
      },
    ],
  },


];

export default SidebarContent;
