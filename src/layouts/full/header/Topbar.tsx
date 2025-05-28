
import { Link, useLocation } from "react-router";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.svg";
import { Button } from "flowbite-react"; // Importa Button
import { Icon } from "@iconify/react";

const Topbar = () => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

  return (
    <div className="py-3 px-4 bg-dark z-40 sticky top-0">
      <div className="flex items-center lg:justify-between flex-wrap justify-center">
        <div className="flex items-center gap-12">
            <img src={wrappixel_logo} alt="logo" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center lg:mt-0 mt-2">
            <Button
                color="outlineprimary"
                size="sm"
                className="py-2"
                as={Link}
                to="/login" // Asumiendo que /login es la ruta para iniciar sesión
            >
                <div className="flex items-center gap-1">
                    <Icon icon="tabler:device-laptop" className="text-lg" />
                    <p className="text-[15px]">{isLandingPage ? "Iniciar sesión" : "Registrar"}</p>
                </div>
            </Button>
            {!isLandingPage && (
              <Button
                  color="primary"
                  size="sm"
                  className="py-2"
                  as={Link}
                  to="/planes" // Asumiendo que /planes es la ruta para planes
              >
                  <div className="flex items-center gap-1">
                      <Icon icon="tabler:shopping-cart" className="text-lg" />
                       <p className="text-[15px]">Planes</p>
                  </div>
              </Button>
            )}
        </div>
      </div>
    </div>
  )
}

export default Topbar