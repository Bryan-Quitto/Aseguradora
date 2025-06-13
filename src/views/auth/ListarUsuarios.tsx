import { Table, TextInput, Button } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';

interface ListarUsuariosProps {
  onNavigate: (view: string) => void;
}

export default function ListarUsuarios({ onNavigate }: ListarUsuariosProps) {
  const usuarios = [
    { id: 1, nombre: 'Nombre A Apellido A', email: 'admin@example.com', rol: 'Administrador', estado: 'Activo' },
    { id: 2, nombre: 'Nombre B Apellido B', email: 'usuario1@example.com', rol: 'Usuario', estado: 'Activo' },
    { id: 3, nombre: 'Nombre C Apellido C', email: 'usuario2@example.com', rol: 'Usuario', estado: 'Inactivo' },
  ];

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
        <Button color="blue" onClick={() => onNavigate('create-users')}>
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
          {usuarios.map((usuario) => (
            <Table.Row key={usuario.id} className="bg-white">
              <Table.Cell className="font-medium text-gray-900">
                {usuario.nombre}
              </Table.Cell>
              <Table.Cell>{usuario.email}</Table.Cell>
              <Table.Cell>{usuario.rol}</Table.Cell>
              <Table.Cell>
                <span className={`px-3 py-1 rounded-full text-sm ${usuario.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {usuario.estado}
                </span>
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button size="xs" color="light">Actualizar</Button>
                  <Button size="xs" color="failure">Desactivar</Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}