import { Link, useLocation, useNavigate } from "react-router-dom";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.png";
import { Button } from "flowbite-react";
import { Icon } from "@iconify/react";
import { useAuth } from 'src/contexts/AuthContext';
import { supabase } from 'src/supabase/client';

const Topbar = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAdminDashboard = location.pathname.startsWith('/admin');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error.message);
    } else {
      navigate("/auth/login");
    }
  };

  // Construye el nombre completo
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

  return (
    <div className="py-3 px-4 bg-white z-40 sticky top-0">
      <div className="flex items-center lg:justify-between flex-wrap justify-center">
        <div className="flex items-center gap-12">
          <img src={wrappixel_logo} alt="logo" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center lg:mt-0 mt-2">
          {/* Topbar especial para admin dashboard */}
          {isAdminDashboard && user && (
            <div className="flex items-center gap-2">
              <span className="text-blue-900 text-[15px]">
                {fullName || user.email}
              </span>
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
          {/* Botón de login solo en landing y fuera de admin */}
          {!isAdminDashboard && (
            <Button
              color="outlineprimary"
              size="sm"
              className="py-2"
              as={Link}
              to="/auth/login"
            >
              <div className="flex items-center gap-1">
                <Icon icon="tabler:device-laptop" className="text-lg" />
                <p className="text-[15px]">{isLandingPage ? "Iniciar sesión" : "Registrar"}</p>
              </div>
            </Button>
          )}
          {/* Botón Planes solo fuera de landing y admin */}
          {!isLandingPage && !isAdminDashboard && (
            <Button
              color="primary"
              size="sm"
              className="py-2"
              as={Link}
              to="/planes"
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
  );
};

export default Topbar;