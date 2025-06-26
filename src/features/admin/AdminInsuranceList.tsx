import { useState, useEffect } from 'react';
import { supabase } from 'src/supabase/client';
import { Link } from 'react-router-dom';
import { Button, Table, Modal } from 'flowbite-react';

interface InsuranceProduct {
    id: string;
    name: string;
    type: 'life' | 'health' | 'other';
    description: string | null;
    duration_months: number | null;
    coverage_details: {
        [key: string]: any;
    };
    base_premium: number;
    currency: string;
    terms_and_conditions: string | null;
    is_active: boolean;
    admin_notes: string | null;
    fixed_payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;
    created_at: string;
    updated_at: string;
}

export default function AdminInsuranceList() {
    const [products, setProducts] = useState<InsuranceProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
    const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchInsuranceProductsAndUserRole = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();
                    setCurrentUserRole(profileData?.role || null);
                }

                const { data, error: fetchError } = await supabase
                    .from('insurance_products')
                    .select('*');

                if (fetchError) {
                    throw fetchError;
                }
                setProducts(data || []);

            } catch (err: any) {
                setError("Error al cargar datos: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInsuranceProductsAndUserRole();
    }, []);

    const capitalize = (s: string | null | undefined): string => {
        if (!s) return 'N/A';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const handleDeleteClick = (productId: string) => {
        setProductToDeleteId(productId);
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!productToDeleteId) return;

        setLoading(true);
        setShowConfirmDialog(false);

        try {
            const { error: deleteError } = await supabase
                .from('insurance_products')
                .delete()
                .eq('id', productToDeleteId);

            if (deleteError) {
                throw deleteError;
            }

            setProducts(products.filter(product => product.id !== productToDeleteId));
        } catch (err: any) {
            setError('Error al eliminar el producto de seguro: ' + err.message);
        } finally {
            setLoading(false);
            setProductToDeleteId(null);
        }
    };

    if (loading) {
        return <div className="text-center p-10">Cargando productos de seguro...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-600">Error: {error}</div>;
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-blue-800">Gestión de Productos de Seguro</h1>
                <Link to="/admin/dashboard/insurance-products/create">
                    <Button color="blue">Crear Nuevo Producto</Button>
                </Link>
            </div>
            
            <div className="overflow-x-auto">
                <Table hoverable>
                    <Table.Head>
                        <Table.HeadCell>Nombre del Producto</Table.HeadCell>
                        <Table.HeadCell>Tipo</Table.HeadCell>
                        <Table.HeadCell>Estado</Table.HeadCell>
                        <Table.HeadCell>Prima Base</Table.HeadCell>
                        <Table.HeadCell>Acciones</Table.HeadCell>
                    </Table.Head>
                    <Table.Body className="divide-y">
                        {products.map((product) => (
                            <Table.Row key={product.id} className="bg-white">
                                <Table.Cell className="font-medium text-gray-900">{product.name}</Table.Cell>
                                <Table.Cell>{capitalize(product.type)}</Table.Cell>
                                <Table.Cell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {product.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </Table.Cell>
                                <Table.Cell>${product.base_premium.toFixed(2)}</Table.Cell>
                                <Table.Cell>
                                    <div className="flex gap-2 items-center">
                                        <Link to={`/admin/dashboard/insurance-products/${product.id}/edit`}>
                                            <Button size="xs" color="light">Editar</Button>
                                        </Link>
                                        <Link to={`/admin/dashboard/insurance-products/${product.id}/required-documents`}>
                                            <Button size="xs" color="purple">Documentos</Button>
                                        </Link>
                                        {currentUserRole === 'superadministrator' && (
                                            <Button size="xs" color="failure" onClick={() => handleDeleteClick(product.id)}>
                                                Eliminar
                                            </Button>
                                        )}
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </div>

            <Modal show={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} size="md" popup>
                <Modal.Header />
                <Modal.Body>
                    <div className="text-center">
                        <h3 className="mb-5 text-lg font-normal text-gray-500">
                            ¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.
                        </h3>
                        <div className="flex justify-center gap-4">
                            <Button color="failure" onClick={confirmDelete}>
                                Sí, eliminar
                            </Button>
                            <Button color="gray" onClick={() => setShowConfirmDialog(false)}>
                                No, cancelar
                            </Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}