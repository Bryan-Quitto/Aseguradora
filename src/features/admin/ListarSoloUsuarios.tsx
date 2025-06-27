import { Button, Table, TextInput, Modal } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { listOnlyUsuarios } from './hooks/listUsers';
import { UserProfile } from './hooks/administrador_backend';
import { enviarCorreo } from '../../utils/enviarCorreo';
import { supabase } from 'src/supabase/client';

export default function ListarSoloUsuarios() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserEmail(user?.email ?? null);
            
            const { data, error: fetchError } = await listOnlyUsuarios();
            if (fetchError) {
                setError(fetchError.message);
            } else if (data) {
                setUsers(data);
            }
            setLoading(false);
        };
        fetchInitialData();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.full_name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
            (user.email?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
            (user.numero_identificacion || '').includes(lowerCaseSearchTerm)
        );
    }, [users, searchTerm]);

    const handleEnviarCorreo = async (to_email: string, name: string) => {
        if (!currentUserEmail) {
            setModalTitle('Error');
            setModalMessage('No se pudo obtener el email del usuario actual para enviar el correo.');
            setShowModal(true);
            return;
        }
        try {
            await enviarCorreo(currentUserEmail, to_email, name);
            setModalTitle('Éxito');
            setModalMessage('Correo enviado correctamente.');
        } catch (err) {
            setModalTitle('Error');
            setModalMessage('Hubo un problema al enviar el correo.');
        }
        setShowModal(true);
    };

    if (loading) return <div className="text-center p-10">Cargando clientes...</div>;
    if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;

    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-800">Lista de Clientes</h2>
            <div className="flex justify-between items-center mb-6">
                <div className="w-1/3">
                    <TextInput
                        id="search"
                        type="text"
                        icon={HiSearch}
                        placeholder="Buscar por nombre, email, cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

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
                        {filteredUsers.map((user) => (
                            <Table.Row key={user.user_id} className="bg-white">
                                <Table.Cell>{`${user.primer_nombre || ''} ${user.segundo_nombre || ''}`.trim() || 'N/A'}</Table.Cell>
                                <Table.Cell>{`${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.trim() || 'N/A'}</Table.Cell>
                                <Table.Cell>{user.email || 'N/A'}</Table.Cell>
                                <Table.Cell>{user.numero_identificacion ? `${user.tipo_identificacion}: ${user.numero_identificacion}` : 'N/A'}</Table.Cell>
                                <Table.Cell>
                                    <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">{user.role}</span>
                                </Table.Cell>
                                <Table.Cell>
                                    <Button size="xs" color="blue" disabled={!user.email} onClick={() => handleEnviarCorreo(user.email!, user.full_name || '')}>
                                        Contactar
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </div>
            
            <Modal show={showModal} onClose={() => setShowModal(false)} size="md">
                <Modal.Header>{modalTitle}</Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <p className="text-lg text-gray-500">{modalMessage}</p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => setShowModal(false)}>Aceptar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}