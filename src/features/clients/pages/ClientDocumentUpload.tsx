import React, { useState, useEffect } from 'react';
import { supabase } from 'src/supabase/client';
import FileUpload from 'src/components/shared/FileUpload';
import { Policy, getPoliciesByClientId } from '../../policies/policy_management';

interface Document {
    id: string;
    policy_id: string;
    document_name: string;
    file_path: string;
    uploaded_at: string;
    file_url?: string;
    uploaded_by: string;
    document_type?: string;
}

const ClientDocumentUpload: React.FC = () => {
    const [loadingPolicies, setLoadingPolicies] = useState(true);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string; filePath: string; name: string } | null>(null);

    const acceptedFileTypes = ".pdf,.jpg,.jpeg,.png,.svg";
    const acceptedFileTypesDisplay = acceptedFileTypes.replace(/\./g, '').toUpperCase().split(',').join(', ');

    useEffect(() => {
        const fetchUserAndPolicies = async () => {
            setLoadingPolicies(true);
            setError(null);
            setSuccessMessage(null);

            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    throw new Error(`Error al obtener sesión: ${sessionError.message}`);
                }

                if (session?.user) {
                    setUserId(session.user.id);
                    const { data: policiesData, error: policiesError } = await getPoliciesByClientId(session.user.id);

                    if (policiesError) {
                        throw new Error(`Error al cargar pólizas: ${policiesError.message}`);
                    }

                    if (policiesData && policiesData.length > 0) {
                        setPolicies(policiesData);
                        setSelectedPolicyId(policiesData[0].id);
                    } else {
                        setPolicies([]);
                        setSelectedPolicyId(null);
                        setSuccessMessage("No tienes pólizas. Por favor, crea una para subir documentos.");
                    }
                } else {
                    setError("No se pudo obtener la información del usuario. Por favor, inicie sesión.");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido al cargar las pólizas.');
                console.error('Error fetching policies:', err);
            } finally {
                setLoadingPolicies(false);
            }
        };

        fetchUserAndPolicies();
    }, []);

    const fetchDocumentsForPolicy = async (policyId: string) => {
        setLoadingDocuments(true);
        setError(null);
        try {
            const { data, error: docsError } = await supabase
                .from('policy_documents')
                .select('*')
                .eq('policy_id', policyId)
                .order('uploaded_at', { ascending: false });

            if (docsError) {
                throw new Error(`Error al cargar documentos: ${docsError.message}`);
            }

            const documentsWithUrls = await Promise.all((data || []).map(async (doc: Document) => {
                let fileUrl = '#';
                if (doc.file_path.startsWith('contracts/')) {
                    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(doc.file_path);
                    fileUrl = urlData?.publicUrl || '#';
                } else {
                    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(doc.file_path);
                    fileUrl = urlData?.publicUrl || '#';
                }
                return { ...doc, file_url: fileUrl };
            }));
            setDocuments(documentsWithUrls as Document[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al recargar los documentos.');
            console.error('Error re-fetching documents:', err);
        } finally {
            setLoadingDocuments(false);
        }
    };

    useEffect(() => {
        if (selectedPolicyId) {
            fetchDocumentsForPolicy(selectedPolicyId);
        } else {
            setDocuments([]);
        }
    }, [selectedPolicyId]);

    const handleDocumentUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) {
            setError('Por favor seleccione un documento para subir.');
            setSuccessMessage(null);
            return;
        }
        if (!selectedPolicyId) {
            setError('Por favor seleccione una póliza antes de subir un documento.');
            setSuccessMessage(null);
            return;
        }
        if (!userId) {
            setError('No se pudo determinar el usuario para la subida. Por favor, intente recargar la página.');
            setSuccessMessage(null);
            return;
        }

        const file = files[0];
        setUploadingDocument(true);
        setError(null);
        setSuccessMessage(null);

        const allowedExtensions = acceptedFileTypes.split(',').map(ext => ext.trim().toLowerCase());
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
            setError(`Formato de archivo no permitido. Solo se aceptan: ${acceptedFileTypesDisplay}.`);
            setUploadingDocument(false);
            return;
        }

        let uploadedFilePath: string | null = null;

        try {
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
            const filePath = `policies/${selectedPolicyId}/${uniqueFileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(`Error al subir archivo: ${uploadError.message}`);
            }
            if (!uploadData?.path) {
                throw new Error('La ruta del archivo subido es nula o indefinida.');
            }
            uploadedFilePath = uploadData.path;

            const { error: dbError } = await supabase
                .from('policy_documents')
                .insert({
                    policy_id: selectedPolicyId,
                    document_name: file.name,
                    file_path: uploadedFilePath,
                    uploaded_by: userId,
                    document_type: 'policies',
                });

            if (dbError) {
                console.error('Error al insertar metadatos del documento en DB, intentando limpiar el archivo subido:', dbError);
                if (uploadedFilePath) {
                    await supabase.storage.from('documents').remove([uploadedFilePath]);
                }
                throw new Error(`Error al guardar información del documento: ${dbError.message}`);
            }

            setSuccessMessage('¡Documento subido exitosamente!');
            if (selectedPolicyId) {
                await fetchDocumentsForPolicy(selectedPolicyId);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al subir el documento.');
            console.error('Error during document upload:', err);
            setSuccessMessage(null);
        } finally {
            setUploadingDocument(false);
        }
    };

    const confirmDelete = (docId: string, filePath: string, docName: string) => {
        setDocToDelete({ id: docId, filePath: filePath, name: docName });
        setShowDeleteModal(true);
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;

        setUploadingDocument(true);
        setError(null);
        setSuccessMessage(null);
        setShowDeleteModal(false);

        try {
            const { error: dbDeleteError } = await supabase
                .from('policy_documents')
                .delete()
                .eq('id', docToDelete.id);

            if (dbDeleteError) {
                throw new Error(`Error al eliminar el registro del documento de la base de datos: ${dbDeleteError.message}`);
            }

            const { error: storageDeleteError } = await supabase.storage
                .from('documents')
                .remove([docToDelete.filePath]);

            if (storageDeleteError) {
                console.error(`Error al eliminar el archivo de Storage: ${storageDeleteError.message}`);
            }

            setSuccessMessage(`Documento "${docToDelete.name}" eliminado exitosamente.`);
            setDocToDelete(null);
            if (selectedPolicyId) {
                await fetchDocumentsForPolicy(selectedPolicyId);
            }
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'Error desconocido al eliminar el documento.');
            console.error('Error durante la eliminación del documento:', err);
        } finally {
            setUploadingDocument(false);
        }
    };

    if (loadingPolicies) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-blue-700">Cargando pólizas...</p>
            </div>
        );
    }

    if (!policies || policies.length === 0) {
        return (
            <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100 text-center">
                <h2 className="text-2xl font-bold text-blue-800 mb-4">Mis Documentos</h2>
                <p className="text-gray-600 mb-4">
                    No tienes pólizas activas. Para subir documentos, primero debes tener una póliza.
                </p>
                {error && <div className="text-red-600 mt-4">{error}</div>}
                {successMessage && <div className="text-green-600 mt-4">{successMessage}</div>}
            </div>
        );
    }

    const getProductName = (policy: Policy) => {
        if (policy.insurance_products) {
            if (Array.isArray(policy.insurance_products) && policy.insurance_products.length > 0) {
                return policy.insurance_products[0]?.name;
            } else {
                return (policy.insurance_products as { name?: string })?.name;
            }
        }
        return undefined;
    };

    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">Mis Documentos por Póliza</h2>

            <div className="mb-6">
                <label htmlFor="policy-select" className="block text-gray-700 text-lg font-medium mb-2">
                    Selecciona una Póliza:
                </label>
                <div className="relative">
                    <select
                        id="policy-select"
                        className="block appearance-none w-full bg-gray-100 border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 transition duration-300 ease-in-out"
                        value={selectedPolicyId || ''}
                        onChange={(e) => setSelectedPolicyId(e.target.value)}
                    >
                        {policies.map((policy) => (
                            <option key={policy.id} value={policy.id}>
                                {policy.policy_number} - {getProductName(policy) || 'Nombre de producto no disponible'}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">Documentos de la Póliza Seleccionada</h3>
                {loadingDocuments ? (
                    <div className="text-center text-gray-600">Cargando documentos...</div>
                ) : documents.length === 0 ? (
                    <div className="text-gray-600 italic">No hay documentos subidos para esta póliza aún.</div>
                ) : (
                    <ul className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {documents.map((doc) => {
                            const isProtectedDocument = doc.document_type === 'signature' || doc.document_type === 'contract_snapshot';
                            return (
                                <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200">
                                    <span className="text-gray-800 break-words flex-grow mr-4">
                                        {doc.document_name}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out"
                                        >
                                            Ver
                                        </a>
                                        {!isProtectedDocument && (
                                            <button
                                                onClick={() => confirmDelete(doc.id, doc.file_path, doc.document_name)}
                                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={uploadingDocument}
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">Subir Nuevo Documento</h3>
                <p className="text-gray-600 mb-4">
                    Por favor, seleccione el documento que desea subir para la póliza seleccionada.
                </p>
                <FileUpload
                    id="document-upload"
                    name="document-upload"
                    label={`Seleccionar Documento (Formatos: ${acceptedFileTypesDisplay})`}
                    onChange={handleDocumentUpload}
                    accept={acceptedFileTypes}
                    disabled={!selectedPolicyId || uploadingDocument}
                />
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                        <strong className="font-bold">¡Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
                        <strong className="font-bold">¡Éxito!</strong>
                        <span className="block sm:inline ml-2">{successMessage}</span>
                    </div>
                )}
                {uploadingDocument && (
                    <div className="flex items-center justify-center text-gray-600 mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                        Cargando documento...
                    </div>
                )}
            </div>

            {showDeleteModal && docToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que deseas eliminar el documento "<span className="font-semibold">{docToDelete.name}</span>"? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                disabled={uploadingDocument}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteDocument}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                disabled={uploadingDocument}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDocumentUpload;