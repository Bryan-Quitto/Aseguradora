import { Sidebar } from "flowbite-react";
import SidebarContent, { MenuItem, ChildItem } from "./Sidebaritems"; 
import NavItems from "./NavItems";
import SimpleBar from "simplebar-react";
import React from "react";
import FullLogo from "../shared/logo/FullLogo";
import NavCollapse from "./NavCollapse";
import { useAuth } from 'src/contexts/AuthContext'; 

// Define qué roles tienen acceso a qué roles requeridos.
const rolePermissions: { [key: string]: string[] } = {
  'admin': ['admin', 'superadministrator'],
  'agent': ['agent'],
  'client': ['client'],
  'superadministrator': ['superadministrator'],
};

const filterSidebarItems = (items: MenuItem[], userRole: string | null | undefined): MenuItem[] => {
  return items.reduce((acc: MenuItem[], item: MenuItem) => {
    const newItem = { ...item };

    let currentItemAllowedRoles: string[];
    const itemRequiredRole = item.requiredRole;

    if (itemRequiredRole !== undefined && itemRequiredRole in rolePermissions) {
      currentItemAllowedRoles = rolePermissions[itemRequiredRole]; 
    } else if (itemRequiredRole === undefined) {
      currentItemAllowedRoles = ['admin', 'superadministrator', 'agent', 'client'];
    } else {
      currentItemAllowedRoles = []; 
    }

    // Verifica que userRole no sea null ni undefined antes de usar .includes()
    const itemRoleMatches = userRole !== null && userRole !== undefined && currentItemAllowedRoles.includes(userRole);

    if (newItem.children && newItem.children.length > 0) {
      const filteredChildren = newItem.children.filter((child: ChildItem) => {
        let currentChildAllowedRoles: string[];
        const childRequiredRole = child.requiredRole;

        if (childRequiredRole !== undefined && childRequiredRole in rolePermissions) {
          currentChildAllowedRoles = rolePermissions[childRequiredRole]; 
        } else if (childRequiredRole === undefined) {
            currentChildAllowedRoles = ['admin', 'superadministrator', 'agent', 'client'];
        } else {
            currentChildAllowedRoles = []; 
        }
        // Verifica que userRole no sea null ni undefined antes de usar .includes()
        return userRole !== null && userRole !== undefined && currentChildAllowedRoles.includes(userRole);
      });
      newItem.children = filteredChildren;

      if (itemRoleMatches && filteredChildren.length > 0) {
        acc.push(newItem);
      }
    } else {
      if (itemRoleMatches) {
        acc.push(newItem);
      }
    }
    return acc;
  }, []);
};

const SidebarLayout = () => {
  const { userRole } = useAuth();

  // Define el rol a mostrar en el sidebar
  const displayedRole = React.useMemo(() => {
    if (userRole === 'superadministrator' || userRole === 'admin') {
      return 'ADMIN'; // Siempre muestra 'ADMIN' para estos roles
    }
    return userRole ? userRole.toUpperCase() : 'INVITADO'; // Para otros roles, muestra el rol original en mayúsculas
  }, [userRole]);

  const filteredSidebarContent = React.useMemo(() => {
    return filterSidebarItems(SidebarContent, userRole);
  }, [userRole]);

  return (
    <>
      <div className="xl:block hidden">
        <Sidebar
          className="fixed menu-sidebar bg-white dark:bg-darkgray rtl:pe-4 rtl:ps-0 top-[69px] h-[calc(100vh-69px)]"
          aria-label="Sidebar with multi-level dropdown example"
        >
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 flex items-center sidebarlogo">
              <FullLogo />
            </div>
            <div className="p-6 flex-grow">
              <h2 className="text-3xl font-bold text-primary mb-8">
                {displayedRole} {/* Usa la variable calculada aquí */}
              </h2>
              <SimpleBar className="h-[calc(100vh_-_241px)] custom-flowbite-scrollbar"> 
                <Sidebar.Items className="px-1 mt-2">
                  <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                    {filteredSidebarContent?.map((item: MenuItem, index: number) => (
                      <div className="caption" key={item.heading}>
                        <React.Fragment key={index}>
                          {item.heading && ( 
                            <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                              {item.heading}
                            </h5>
                          )}
                          {item.children?.map((child: ChildItem, childIndex: number) => (
                            <React.Fragment key={child.id || childIndex}>
                              {child.children ? (
                                <div className="collpase-items">
                                  <NavCollapse item={child} />
                                </div>
                              ) : (
                                <NavItems item={child} />
                              )}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      </div>
                    ))}
                  </Sidebar.ItemGroup>
                </Sidebar.Items>
              </SimpleBar>
            </div>
          </div>
        </Sidebar>
      </div>
      <style>{`
        .custom-flowbite-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-flowbite-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .custom-flowbite-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 10px;
        }

        .custom-flowbite-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }

        .custom-flowbite-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f1f1f1;
        }
      `}</style>
    </>
  );
};

export default SidebarLayout;