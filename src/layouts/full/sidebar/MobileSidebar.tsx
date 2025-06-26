import { Sidebar } from "flowbite-react";
import { getFilteredMenu, MenuItem, ChildItem } from "./Sidebaritems";
import NavItems from "./NavItems";
import SimpleBar from "simplebar-react";
import React from "react";
import FullLogo from "../shared/logo/FullLogo";
import 'simplebar-react/dist/simplebar.min.css';
import { useAuth } from "src/contexts/AuthContext";

const MobileSidebar = () => {
    const { userRole } = useAuth();
    
    const menuItems = React.useMemo(() => getFilteredMenu(userRole), [userRole]);

    return (
        <>
            <div>
                <Sidebar
                    className="fixed menu-sidebar pt-0 bg-white dark:bg-darkgray transition-all"
                    aria-label="Sidebar with multi-level dropdown example"
                >
                    <div className="px-5 py-4 pb-7 flex items-center sidebarlogo">
                        <FullLogo />
                    </div>
                    <SimpleBar className="h-[calc(100vh_-_100px)]">
                        <Sidebar.Items className="px-5 mt-2">
                            <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                                {menuItems.map((item: MenuItem) => (
                                    <div className="caption" key={item.heading}>
                                        <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                                            {item.heading}
                                        </h5>
                                        {item.children?.map((child: ChildItem) => (
                                            <NavItems key={child.id} item={child} />
                                        ))}
                                    </div>
                                ))}
                            </Sidebar.ItemGroup>
                        </Sidebar.Items>
                    </SimpleBar>
                </Sidebar>
            </div>
        </>
    );
};

export default MobileSidebar;