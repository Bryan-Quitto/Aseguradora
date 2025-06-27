import { Sidebar } from "flowbite-react";
import { Icon } from "@iconify/react";
import { ChildItem } from "../Sidebaritems";
import NavItems from "../NavItems";
import React from "react";

interface NavCollapseProps {
  item: ChildItem;
  isSidebarOpen: boolean;
}

const NavCollapse = ({ item, isSidebarOpen }: NavCollapseProps) => {
  return (
    <Sidebar.Collapse
      icon={() => <Icon icon={item.icon} className="h-5 w-5 flex-shrink-0" />}
      label={isSidebarOpen ? item.name : ""}
      className={`sidebar-item w-full ${!isSidebarOpen ? 'justify-center' : ''}`}
    >
      {item.children?.map((child) => (
        <React.Fragment key={child.id}>
          {child.children ? (
            <NavCollapse item={child} isSidebarOpen={isSidebarOpen} />
          ) : (
            <NavItems item={child} isSidebarOpen={isSidebarOpen} />
          )}
        </React.Fragment>
      ))}
    </Sidebar.Collapse>
  );
};

export default NavCollapse;