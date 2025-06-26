import { FC } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import ScrollToTop from 'src/components/shared/ScrollToTop';
import Sidebar from './sidebar/Sidebar';
import Header from './header/Header';
import Topbar from './header/Topbar';

const FullLayout: FC = () => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

    return (
        <>
            <Topbar />
            <div className={`flex w-full min-h-screen bg-blue-50 dark:bg-dark ${isLandingPage ? 'no-sidebar-layout' : ''}`}>
                <div className="page-wrapper flex w-full">
                    {!isLandingPage && <Sidebar />}

                    <div className="page-wrapper-sub flex flex-col w-full dark:bg-darkgray">
                        {!isLandingPage && <Header />}

                        <div className="h-full min-h-screen overflow-x-auto">
                            <div className="w-full">
                                <ScrollToTop>
                                    <div className="w-full px-4 py-8">
                                        <Outlet />
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