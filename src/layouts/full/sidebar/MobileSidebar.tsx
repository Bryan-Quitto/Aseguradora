import { Sidebar } from "flowbite-react";
import { getFilteredMenu, MenuItem, ChildItem } from "./Sidebaritems";
import NavItems from "./NavItems";
import React from "react";
import 'simplebar-react/dist/simplebar.min.css';
import { useAuth } from "src/contexts/useAuth";
import NavCollapse from "./NavCollapse";

const MobileSidebar = () => {
    const { userRole } = useAuth();
    
    const menuItems = React.useMemo(() => getFilteredMenu(userRole), [userRole]);

    return (
        <Sidebar className="h-full">
            <div className="h-full overflow-y-auto custom-flowbite-scrollbar">
                <Sidebar.Items className="px-5 mt-2 pt-4">
                    <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                        {menuItems.map((item: MenuItem) => (
                            <div className="caption" key={item.id || item.heading}>
                                <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                                    {item.heading}
                                </h5>
                                {item.children?.map((child: ChildItem) => (
                                    <React.Fragment key={child.id}>
                                        {child.children ? (
                                            <NavCollapse item={child} isSidebarOpen={true} />
                                        ) : (
                                            <NavItems item={child} isSidebarOpen={true} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </Sidebar.ItemGroup>
                </Sidebar.Items>
            </div>
        </Sidebar>
    );
};

export default MobileSidebar;