import { Button, Table } from 'flowbite-react'; // Ya no necesitamos TextInput
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { listOnlyAgentes } from './hooks/listUsers';
import { UserProfile } from './hooks/administrador_backend';
import { enviarCorreo } from '../../utils/enviarCorreo';
import { supabase } from 'src/supabase/client';

export default function ListarSoloAgentes() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    async function fetchUsersAndCurrentUser() {
      setLoading(true);
      
      const { data, error: usersError } = await listOnlyAgentes();
      if (usersError) {
        setError(usersError.message);
      } else if (data) {
        setUsers(data);
      }

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserEmail(user?.email ?? null);
      
      setLoading(false);
    }
    fetchUsersAndCurrentUser();
  }, []);

  // ========= LÓGICA DE FILTRADO MEJORADA =========
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }
    return users.filter(user => 
      (user.numero_identificacion || '').startsWith(searchTerm)
    );
  }, [users, searchTerm]);

  // Tu lógica de enviar correo está bien
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
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('Error enviando el correo.');
    }
    setShowModal(true);
  };

  if (loading) return <div className="text-center p-10">Cargando agentes...</div>;
  if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Lista de Agentes</h2>
      <div className="flex justify-between items-center mb-6">
        
        {/* ========= INPUT DE BÚSQUEDA MEJORADO ========= */}
        <div className="w-1/3 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
             <HiSearch className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cédula..."
            className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500"
            value={searchTerm}
            inputMode="numeric"
            pattern="\d*"
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setSearchTerm(value);
            }}
          />
        </div>
      </div>

      {/* He eliminado el overflow-y-auto y maxHeight para consistencia con los otros listados */}
      <div className="overflow-x-auto">
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
                  <Table.Cell>
                    <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 whitespace-nowrap">
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
                      <Button size="xs" color="failure">
                        Desactivar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Modal se mantiene sin cambios */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-2 font-bold">{modalTitle}</h3>
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