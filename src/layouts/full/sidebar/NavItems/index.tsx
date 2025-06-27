import { Sidebar } from "flowbite-react";
import { Icon } from "@iconify/react";
import { ChildItem } from "../Sidebaritems";
import { Link, useLocation } from "react-router-dom";

interface NavItemsProps {
  item: ChildItem;
  isSidebarOpen: boolean;
}

const NavItems = ({ item, isSidebarOpen }: NavItemsProps) => {
  const location = useLocation();
  const isActive = item.url === location.pathname;

  return (
    <Sidebar.Item
      as={Link}
      to={item.url}
      className={`sidebar-item w-full ${isActive ? 'bg-primary-light text-primary font-semibold' : ''} ${!isSidebarOpen && 'justify-center'}`}
      icon={() => <Icon icon={item.icon} className="h-5 w-5 flex-shrink-0" />}
    >
      {isSidebarOpen && <span className="truncate">{item.name}</span>}
    </Sidebar.Item>
  );
};

export default NavItems;