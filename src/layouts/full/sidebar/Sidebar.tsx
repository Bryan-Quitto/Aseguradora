import {  Sidebar } from "flowbite-react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import SimpleBar from "simplebar-react";
import React from "react";
import FullLogo from "../shared/logo/FullLogo";
// Remove Upgrade import since we won't use it
import NavCollapse from "./NavCollapse";
import { useAuth } from 'src/contexts/AuthContext'; // Import useAuth

const SidebarLayout = () => {
  const { userRole } = useAuth(); // Get the user's role

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
              {userRole ? userRole.toUpperCase() : ""}
            </h2>
            <SimpleBar className="h-[calc(100vh_-_130px)]">
              <Sidebar.Items className="px-1 mt-2">
                <Sidebar.ItemGroup className="sidebar-nav hide-menu">
                  {SidebarContent &&
                    SidebarContent?.map((item, index) => (
                      <div className="caption" key={item.heading}>
                        <React.Fragment key={index}>
                          <h5 className="text-link dark:text-white/70 caption font-semibold leading-6 tracking-widest text-xs pb-2 uppercase">
                            {item.heading}
                          </h5>
                          {item.children?.map((child, index) => {
                            // Conditionally render based on requiredRole
                            if (child.requiredRole && child.requiredRole !== userRole) {
                              return null; // Don't render if user doesn't have the required role
                            }
                            return (
                              <React.Fragment key={child.id && index}>
                                {child.children ? (
                                  <div className="collpase-items">
                                    <NavCollapse item={child} />
                                  </div>
                                ) : (
                                  <NavItems item={child} />
                                )}
                              </React.Fragment>
                            );
                          })}
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
