import { Button, Table, TextInput, Modal } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import { useState, useEffect, useMemo } from 'react';
// 1. CORRECCIÓN: Importamos las funciones que SÍ vamos a usar
import { getAllUserProfiles, UserProfile, deleteUserProfile, updateUserProfileStatus } from 'src/features/admin/hooks/administrador_backend';
import { Link } from 'react-router-dom';

// El componente CustomModal está bien, lo dejamos como está.
interface CustomModalProps {
    show: boolean;
    onClose: () => void;
    message: string;
    title: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
}

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
    
    // Estados para el modal (están correctos)
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [modalAction, setModalAction] = useState<(() => void) | undefined>(undefined);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error: fetchError } = await getAllUserProfiles();
        if (fetchError) {
            setError(fetchError.message);
        } else if (data) {
            // 2. CORRECCIÓN: La interfaz UserProfile debe tener 'status'
            setUsers(data as UserProfile[]); 
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    // 3. CORRECCIÓN: Lógica para activar/desactivar usando la columna 'status'
    const handleToggleStatus = async (user: UserProfile) => {
        // Determinamos el nuevo estado. Si es 'active', lo cambiamos a 'inactive', y viceversa.
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        // Suponiendo que tienes una función para actualizar el estado. ¡Necesitarás crearla!
        const { error: toggleError } = await updateUserProfileStatus(user.user_id, newStatus);
        
        if (toggleError) {
            setModalTitle('Error');
            setModalMessage(`Error al cambiar el estado: ${toggleError.message}`);
            setModalType('alert');
            setModalAction(undefined);
            setShowModal(true);
        } else {
            // No es necesario un modal para el éxito, simplemente recargamos los datos.
            fetchUsers();
        }
    };

    // 4. CORRECCIÓN: Lógica de borrado usando el modal para errores y éxito
    const handleDeleteClick = (userId: string, userEmail: string) => {
        setModalTitle('Confirmar Eliminación');
        setModalMessage(`¿Seguro que quieres eliminar al usuario ${userEmail}? Esta acción es permanente.`);
        setModalType('confirm');
        // Aquí pasamos la función que se ejecutará al confirmar
        setModalAction(() => () => confirmDelete(userId)); 
        setShowModal(true);
    };

    const confirmDelete = async (userId: string) => {
        const { error: deleteError } = await deleteUserProfile(userId);
        setShowModal(true); // Mantenemos el modal abierto para mostrar el resultado
        if (deleteError) {
            setModalTitle('Error');
            setModalMessage(`Error al eliminar usuario: ${deleteError.message}`);
        } else {
            setModalTitle('Éxito');
            setModalMessage('Usuario eliminado correctamente.');
            fetchUsers(); // Recargamos la lista de usuarios
        }
        setModalType('alert'); // Cambiamos a tipo alerta para que solo tenga un botón "Aceptar"
        setModalAction(undefined); // Ya no hay acción de confirmación
    };

    if (loading) return <div>Cargando usuarios...</div>;
    if (error) return <div>Error al cargar usuarios: {error}</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
            <div className="flex justify-between mb-4">
                <TextInput id="search" type="text" icon={HiSearch} placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-1/3" />
                <Link to="/admin/dashboard/crear-cliente">
                    <Button color="blue">Crear Nuevo Usuario</Button>
                </Link>
            </div>
            <Table hoverable>
                <Table.Head>
                    <Table.HeadCell>Nombre Completo</Table.HeadCell>
                    <Table.HeadCell>Email</Table.HeadCell>
                    <Table.HeadCell>Rol</Table.HeadCell>
                    <Table.HeadCell>Estado</Table.HeadCell>
                    <Table.HeadCell>Acciones</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                    {filteredUsers.map((user) => (
                        <Table.Row key={user.user_id}>
                            <Table.Cell>{user.full_name}</Table.Cell>
                            <Table.Cell>{user.email}</Table.Cell>
                            <Table.Cell>{user.role}</Table.Cell>
                            <Table.Cell>
                                {/* 5. CORRECCIÓN: Usamos 'user.status' en lugar de 'user.is_active' */}
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                </span>
                            </Table.Cell>
                            <Table.Cell className="flex items-center space-x-2">
                                <Link to={`/admin/dashboard/edit-user/${user.user_id}`}>
                                    <Button size="sm" color="light">Editar</Button>
                                </Link>
                                {/* 6. CORRECCIÓN: Llamamos a handleToggleStatus y ajustamos el texto/color */}
                                <Button size="sm" color={user.status === 'active' ? 'warning' : 'success'} onClick={() => handleToggleStatus(user)}>
                                    {user.status === 'active' ? 'Desactivar' : 'Activar'}
                                </Button>
                                <Button size="sm" color="failure" onClick={() => handleDeleteClick(user.user_id, user.email || 'desconocido')}>
                                    Eliminar
                                </Button>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            
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