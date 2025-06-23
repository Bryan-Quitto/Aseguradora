import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
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
    sort_order: 0
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
            setDocuments(docsData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchProductAndDocs();
    }, [fetchProductAndDocs]);

    const handleOpenModal = (doc: RequiredDocument | null = null) => {
        if (doc) {
            setIsEditing(true);
            setCurrentDoc(doc);
        } else {
            setIsEditing(false);
            const maxOrder = documents.reduce((max, d) => Math.max(max, d.sort_order), 0);
            setCurrentDoc({ ...emptyDoc, sort_order: maxOrder + 1 });
        }
        setModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setCurrentDoc(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
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
                    sort_order: currentDoc.sort_order || 0
                });
            } else {
                await createRequiredDocument({
                    product_id: productId,
                    document_name: currentDoc.document_name,
                    description: currentDoc.description || null,
                    is_required: currentDoc.is_required || false,
                    sort_order: currentDoc.sort_order || 0
                });
            }
            setModalOpen(false);
            fetchProductAndDocs();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este documento requerido?')) {
            try {
                await deleteRequiredDocument(docId);
                fetchProductAndDocs();
            } catch (err: any) {
                setError(err.message);
            }
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
                    <button onClick={() => handleOpenModal()} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700">
                        Añadir Documento
                    </button>
                </div>

                {documents.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No hay documentos requeridos definidos para este producto.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre del Documento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requerido</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td className="px-6 py-4">{doc.sort_order}</td>
                                        <td className="px-6 py-4 font-medium">{doc.document_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{doc.description}</td>
                                        <td className="px-6 py-4">{doc.is_required ? <Icon icon="solar:check-circle-bold" className="text-green-500 h-5 w-5" /> : <Icon icon="solar:close-circle-bold" className="text-red-500 h-5 w-5" />}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleOpenModal(doc)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                            <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {isModalOpen && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6">{isEditing ? 'Editar' : 'Añadir'} Documento Requerido</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="document_name" className="block text-sm font-medium">Nombre del Documento</label>
                                <input type="text" name="document_name" id="document_name" value={currentDoc.document_name || ''} onChange={handleFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium">Descripción (para el cliente)</label>
                                <textarea name="description" id="description" value={currentDoc.description || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor="sort_order" className="block text-sm font-medium">Orden de Visualización</label>
                                <input type="number" name="sort_order" id="sort_order" value={currentDoc.sort_order || 0} onChange={handleFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="is_required" id="is_required" checked={currentDoc.is_required || false} onChange={handleFormChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                <label htmlFor="is_required" className="ml-2 block text-sm">Este documento es obligatorio</label>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Guardar Cambios' : 'Añadir Documento'}</button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}
        </>
    );
}