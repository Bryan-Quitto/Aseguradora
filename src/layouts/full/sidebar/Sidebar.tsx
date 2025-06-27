import React from "react";
import { Sidebar as FlowbiteSidebar } from "flowbite-react";
import { getFilteredMenu, MenuItem, ChildItem } from "./Sidebaritems"; 
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import { useAuth } from 'src/contexts/useAuth';

interface SidebarProps {
    isSidebarOpen: boolean;
}

const Sidebar = ({ isSidebarOpen }: SidebarProps) => {
    const { userRole } = useAuth();

    const displayedRole = React.useMemo(() => {
        if (userRole === 'superadministrator') return 'SUPER ADMIN';
        if (userRole === 'admin') return 'ADMINISTRADOR';
        return userRole ? userRole.toUpperCase() : 'INVITADO';
    }, [userRole]);

    const filteredSidebarContent = React.useMemo(() => {
        return getFilteredMenu(userRole);
    }, [userRole]);

    if (!userRole) {
        return null;
    }

    return (
        <aside className={`flex-shrink-0 bg-white dark:bg-darkgray border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            <div className="flex flex-col h-full">
                <div className={`flex-grow overflow-y-auto overflow-x-hidden custom-flowbite-scrollbar ${isSidebarOpen ? 'p-6' : 'px-2 pt-6'}`}>
                    {isSidebarOpen && (
                        <h2 className="text-2xl font-bold text-primary mb-6 truncate">
                            {displayedRole}
                        </h2>
                    )}
                    <FlowbiteSidebar className="bg-transparent w-full">
                        <FlowbiteSidebar.Items>
                            <FlowbiteSidebar.ItemGroup className="sidebar-nav hide-menu">
                                {filteredSidebarContent.map((item: MenuItem, index: number) => (
                                    <div className={`caption ${!isSidebarOpen && index > 0 ? 'mt-4 border-t-0 pt-0' : ''}`} key={item.heading}>
                                        {isSidebarOpen && item.heading && ( 
                                            <h5 className="text-link dark:text-white/70 font-semibold leading-6 tracking-widest text-xs pb-2 uppercase px-4">
                                                {item.heading}
                                            </h5>
                                        )}
                                        {item.children?.map((child: ChildItem) => (
                                            <React.Fragment key={child.url}>
                                                {child.children ? (
                                                    <NavCollapse item={child} isSidebarOpen={isSidebarOpen} />
                                                ) : (
                                                    <NavItems item={child} isSidebarOpen={isSidebarOpen} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                ))}
                            </FlowbiteSidebar.ItemGroup>
                        </FlowbiteSidebar.Items>
                    </FlowbiteSidebar>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;