import { Button, Table, TextInput } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect } from 'react';
import { getAllUserProfiles, UserProfile, updateUserProfile, deactivateUserProfile } from 'src/features/admin/hooks/administrador_backend';

interface ListarUsuariosProps {
  onNavigate: (view: string) => void;
}

export default function ListarUsuarios({ onNavigate }: ListarUsuariosProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await getAllUserProfiles();
    if (error) {
      setError(error.message);
      console.error('Error fetching user profiles:', error);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (userId: string) => {
    // Aquí podrías navegar a una página de edición o abrir un modal
    // Por ahora, un ejemplo simple de actualización de rol a 'admin'
    const { data, error } = await updateUserProfile(userId, { role: 'admin' });
    if (error) {
      alert(`Error al actualizar usuario: ${error.message}`);
    } else if (data) {
      alert(`Usuario ${data.full_name} actualizado a rol: ${data.role}`);
      fetchUsers(); // Volver a cargar los usuarios para reflejar el cambio
    }
  };

  const handleDeactivateUser = async (userId: string, userName: string | null) => {
    if (window.confirm(`¿Estás seguro de que quieres desactivar a ${userName || 'este usuario'}?`)) {
      const { data, error } = await deactivateUserProfile(userId);
      if (error) {
        alert(`Error al desactivar usuario: ${error.message}`);
      } else if (data) {
        alert(`Usuario ${data.full_name} desactivado.`);
        fetchUsers(); // Volver a cargar los usuarios para reflejar el cambio
      }
    }
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
            placeholder="Buscar usuarios..."
            className="w-full"
          />
        </div>
        <Button color="blue" onClick={() => onNavigate('crear-usuarios')}>
          Crear Nuevo Usuario
        </Button>
      </div>

      <Table hoverable>
        <Table.Head>
          <Table.HeadCell>Nombre</Table.HeadCell>
          <Table.HeadCell>Email</Table.HeadCell>
          <Table.HeadCell>Rol</Table.HeadCell>
          <Table.HeadCell>Estado</Table.HeadCell>
          <Table.HeadCell>Acciones</Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">
          {users.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5} className="text-center text-gray-500">
                No hay usuarios registrados.
              </Table.Cell>
            </Table.Row>
          ) : (
            users.map((user) => (
              <Table.Row key={user.id} className="bg-white">
                <Table.Cell className="font-medium text-gray-900">
                  {user.full_name || 'N/A'}
                </Table.Cell>
                <Table.Cell>N/A</Table.Cell>
                <Table.Cell>{user.role}</Table.Cell>
                <Table.Cell>
                  <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'admin' ? 'bg-green-100 text-green-800' : user.role === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {user.role}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button size="xs" color="light" onClick={() => handleUpdateUser(user.id)}>Actualizar</Button>
                    <Button size="xs" color="failure" onClick={() => handleDeactivateUser(user.id, user.full_name)}>Desactivar</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </div>
  );
}