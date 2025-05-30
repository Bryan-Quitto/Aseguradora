import { Button, Table, TextInput, Modal } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { listUsers } from 'src/features/admin/hooks/listUsers';
import { UserProfile, updateUserProfile } from 'src/features/admin/hooks/administrador_backend';
import { useNavigate } from 'react-router-dom';
import { deactivateUserProfile } from 'src/features/admin/hooks/deactivateUser';

// Componente de Modal Personalizado para reemplazar alert/confirm
interface CustomModalProps {
  show: boolean;
  onClose: () => void;
  message: string;
  title: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ show, onClose, message, title, type, onConfirm }) => {
  if (!show) return null;

  return (
    <Modal show={show} onClose={onClose} dismissible>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        {type === 'confirm' && (
          <Button color="gray" onClick={onClose}>
            Cancelar
          </Button>
        )}
        <Button
          color={type === 'alert' ? 'blue' : 'failure'}
          onClick={() => {
            if (onConfirm) onConfirm();
            onClose();
          }}
        >
          {type === 'alert' ? 'Aceptar' : 'Confirmar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};


// Remove the onNavigate prop interface as it's no longer needed
// interface ListarUsuariosProps {
//   onNavigate: (view: string) => void;
// }

// Remove the onNavigate prop from the function signature
export default function ListarUsuarios(/*{ onNavigate }: ListarUsuariosProps*/) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el término de búsqueda

  const navigate = useNavigate(); // Initialize useNavigate

  // Estados para el modal personalizado
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null); // Acción a ejecutar en confirm

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await listUsers();
    console.log(data);
    if (fetchError) {
      setError(fetchError.message);
      console.error('Error fetching user profiles:', fetchError);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtrar usuarios basado en el término de búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return users.filter(user => {
      const fullName = `${user.primer_nombre || ''} ${user.segundo_nombre || ''} ${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const identification = `${user.tipo_identificacion || ''} ${user.numero_identificacion || ''}`.toLowerCase();

      return fullName.includes(lowerCaseSearchTerm) ||
             email.includes(lowerCaseSearchTerm) ||
             identification.includes(lowerCaseSearchTerm);
    });
  }, [users, searchTerm]);

  const handleUpdateUser = async (userId: string, currentRole: string) => {
    // This function will now navigate to the edit page instead of changing role directly
    navigate(`/admin/dashboard/edit-user/${userId}`);
  };

  const handleDeactivateUser = async (userId: string, userName: string | null) => {
    setModalTitle('Desactivar Usuario');
    setModalMessage(`¿Estás seguro de que quieres desactivar a ${userName || 'este usuario'}? Esto cambiará su rol a 'inactive'.`);
    setModalType('confirm');
    setModalAction(() => async () => {
      const { data, error: deactivateError } = await deactivateUserProfile(userId);
      if (deactivateError) {
        setModalTitle('Error');
        setModalMessage(`Error al desactivar usuario: ${deactivateError.message}`);
        setModalType('alert');
      } else if (data) {
        setModalTitle('Éxito');
        setModalMessage(`Usuario ${data.full_name || 'N/A'} desactivado.`);
        setModalType('alert');
        fetchUsers(); // Volver a cargar los usuarios para reflejar el cambio
      }
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="text-center p-10">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <div className="w-1/3">
          <TextInput
            icon={HiSearch}
            placeholder="Buscar por nombre, apellido, email o cédula/pasaporte..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Use navigate to go to the create-users route */}
        <Button color="blue" onClick={() => navigate('create-users')}>
          Crear Nuevo Usuario
        </Button>
      </div>

      <Table hoverable>
        <Table.Head>
          <Table.HeadCell>Nombres</Table.HeadCell>
          <Table.HeadCell>Apellidos</Table.HeadCell>
          <Table.HeadCell>Email</Table.HeadCell>
          <Table.HeadCell>Cédula/Pasaporte</Table.HeadCell>
          <Table.HeadCell>Rol</Table.HeadCell>
          <Table.HeadCell>Acciones</Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">
          {filteredUsers.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="text-center text-gray-500">
                No se encontraron usuarios.
              </Table.Cell>
            </Table.Row>
          ) : (
            filteredUsers.map((user) => (
              <Table.Row key={user.user_id} className="bg-white">
                <Table.Cell className="font-medium text-gray-900">
                  {`${user.primer_nombre || ''} ${user.segundo_nombre || ''}`.trim() || 'N/A'}
                </Table.Cell>
                <Table.Cell className="font-medium text-gray-900">
                  {`${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.trim() || 'N/A'}
                </Table.Cell>
                <Table.Cell>{user.email || 'N/A'}</Table.Cell>
                <Table.Cell>
                  {user.tipo_identificacion && user.numero_identificacion
                    ? `${user.tipo_identificacion}: ${user.numero_identificacion}`
                    : 'N/A'}
                </Table.Cell>
                <Table.Cell>
                  <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'admin' ? 'bg-green-100 text-green-800' : user.role === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {user.role}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button size="xs" color="light" onClick={() => handleUpdateUser(user.user_id, user.role)}>
                      Editar
                    </Button>
                    {user.role !== 'inactive' && ( // Solo mostrar el botón si no está ya inactivo
                      <Button size="xs" color="failure" onClick={() => handleDeactivateUser(user.user_id, user.full_name)}>
                        Desactivar
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Modal Personalizado */}
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onConfirm={modalAction || undefined}
      />
    </div>
  );
}
