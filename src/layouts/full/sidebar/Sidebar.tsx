import { Sidebar } from "flowbite-react";
import { getFilteredMenu, MenuItem, ChildItem } from "./Sidebaritems"; 
import NavItems from "./NavItems";
import SimpleBar from "simplebar-react";
import React from "react";
import FullLogo from "../shared/logo/FullLogo";
import NavCollapse from "./NavCollapse";
import { useAuth } from 'src/contexts/AuthContext'; 

const SidebarLayout = () => {
    const { userRole } = useAuth();

    const displayedRole = React.useMemo(() => {
        if (userRole === 'superadministrator') return 'SUPER ADMIN';
        if (userRole === 'admin') return 'ADMINISTRADOR';
        return userRole ? userRole.toUpperCase() : 'INVITADO';
    }, [userRole]);

    const filteredSidebarContent = React.useMemo(() => {
        return getFilteredMenu(userRole);
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
                                {displayedRole}
                            </h2>
                            <SimpleBar className="h-[calc(100vh_-_241px)] custom-flowbite-scrollbar"> 
                                <Sidebar.Items className="px-1 mt-2">
                                    <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                                        {filteredSidebarContent.map((item: MenuItem) => (
                                            <div className="caption" key={item.heading}>
                                                {item.heading && ( 
                                                    <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                                                        {item.heading}
                                                    </h5>
                                                )}
                                                {item.children?.map((child: ChildItem) => (
                                                    <React.Fragment key={child.id}>
                                                        {child.children ? (
                                                            <div className="collpase-items">
                                                                <NavCollapse item={child} />
                                                            </div>
                                                        ) : (
                                                            <NavItems item={child} />
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ))}
                                    </Sidebar.ItemGroup>
                                </Sidebar.Items>
                            </SimpleBar>
                        </div>
                    </div>
                </Sidebar>
            </div>
            <style>{`.custom-flowbite-scrollbar::-webkit-scrollbar { width: 8px; } .custom-flowbite-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; } .custom-flowbite-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; } .custom-flowbite-scrollbar::-webkit-scrollbar-thumb:hover { background: #a0aec0; } .custom-flowbite-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e0 #f1f1f1; }`}</style>
        </>
    );
};

export default SidebarLayout;