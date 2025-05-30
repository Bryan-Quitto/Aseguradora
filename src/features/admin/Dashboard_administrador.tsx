import { Sidebar } from 'flowbite-react';
import { HiChartPie, HiUsers, HiDocumentText, HiCog } from 'react-icons/hi';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ListarUsuarios from './ListarUsuarios';
import CrearUsuarios from './CrearUsuarios'; 
import { useAuth } from 'src/contexts/AuthContext';

export default function Dashboard() {
  const location = useLocation();
  const { profile } = useAuth(); // Obtén el perfil del usuario

  // Construye el nombre completo
  const fullName = profile
    ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim()
    : '';

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
              ¡Bienvenido, {fullName || "Administrador"}!
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
      {/* Encabezado Superior */}
      {/* <header className="bg-white shadow p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold text-blue-800">Panel de Administración</h2>
        <div className="flex items-center gap-4">
          <div className="text-gray-600 font-medium">admin@example.com</div>
          <button className="bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700">Cerrar sesión</button>
        </div>
      </header> */}

      <div className="flex flex-1">
        {/* Menú Lateral */}
        {/* <div className="w-64 bg-white shadow-md border-r">
          <Sidebar aria-label="Menu de navegación" className="h-full">
            <Sidebar.Items>
              <Sidebar.ItemGroup>
                <Sidebar.Item href="#" icon={HiChartPie} onClick={() => setCurrentView('welcome')}>
                  Dashboard
                </Sidebar.Item>
                <Sidebar.Collapse icon={HiUsers} label="Gestión de Usuarios">
                  <Sidebar.Item href="#" onClick={() => setCurrentView('crear-usuarios')}>
                    Crear Usuarios
                  </Sidebar.Item>
                  <Sidebar.Item href="#" onClick={() => setCurrentView('listar-usuarios')}>
                    Listar Usuarios
                  </Sidebar.Item>
                </Sidebar.Collapse>
                <Sidebar.Item href="#" icon={HiDocumentText}>
                  Documentos
                </Sidebar.Item>
                <Sidebar.Item href="#" icon={HiCog}>
                  Configuración
                </Sidebar.Item>
              </Sidebar.ItemGroup>
            </Sidebar.Items>
          </Sidebar>
        </div> */}

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col justify-center items-center p-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
