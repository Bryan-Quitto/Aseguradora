import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header/Header';
import Sidebar from './sidebar/Sidebar';
import 'src/css/layouts/gradient.css';
import { useAuth } from 'src/contexts/useAuth';
import { Spinner } from 'flowbite-react';

const FullLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { loading: authLoading } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen animated-gradient-background">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="animated-gradient-background min-h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex h-screen">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        
        <div className="relative flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <main className="flex-grow flex items-center p-4 md:p-6 2xl:p-10 pt-20 md:pt-24">
             <div className="w-full">
                <Outlet />
             </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FullLayout;