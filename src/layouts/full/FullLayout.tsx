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
    <div className={`flex w-full min-h-screen dark:bg-darkgray ${isLandingPage ? 'no-sidebar-layout' : ''}`}> {/* Añade clase condicional */}
      <div className="page-wrapper flex w-full  ">
        {/* Header/sidebar */}
            {!isLandingPage && <Sidebar />} {/* Renderiza Sidebar condicionalmente */}
        <div className="page-wrapper-sub flex flex-col w-full dark:bg-darkgray">
          {/* Top Header  */}
           {!isLandingPage && !isAdminDashboard && <Header />}

          <div
            className={`bg-lightgray dark:bg-dark  h-full`}
          >
            {/* Body Content  */}
            <div
              className={`w-full`}
            >
              <ScrollToTop>
                <div className="container py-30">
                <Outlet/>
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
