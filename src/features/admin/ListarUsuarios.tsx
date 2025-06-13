import { Button, Table, TextInput, Modal } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import { getAllUserProfiles, UserProfile, deleteUserProfile, updateUserProfileStatus } from 'src/features/admin/hooks/administrador_backend';
import { enviarCorreo } from 'src/utils/enviarCorreo';

// Interfaz para el modal
interface CustomModalProps {
    show: boolean;
    onClose: () => void;
    message: string;
    title: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
}

// Componente para el modal
const CustomModal = ({ show, onClose, message, title, type, onConfirm }: CustomModalProps) => {
    if (!show) return null;

    return (
        <Modal show={show} onClose={onClose} dismissible>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>
                <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                    {message}
                </p>
            </Modal.Body>
            <Modal.Footer>
                {type === 'confirm' && <Button color="gray" onClick={onClose}>Cancelar</Button>}
                <Button color={type === 'alert' ? 'blue' : 'failure'} onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                }}>
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
    
    // Estados para roles y usuario actual
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // Estados para el modal
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [modalAction, setModalAction] = useState<(() => void) | undefined>(undefined);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                setCurrentUserEmail(user.email!);
                
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();
                
                setCurrentUserRole(profile?.role || null);
            }

            await fetchUsers();
            setLoading(false);
        };
        fetchInitialData();
    }, []);

    const fetchUsers = async () => {
        const { data, error: fetchError } = await getAllUserProfiles();
        if (fetchError) {
            setError(fetchError.message);
        } else if (data) {
            setUsers(data as UserProfile[]); 
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return users.filter(user => {
            const fullName = `${user.primer_nombre || ''} ${user.segundo_nombre || ''} ${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.toLowerCase();
            const email = user.email?.toLowerCase() || '';
            const identification = `${user.tipo_identificacion || ''} ${user.numero_identificacion || ''}`.toLowerCase();
            const role = user.role?.toLowerCase() || '';

            return fullName.includes(lowerCaseSearchTerm) ||
                   email.includes(lowerCaseSearchTerm) ||
                   identification.includes(lowerCaseSearchTerm) ||
                   role.includes(lowerCaseSearchTerm);
        });
    }, [users, searchTerm]);
    
    const handleToggleStatus = async (user: UserProfile) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const { error: toggleError } = await updateUserProfileStatus(user.user_id, newStatus);
        
        if (toggleError) {
            setModalTitle('Error');
            setModalMessage(`Error al cambiar el estado: ${toggleError.message}`);
            setShowModal(true);
        } else {
            fetchUsers();
        }
    };

    const handleDeleteClick = (userId: string, userEmail: string) => {
        setModalTitle('Confirmar Eliminación');
        setModalMessage(`¿Seguro que quieres eliminar al usuario ${userEmail}? Esta acción es permanente.`);
        setModalType('confirm');
        setModalAction(() => () => confirmDelete(userId)); 
        setShowModal(true);
    };

    const confirmDelete = async (userId: string) => {
        const { error: deleteError } = await deleteUserProfile(userId);
        if (deleteError) {
            setModalTitle('Error');
            setModalMessage(`Error al eliminar usuario: ${deleteError.message}`);
        } else {
            setModalTitle('Éxito');
            setModalMessage('Usuario eliminado correctamente.');
            fetchUsers();
        }
        setModalType('alert');
        setModalAction(undefined);
        setShowModal(true);
    };

    const handleEnviarCorreo = async (to_email: string, name: string) => {
        if (!currentUserEmail) {
            setModalTitle('Error');
            setModalMessage('No se pudo obtener el email del usuario actual.');
        } else {
            try {
                await enviarCorreo(currentUserEmail, to_email, name);
                setModalTitle('Éxito');
                setModalMessage('Correo enviado correctamente.');
            } catch (error) {
                setModalTitle('Error');
                setModalMessage('Hubo un problema al enviar el correo.');
            }
        }
        setModalType('alert');
        setModalAction(undefined);
        setShowModal(true);
    };

    if (loading) return <div className="text-center p-10">Cargando usuarios...</div>;
    if (error) return <div className="text-center p-10 text-red-600">Error: {error}</div>;

    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <h1 className="text-2xl font-bold mb-4 text-blue-800">Gestión de Usuarios</h1>
            <div className="flex justify-between items-center mb-6">
                <div className="w-1/3">
                    <TextInput id="search" type="text" icon={HiSearch} placeholder="Buscar por nombre, email, rol..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
                </div>
                <Link to="/admin/dashboard/create-users">
                    <Button color="blue">Crear Nuevo Usuario</Button>
                </Link>
            </div>
            <div className="overflow-x-auto">
                <Table hoverable>
                    <Table.Head>
                        <Table.HeadCell>Nombres</Table.HeadCell>
                        <Table.HeadCell>Apellidos</Table.HeadCell>
                        <Table.HeadCell>Email</Table.HeadCell>
                        <Table.HeadCell>Cédula/Pasaporte</Table.HeadCell>
                        <Table.HeadCell>Rol</Table.HeadCell>
                        <Table.HeadCell>Estado</Table.HeadCell>
                        <Table.HeadCell>Acciones</Table.HeadCell>
                    </Table.Head>
                    <Table.Body className="divide-y">
                        {filteredUsers.map((user) => {
                            const isSelf = user.user_id === currentUserId;
                            const isSuperAdminRow = user.role === 'superadministrator';
                            const canEdit = !isSuperAdminRow || (isSuperAdminRow && isSelf);
                            const canToggleStatus = !isSelf && !isSuperAdminRow;
                            const canDelete = currentUserRole === 'superadministrator' && !isSelf && !isSuperAdminRow;

                            return (
                                <Table.Row key={user.user_id} className="bg-white">
                                    <Table.Cell className="font-medium text-gray-900">{`${user.primer_nombre || ''} ${user.segundo_nombre || ''}`.trim()}</Table.Cell>
                                    <Table.Cell className="font-medium text-gray-900">{`${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.trim()}</Table.Cell>
                                    <Table.Cell>{user.email}</Table.Cell>
                                    <Table.Cell>{user.numero_identificacion ? `${user.tipo_identificacion}: ${user.numero_identificacion}` : 'N/A'}</Table.Cell>
                                    <Table.Cell><span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">{user.role}</span></Table.Cell>
                                    <Table.Cell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex gap-2 items-center">
                                            <Button size="xs" color="blue" disabled={!user.email} onClick={() => handleEnviarCorreo(user.email!, user.full_name || '')}>
                                                Contactar
                                            </Button>
                                            {canEdit && (
                                                <Link to={`/admin/dashboard/edit-user/${user.user_id}`}>
                                                    <Button size="xs" color="light">Editar</Button>
                                                </Link>
                                            )}
                                            {canToggleStatus && (
                                                <Button size="xs" color={user.status === 'active' ? 'warning' : 'success'} onClick={() => handleToggleStatus(user)}>
                                                    {user.status === 'active' ? 'Desactivar' : 'Activar'}
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button size="xs" color="failure" onClick={() => handleDeleteClick(user.user_id, user.email || 'desconocido')}>
                                                    Eliminar
                                                </Button>
                                            )}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            </div>
            
            <CustomModal
                show={showModal}
                onClose={() => setShowModal(false)}
                message={modalMessage}
                title={modalTitle}
                type={modalType}
                onConfirm={modalAction}
            />
        </div>
    );
}