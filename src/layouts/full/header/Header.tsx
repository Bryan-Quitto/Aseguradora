import { useState } from "react";
import { Button, Drawer } from "flowbite-react";
import { Icon } from "@iconify/react";
import MobileSidebar from "../sidebar/MobileSidebar";
import Topbar from "./Topbar";

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
    const [isMobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-darkgray shadow-md">
                <div className="flex items-center">
                    <Button 
                        color="light" 
                        className="!bg-transparent !border-none !ring-0 !shadow-none xl:block hidden"
                        onClick={toggleSidebar}
                    >
                        <Icon icon="solar:hamburger-menu-line-duotone" className="h-6 w-6 text-gray-600" />
                    </Button>
                    <Button 
                        color="light" 
                        className="!bg-transparent !border-none !ring-0 !shadow-none xl:hidden block"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Icon icon="solar:hamburger-menu-line-duotone" className="h-6 w-6 text-gray-600" />
                    </Button>
                    <div className="w-full">
                         <Topbar />
                    </div>
                </div>
            </header>

            <Drawer open={isMobileOpen} onClose={() => setMobileOpen(false)} className="w-64">
                <MobileSidebar />
            </Drawer>
        </>
    );
};

export default Header;