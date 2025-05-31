import { Button, Table, TextInput } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { listOnlyAgentes } from './hooks/listUsers';
import { UserProfile } from './hooks/administrador_backend';

export default function ListarSoloAgentes() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await listOnlyAgentes();
      if (error) {
        setError(error.message);
      } else if (data) {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

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

  if (loading) {
    return <div className="text-center p-10">Cargando agentes...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100 top-0">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Lista de Agentes</h2>
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10">
        <div className="w-1/3">
          <TextInput
            icon={HiSearch}
            placeholder="Buscar por nombre, apellido, email o cédula/pasaporte..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
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
                  No se encontraron agentes.
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
                    <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Button size="xs" color="failure">
                      Desactivar
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}