import { Sidebar } from "flowbite-react";
// Asegúrate de que SidebarContent, MenuItem y ChildItem se exporten correctamente desde "./Sidebaritems"
import SidebarContent, { MenuItem, ChildItem } from "./Sidebaritems"; 
import NavItems from "./NavItems";
import SimpleBar from "simplebar-react";
import React from "react";
import FullLogo from "../shared/logo/FullLogo";
import NavCollapse from "./NavCollapse";
import { useAuth } from 'src/contexts/AuthContext'; // Asegúrate de que la ruta a AuthContext sea correcta

// Helper function para filtrar los elementos de la barra lateral de forma no mutante
// Crea una nueva estructura de datos filtrada
const filterSidebarItems = (items: MenuItem[], userRole: string | null | undefined): MenuItem[] => {
  // Usamos reduce para construir un nuevo array, evitando mutar el original SidebarContent
  return items.reduce((acc: MenuItem[], item) => {
    // Hacemos una copia superficial del item para no mutar el objeto original
    const newItem = { ...item }; 
    // Verifica si el rol del encabezado (item de nivel superior) coincide o no tiene rol requerido
    // Se asegura de que 'userRole' no sea null antes de la comparación
    const itemRoleMatches = !newItem.requiredRole || (userRole !== null && newItem.requiredRole === userRole);

    // Si el item tiene hijos, procesamos los hijos primero
    if (newItem.children && newItem.children.length > 0) {
      // Filtramos los hijos basándonos en su propio 'requiredRole'
      const filteredChildren = newItem.children.filter(child =>
        // Se asegura de que 'userRole' no sea null antes de la comparación
        !child.requiredRole || (userRole !== null && child.requiredRole === userRole)
      );
      // Asignamos los hijos filtrados a la copia del item
      newItem.children = filteredChildren; 

      // El encabezado solo se añade si su propio rol coincide Y tiene al menos un hijo visible
      if (itemRoleMatches && filteredChildren.length > 0) {
        acc.push(newItem); 
      }
    } else {
      // Si el item no tiene hijos (es un elemento de enlace directo, aunque en tu SidebarContent todos los items de nivel superior tienen hijos)
      // Se añade si su propio rol coincide
      if (itemRoleMatches) {
        acc.push(newItem);
      }
    }
    return acc;
  }, []);
};

const SidebarLayout = () => {
  const { userRole } = useAuth(); // Obtiene el rol del usuario

  // Usa useMemo para filtrar el contenido solo cuando el userRole cambie, optimizando el rendimiento
  const filteredSidebarContent = React.useMemo(() => {
    return filterSidebarItems(SidebarContent, userRole);
  }, [userRole]); // Dependencia del userRole para re-filtrar

  return (
    <>
      <div className="xl:block hidden">
        <Sidebar
          className="fixed menu-sidebar bg-white dark:bg-darkgray rtl:pe-4 rtl:ps-0 top-[69px]"
          aria-label="Sidebar with multi-level dropdown example"
        >
          <div className="px-6 py-4 flex items-center sidebarlogo">
            <FullLogo />
          </div>
          <div className="p-6">
            <h2 className="text-3xl font-bold text-primary mb-8">
              {userRole ? userRole.toUpperCase() : "INVITADO"} {/* Muestra el rol o "INVITADO" */}
            </h2>
            <SimpleBar className="h-[calc(100vh_-_130px)]">
              <Sidebar.Items className="px-1 mt-2">
                <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                  {/* Iteramos sobre el contenido ya filtrado */}
                  {filteredSidebarContent?.map((item, index) => (
                    <div className="caption" key={item.heading}>
                      <React.Fragment key={index}>
                        {/* El encabezado solo se mostrará si la lógica de filtrado anterior lo incluyó */}
                        {item.heading && ( 
                          <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                            {item.heading}
                          </h5>
                        )}
                        {/* Iteramos sobre los hijos, que ya están filtrados por la función 'filterSidebarItems' */}
                        {item.children?.map((child, childIndex) => (
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
        </Sidebar>
      </div>
    </>
  );
};

export default SidebarLayout;