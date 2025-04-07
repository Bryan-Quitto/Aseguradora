import { Icon } from "@iconify/react/dist/iconify.js";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.svg";
import { Link } from "react-router";
import { Dropdown } from "flowbite-react/components/Dropdown";


const Topbar = () => {
    const dropdownItems = [
        {
            id: 1,
            title: "Bootstrap Preview",
            href: "https://www.wrappixel.com/templates/materialm-admin-dashboard-template/?ref=376"
        },
        {
            id: 2,
            title: "Angular Preview",
            href: "https://www.wrappixel.com/templates/materialm-material-angular-dashboard-template/?ref=376"
        },
        {
            id: 3,
            title: "Vuejs Preview",
            href: "https://www.wrappixel.com/templates/materialm-vuejs-vuetify-admin-template/?ref=376"
        },
        {
            id: 4,
            title: "Nextjs Preview",
            href: "https://www.wrappixel.com/templates/materialm-next-js-tailwind-dashboard-template/?ref=376"
        },

    ]
  return (
    <div className="py-3 px-4 bg-dark z-40 sticky top-0">
      <div className="flex items-center lg:justify-between flex-wrap justify-center">
        <div className="flex items-center gap-12">
            <img src={wrappixel_logo} alt="logo" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center lg:mt-0 mt-2">
            <Dropdown label={
                <div className="flex items-center gap-1">
                    <Icon icon="tabler:device-laptop" className="text-lg" />
                     <p className="text-[15px]">Registrar</p>
                </div>
            } color="outlineprimary" size="sm" className="py-2" >
              {
                dropdownItems.map((item) => {
                    return (
                        <Dropdown.Item className="flex items-center gap-1 text-sm py-2.5 px-4 group" as={Link} to={item.href} icon={() => <Icon icon="tabler:external-link" className="text-lg text-link group-hover:text-primary" />}>{item.title}</Dropdown.Item>
                    )
                })
              }
            </Dropdown>
            <Dropdown label={
                <div className="flex items-center gap-1">
                    <Icon icon="tabler:shopping-cart" className="text-lg" />
                     <p className="text-[15px]">Planes</p>
                </div>
            } color="primary" size="sm" >
              {
                dropdownItems.map((item) => {
                    return (
                        <Dropdown.Item className="flex items-center gap-1 text-sm py-2.5 px-4 group" as={Link} to={item.href} icon={() => <Icon icon="tabler:external-link" className="text-lg text-link group-hover:text-primary" />}>{item.title}</Dropdown.Item>
                    )
                })
              }
            </Dropdown>
        </div>
      </div>
    </div>
  )
}

export default Topbar