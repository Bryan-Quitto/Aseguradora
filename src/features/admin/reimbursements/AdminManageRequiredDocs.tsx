import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button, Modal, Label, TextInput, Textarea, Checkbox } from 'flowbite-react';
import {
    getRequiredDocuments,
    createRequiredDocument,
    updateRequiredDocument,
    deleteRequiredDocument,
    RequiredDocument
} from 'src/features/reimbursements/reimbursement_management';
import { supabase } from 'src/supabase/client';

const emptyDoc: Omit<RequiredDocument, 'id' | 'product_id'> = {
    document_name: '',
    description: '',
    is_required: true,
    sort_order: 1
};

export default function AdminManageRequiredDocs() {
    const { productId } = useParams<{ productId: string }>();
    const [productName, setProductName] = useState('');
    const [documents, setDocuments] = useState<RequiredDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setModalOpen] = useState(false);
    const [currentDoc, setCurrentDoc] = useState<Partial<RequiredDocument>>(emptyDoc);
    const [isEditing, setIsEditing] = useState(false);
    const [availablePriorities, setAvailablePriorities] = useState<number[]>([]);
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<RequiredDocument | null>(null);

    const fetchProductAndDocs = useCallback(async () => {
        if (!productId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: productData, error: productError } = await supabase
                .from('insurance_products')
                .select('name')
                .eq('id', productId)
                .single();
            if (productError) throw new Error('No se pudo encontrar el producto de seguro.');
            setProductName(productData.name);

            const { data: docsData, error: docsError } = await getRequiredDocuments(productId);
            if (docsError) throw new Error('Error al cargar los documentos requeridos.');
            const sortedDocs = (docsData || []).sort((a, b) => a.sort_order - b.sort_order);
            setDocuments(sortedDocs);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchProductAndDocs();
    }, [fetchProductAndDocs]);

    const calculateAvailablePriorities = (editingDoc: Partial<RequiredDocument> | null) => {
        const usedPriorities = documents.map(doc => doc.sort_order);
        const priorities = [];
        const limit = documents.length + 5; 

        for (let i = 1; i <= limit; i++) {
            if (!usedPriorities.includes(i)) {
                priorities.push(i);
            }
        }

        if (isEditing && editingDoc?.sort_order && !priorities.includes(editingDoc.sort_order)) {
            priorities.push(editingDoc.sort_order);
            priorities.sort((a, b) => a - b);
        }
        
        setAvailablePriorities(priorities);
    };

    const handleOpenModal = (doc: RequiredDocument | null = null) => {
        if (doc) {
            setIsEditing(true);
            setCurrentDoc(doc);
            calculateAvailablePriorities(doc);
        } else {
            setIsEditing(false);
            const maxOrder = documents.reduce((max, d) => Math.max(max, d.sort_order), 0);
            const newDoc = { ...emptyDoc, sort_order: maxOrder + 1 };
            setCurrentDoc(newDoc);
            calculateAvailablePriorities(newDoc);
        }
        setModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setCurrentDoc(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'sort_order' ? parseInt(value) : value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !currentDoc.document_name) return;
        
        try {
            if (isEditing && currentDoc.id) {
                await updateRequiredDocument(currentDoc.id, {
                    document_name: currentDoc.document_name,
                    description: currentDoc.description || null,
                    is_required: currentDoc.is_required || false,
                    sort_order: currentDoc.sort_order || 1
                });
            } else {
                await createRequiredDocument({
                    product_id: productId,
                    document_name: currentDoc.document_name,
                    description: currentDoc.description || null,
                    is_required: currentDoc.is_required || false,
                    sort_order: currentDoc.sort_order || 1
                });
            }
            setModalOpen(false);
            fetchProductAndDocs();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteClick = (doc: RequiredDocument) => {
        setDocToDelete(doc);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;
        try {
            await deleteRequiredDocument(docToDelete.id);
            setShowDeleteModal(false);
            setDocToDelete(null);
            fetchProductAndDocs();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div className="text-center p-8">Cargando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link to="/admin/dashboard/insurance-products" className="text-sm text-blue-600 hover:underline">← Volver a Productos</Link>
                        <h2 className="text-3xl font-bold text-blue-700">Documentos para: {productName}</h2>
                    </div>
                    <Button color="success" onClick={() => handleOpenModal()}>
                        <Icon icon="solar:add-circle-bold" className="mr-2 h-5 w-5" />
                        Añadir Documento
                    </Button>
                </div>

                {documents.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No hay documentos requeridos definidos.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre del Documento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requerido</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td className="px-6 py-4 font-bold text-lg text-gray-700">{doc.sort_order}</td>
                                        <td className="px-6 py-4 font-medium">{doc.document_name}</td>
                                        <td className="px-6 py-4">{doc.is_required ? <Icon icon="solar:check-circle-bold" className="text-green-500 h-6 w-6" /> : <Icon icon="solar:close-circle-bold" className="text-red-500 h-6 w-6" />}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Button size="xs" color="light" onClick={() => handleOpenModal(doc)}>Editar</Button>
                                            <Button size="xs" color="failure" onClick={() => handleDeleteClick(doc)} className="ml-2">Eliminar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <Modal show={isModalOpen} onClose={() => setModalOpen(false)} size="lg">
                <Modal.Header>{isEditing ? 'Editar' : 'Añadir'} Documento Requerido</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="document_name" value="Nombre del Documento" />
                            <TextInput id="document_name" name="document_name" value={currentDoc.document_name || ''} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="description" value="Descripción (visible para el cliente)" />
                            <Textarea id="description" name="description" value={currentDoc.description || ''} onChange={handleFormChange} rows={3} />
                        </div>
                        <div>
                            <Label htmlFor="sort_order" value="Prioridad de Visualización" />
                            <select id="sort_order" name="sort_order" value={currentDoc.sort_order} onChange={handleFormChange} required className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                                {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="is_required" name="is_required" checked={currentDoc.is_required || false} onChange={handleFormChange} />
                            <Label htmlFor="is_required">Este documento es obligatorio</Label>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button color="blue" onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Añadir Documento'}</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showDeleteModal} size="md" popup onClose={() => setShowDeleteModal(false)}>
                <Modal.Header />
                <Modal.Body>
                    <div className="text-center">
                        <Icon icon="solar:danger-bold-duotone" className="mx-auto mb-4 h-14 w-14 text-gray-400" />
                        <h3 className="mb-5 text-lg font-normal text-gray-500">
                            ¿Estás seguro de que quieres eliminar el documento "{docToDelete?.document_name}"?
                        </h3>
                        <div className="flex justify-center gap-4">
                            <Button color="failure" onClick={confirmDelete}>Sí, eliminar</Button>
                            <Button color="gray" onClick={() => setShowDeleteModal(false)}>No, cancelar</Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
}