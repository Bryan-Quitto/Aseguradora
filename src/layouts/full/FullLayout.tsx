import { FC } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import ScrollToTop from 'src/components/shared/ScrollToTop';
import Sidebar from './sidebar/Sidebar';
import Header from './header/Header';
import Topbar from './header/Topbar';

const FullLayout: FC = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  // Detecta si es una ruta del admin dashboard
  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');

  return (
    <>
      <Topbar />
      {/* Contenedor principal de la página. Asegúrate de que este div pueda crecer horizontalmente si es necesario. */}
      {/* Puedes agregar 'flex-grow' aquí si este div es parte de un flex column padre para que ocupe el espacio. */}
      <div className={`flex w-full min-h-screen dark:bg-darkgray ${isLandingPage ? 'no-sidebar-layout' : ''}`}>
        <div className="page-wrapper flex w-full">
          {/* Header/sidebar */}
          {!isLandingPage && <Sidebar />} {/* Renderiza Sidebar condicionalmente */}

          {/* Contenido principal con barra lateral si no es la landing page */}
          <div className="page-wrapper-sub flex flex-col w-full dark:bg-darkgray">
            {/* Top Header */}
            {!isLandingPage && !isAdminDashboard && <Header />}

            {/* Contenedor del contenido del cuerpo. Aquí es donde se agrega el overflow-x-auto. */}
            {/* ✅ AÑADIDO: overflow-x-auto */}
            <div
              className={`bg-lightgray dark:bg-dark h-full overflow-x-auto`} // <-- ¡AQUÍ ESTÁ EL CAMBIO!
            >
              {/* Body Content */}
              <div
                className={`w-full`} // Este 'w-full' asegura que el contenido interno de la página ocupe el 100% del ancho del contenedor, que ahora puede hacer scroll.
              >
                <ScrollToTop>
                  <div className="container py-30">
                    <Outlet/> {/* Aquí se renderiza el contenido de tu ruta actual */}
                  </div>
                </ScrollToTop>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FullLayout;