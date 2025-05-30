import { Sidebar } from 'flowbite-react';
import { HiChartPie, HiUsers, HiDocumentText, HiCog } from 'react-icons/hi';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ListarUsuarios from './ListarUsuarios';
import CrearUsuarios from './CrearUsuarios'; 

export default function Dashboard() {
  const location = useLocation();

  const renderContent = () => {
    switch (location.pathname) {
      case '/admin/dashboard/list-users':
        return <ListarUsuarios />;
      case '/admin/dashboard/create-users':
        return <CrearUsuarios />;
      default:
        return (
          <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center border border-blue-100">
            <h1 className="text-4xl font-bold text-blue-800 mb-4">
              ¡Bienvenido, Administrador!
            </h1>
            <p className="text-lg text-gray-600">
              Selecciona una opción del menú lateral para comenzar.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="flex flex-1">
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
