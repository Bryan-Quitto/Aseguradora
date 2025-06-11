import { Button, Table, TextInput } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { listOnlyAdmins } from './hooks/listUsers';
import { UserProfile } from './hooks/administrador_backend';
import { enviarCorreo } from '../../utils/enviarCorreo';
import { supabase } from 'src/supabase/client';

export default function ListarSoloAdmins() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await listOnlyAdmins();
      if (error) {
        setError(error.message);
      } else if (data) {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchUsers();

    // Obtener email del usuario actual
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserEmail(user?.email ?? null);
    };
    getCurrentUser();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(user => {
      const fullName = `${user.primer_nombre || ''} ${user.segundo_nombre || ''} ${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const identification = `${user.tipo_identificacion || ''} ${user.numero_identificacion || ''}`.toLowerCase();
      return (
        fullName.includes(lower) ||
        email.includes(lower) ||
        identification.includes(lower)
      );
    });
  }, [users, searchTerm]);

  const handleEnviarCorreo = async (to_email: string, name: string) => {
    if (!currentUserEmail) {
      setModalTitle('Error');
      setModalMessage('No se pudo obtener el email del usuario actual.');
      setShowModal(true);
      return;
    }
    try {
      await enviarCorreo(currentUserEmail, to_email, name);
      setModalTitle('Éxito');
      setModalMessage('Correo enviado correctamente.');
      setShowModal(true);
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('Error enviando el correo.');
      setShowModal(true);
    }
  };

  if (loading) return <div className="text-center p-10">Cargando administradores...</div>;
  if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Lista de Administradores</h2>
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
                No se encontraron administradores.
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
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      color="blue"
                      disabled={!user.email || !currentUserEmail}
                      onClick={() => handleEnviarCorreo(user.email!, `${user.primer_nombre || ''} ${user.primer_apellido || ''}`)}
                    >
                      Contactar
                    </Button>
                    {/* CAMBIO AQUÍ: Oculta el botón "Desactivar" si el rol es 'superadministrator' */}
                    {user.role !== 'superadministrator' && (
                      <Button size="xs" color="failure">
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
      {/* Modal simple */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h3 className="font-bold mb-2">{modalTitle}</h3>
            <p>{modalMessage}</p>
            <div className="mt-4 flex justify-end">
              <Button size="xs" onClick={() => setShowModal(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}