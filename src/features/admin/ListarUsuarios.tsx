import { Button, Table, TextInput, Modal } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { getAllUserProfiles, UserProfile, activateUserProfile, deactivateUserProfile } from 'src/features/admin/hooks/administrador_backend';
import { useNavigate } from 'react-router-dom';
import { enviarCorreo } from '../../utils/enviarCorreo'; // Usa el utilitario centralizado
import { supabase } from 'src/supabase/client';

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

export default function ListarUsuarios() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const navigate = useNavigate();

  // Estados para el modal personalizado
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllUserProfiles();
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

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserEmail(user?.email ?? null);
    };
    getCurrentUser();
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

  const handleUpdateUser = (userId: string) => {
    navigate(`/admin/dashboard/edit-user/${userId}`);
  };

  const handleDeactivateUser = async (userId: string, userName: string | null) => {
    setModalTitle('Desactivar Usuario');
    setModalMessage(`¿Estás seguro de que quieres desactivar a ${userName || 'este usuario'}? Esto cambiará su estado a 'inactivo'.`);
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
        fetchUsers();
      }
    });
    setShowModal(true);
  };

  const handleActivateUser = async (userId: string, userName: string | null) => {
    setModalTitle('Activar Usuario');
    setModalMessage(`¿Estás seguro de que quieres activar a ${userName || 'este usuario'}? Esto cambiará su estado a 'activo'.`);
    setModalType('confirm');
    setModalAction(() => async () => {
      const { data, error: activateError } = await activateUserProfile(userId);
      if (activateError) {
        setModalTitle('Error');
        setModalMessage(`Error al activar usuario: ${activateError.message}`);
        setModalType('alert');
      } else if (data) {
        setModalTitle('Éxito');
        setModalMessage(`Usuario ${data.full_name || 'N/A'} activado.`);
        setModalType('alert');
        fetchUsers();
      }
    });
    setShowModal(true);
  };

  const handleEdit = (userId: string) => {
    setSelectedUserId(userId);
    setView('edit');
  };

  // Usar el utilitario centralizado para enviar correo formal
  const handleEnviarCorreo = async (to_email: string, name: string) => {
    if (!currentUserEmail) {
      setModalTitle('Error');
      setModalMessage('No se pudo obtener el email del usuario actual.');
      setModalType('alert');
      setShowModal(true);
      return;
    }
    try {
      await enviarCorreo(currentUserEmail, to_email, name);
      setModalTitle('Éxito');
      setModalMessage('Correo enviado correctamente.');
      setModalType('alert');
      setShowModal(true);
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('Error enviando el correo.');
      setModalType('alert');
      setShowModal(true);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">Error: {error}</div>;
  }

  // Contamos el número de columnas para el `colSpan` dinámicamente
  // Nombres, Apellidos, Email, Cédula/Pasaporte, Rol, Estado, Acciones = 7 columnas
  const numberOfColumns = 7;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100 top-0">
      <div className="flex justify-between items-center mb-6 ">
        <div className="w-1/3">
          <TextInput
            icon={HiSearch}
            placeholder="Buscar por nombre, apellido, email o cédula/pasaporte..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button color="blue" onClick={() => navigate('/admin/dashboard/create-users')}>
          Crear Nuevo Usuario
        </Button>
      </div>

      <div className="overflow-x-auto relative z-0">
        <Table hoverable className="min-w-full table-auto">
          <Table.Head>
            <Table.HeadCell className="whitespace-nowrap">Nombres</Table.HeadCell>
            <Table.HeadCell className="whitespace-nowrap">Apellidos</Table.HeadCell>
            <Table.HeadCell className="whitespace-nowrap">Email</Table.HeadCell>
            <Table.HeadCell className="whitespace-nowrap">Cédula/Pasaporte</Table.HeadCell>
            {/* ✅ ELIMINADA: <Table.HeadCell className="whitespace-nowrap">Teléfono</Table.HeadCell> */}
            <Table.HeadCell className="whitespace-nowrap">Rol</Table.HeadCell>
            <Table.HeadCell className="whitespace-nowrap">Estado</Table.HeadCell>
            <Table.HeadCell className="whitespace-nowrap">Acciones</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {filteredUsers.length === 0 ? (
              <Table.Row>
                {/* ✅ AJUSTADO: colSpan ahora es 7 (o numberOfColumns) */}
                <Table.Cell colSpan={numberOfColumns} className="text-center text-gray-500 whitespace-nowrap">
                  No se encontraron usuarios.
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredUsers.map((user) => (
                <Table.Row key={user.user_id} className="bg-white">
                  <Table.Cell className="font-medium text-gray-900 whitespace-nowrap">
                    {`${user.primer_nombre || ''} ${user.segundo_nombre || ''}`.trim() || 'N/A'}
                  </Table.Cell>
                  <Table.Cell className="font-medium text-gray-900 whitespace-nowrap">
                    {`${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.trim() || 'N/A'}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">{user.email || 'N/A'}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    {user.tipo_identificacion && user.numero_identificacion
                      ? `${user.tipo_identificacion}: ${user.numero_identificacion}`
                      : 'N/A'}
                  </Table.Cell>
                  {/* ✅ ELIMINADA: <Table.Cell className="whitespace-nowrap">{user.phone_number || 'N/A'}</Table.Cell> */}
                  <Table.Cell className="whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'admin' ? 'bg-green-100 text-green-800' : user.role === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        color="blue"
                        disabled={!user.email || !currentUserEmail}
                        onClick={() => handleEnviarCorreo(user.email!, `${user.primer_nombre || ''} ${user.primer_apellido || ''}`)}
                      >
                        Contactar
                      </Button>
                      {user.status === 'active' ? (
                        <Button size="xs" color="failure" onClick={() => handleDeactivateUser(user.user_id, user.full_name)}>
                          Desactivar
                        </Button>
                      ) : (
                        <Button size="xs" color="success" onClick={() => handleActivateUser(user.user_id, user.full_name)}>
                          Activar
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div> {/* Fin del div con overflow-x-auto */}

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