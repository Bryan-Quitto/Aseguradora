
import { Link, useLocation } from "react-router-dom";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.svg";
import { Button } from "flowbite-react"; // Importa Button
import { Icon } from "@iconify/react";
import { useAuth } from 'src/contexts/AuthContext'; // Importar useAuth
import { supabase } from 'src/supabase/client'; // Importar supabase
import { useNavigate } from "react-router-dom";

const Topbar = () => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';
    const isAdminDashboard = location.pathname === '/admin/dashboard'; // Verifica si es el dashboard del administrador
    const { user } = useAuth(); // Obtener el usuario del contexto
    const navigate = useNavigate();

    const handleLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error al cerrar sesión:", error.message);
      } else {
        navigate("/auth/login"); // Redirigir al login después de cerrar sesión
      }
    };

  return (
    <div className="py-3 px-4 bg-dark z-40 sticky top-0">
      <div className="flex items-center lg:justify-between flex-wrap justify-center">
        <div className="flex items-center gap-12">
            <img src={wrappixel_logo} alt="logo" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center lg:mt-0 mt-2">
            {/* Ocultar botones si es el dashboard del administrador */}
            {!isAdminDashboard && (
              <Button
                  color="outlineprimary"
                  size="sm"
                  className="py-2"
                  as={Link} 

                  to="/auth/login" // Ruta corregida para iniciar sesión
              >
                  <div className="flex items-center gap-1">
                      <Icon icon="tabler:device-laptop" className="text-lg" />
                      <p className="text-[15px]">{isLandingPage ? "Iniciar sesión" : "Registrar"}</p>
                  </div>
              </Button>
            )}
            {!isLandingPage && !isAdminDashboard && ( // Ocultar también el botón Planes en el dashboard del administrador
              <Button
                  color="primary"
                  size="sm"
                  className="py-2"
                  as={Link}
                  to="/planes" // Esta ruta no está definida en Router.tsx
              >
                  <div className="flex items-center gap-1">
                      <Icon icon="tabler:shopping-cart" className="text-lg" />
                       <p className="text-[15px]">Planes</p>
                  </div>
              </Button>
            )}
            {isAdminDashboard && user && ( // Mostrar correo y botón de cerrar sesión solo en el dashboard del administrador
              <div className="flex items-center gap-2">
                <span className="text-white text-[15px]">{user.email}</span>
                <Button
                  color="primary"
                  size="sm"
                  onClick={handleLogout}
                  className="py-2"
                >
                  Cerrar sesión
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Topbar