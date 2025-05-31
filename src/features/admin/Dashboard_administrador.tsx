import { useLocation } from 'react-router-dom';
import ListarUsuarios from './ListarUsuarios';
import CrearUsuarios from './CrearUsuarios'; 
import ListarSoloUsuarios from './ListarSoloUsuarios'; 
import ListarSoloAgentes from './ListarSoloAgentes'; 
import ListarSoloAdmins from './ListarSoloAdmins'; 
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
      case '/admin/dashboard/list-only-users':
        return <ListarSoloUsuarios />;
      case '/admin/dashboard/list-only-agents':
        return <ListarSoloAgentes />;
      case '/admin/dashboard/list-only-admins':
        return <ListarSoloAdmins />;
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
