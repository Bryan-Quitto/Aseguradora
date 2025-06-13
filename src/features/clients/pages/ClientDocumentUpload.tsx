import React, { useState, useEffect } from 'react';
import { supabase } from 'src/supabase/client'; // Importa el cliente de Supabase real
import FileUpload from 'src/components/shared/FileUpload'; // Importa el componente FileUpload real

// Importa los tipos y funciones necesarios desde tu archivo de gestión de pólizas
import {
    Policy, // Importa la interfaz Policy de policy_management.ts
    getPoliciesByClientId, // Importa la función para obtener pólizas por ID de cliente
    // getInsuranceProductById, // ¡NO ES NECESARIA SI EL JOIN YA TRAE EL NOMBRE!
} from '../../policies/policy_management'; // Ajusta esta ruta según la ubicación real de tu archivo

// Define tipos para los documentos que se manejarán localmente.
// Si esta interfaz también se centralizará, impórtala desde su ubicación.
interface Document {
    id: string;
    policy_id: string;
    document_name: string;
    file_path: string;
    uploaded_at: string;
    file_url?: string; // URL pública para descarga
    uploaded_by: string; // Asegúrate de que esta columna exista en tu tabla policy_documents
}

const ClientDocumentUpload: React.FC = () => {
    // Variables de estado para la carga y el manejo de errores
    const [loadingPolicies, setLoadingPolicies] = useState(true);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estado para los datos
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);// Usamos la interfaz Document actualizada
    const [userId, setUserId] = useState<string | null>(null);
    // Ya no necesitamos productNames como un Map separado si el join funciona.
    // Los nombres de productos estarán anidados directamente en cada póliza.

    // Efecto para obtener el ID del usuario actual y cargar las pólizas al montar el componente
    useEffect(() => {
        const fetchUserAndPolicies = async () => {
            setLoadingPolicies(true);
            setError(null);
            setSuccessMessage(null); // Limpia mensajes de éxito anteriores

            try {
                // Obtener la sesión autenticada actual
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    throw new Error(`Error al obtener sesión: ${sessionError.message}`);
                }

                if (session?.user) {
                    setUserId(session.user.id);
                    // ¡Usa la función importada de policy_management para obtener las pólizas!
                    // Esta función ahora debería traer los nombres de productos directamente
                    const { data: policiesData, error: policiesError } = await getPoliciesByClientId(session.user.id);

                    if (policiesError) {
                        throw new Error(`Error al cargar pólizas: ${policiesError.message}`);
                    }

                    if (policiesData && policiesData.length > 0) {
                        setPolicies(policiesData);
                        // Seleccionar automáticamente la primera póliza si está disponible
                        setSelectedPolicyId(policiesData[0].id);
                        // Ya no se necesita cargar productNames aquí, ya vienen con la póliza
                    } else {
                        setPolicies([]);
                        setSelectedPolicyId(null); // Asegúrate de que no haya una póliza seleccionada
                        setSuccessMessage("No tienes pólizas activas. Por favor, crea una para subir documentos.");
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
    }, []); // Se ejecuta una vez al montar el componente

    // Función auxiliar para recargar documentos de una póliza específica
    const fetchDocumentsForPolicy = async (policyId: string) => {
        setLoadingDocuments(true);
        setError(null); // Limpiar errores antes de una nueva carga
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
                const { data: urlData } = supabase.storage
                    .from('documents') // Asegúrate de que el bucket se llame 'documents' en Supabase Storage
                    .getPublicUrl(doc.file_path);
                return { ...doc, file_url: urlData?.publicUrl || '#' };
            }));
            setDocuments(documentsWithUrls as Document[]); // Aseguramos el tipo
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al recargar los documentos.');
            console.error('Error re-fetching documents:', err);
        } finally {
            setLoadingDocuments(false);
        }
    };

    // Efecto para cargar documentos cuando cambia selectedPolicyId
    useEffect(() => {
        if (selectedPolicyId) {
            fetchDocumentsForPolicy(selectedPolicyId);
        } else {
            setDocuments([]); // Limpiar documentos si no hay póliza seleccionada
        }
    }, [selectedPolicyId]); // Se vuelve a ejecutar cuando cambia selectedPolicyId

    // Manejador para cuando se selecciona un nuevo archivo para subir
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

        let uploadedFilePath: string | null = null; // Para guardar la ruta si la subida es exitosa

        try {
            // Generar un nombre de archivo único y una ruta que incluya policy_id para organización
            // Eliminar caracteres especiales que puedan causar problemas en la ruta del archivo
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Permite guiones bajos y guiones
            const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
            const filePath = `policies/${selectedPolicyId}/${uniqueFileName}`; // Ruta en Supabase Storage

            // Subir el archivo al bucket 'documents' de Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents') // Asegúrate de tener un bucket llamado 'documents' en Supabase Storage
                .upload(filePath, file, {
                    cacheControl: '3600', // Cache por 1 hora
                    upsert: false, // No sobrescribir si el archivo existe
                });

            if (uploadError) {
                throw new Error(`Error al subir archivo: ${uploadError.message}`);
            }
            if (!uploadData?.path) {
                throw new Error('La ruta del archivo subido es nula o indefinida.');
            }
            uploadedFilePath = uploadData.path; // Guarda la ruta para posible limpieza

            // Guardar los metadatos del documento en la tabla 'policy_documents'
            const { error: dbError } = await supabase
                .from('policy_documents')
                .insert({
                    policy_id: selectedPolicyId,
                    document_name: file.name, // Nombre original del archivo
                    file_path: uploadedFilePath, // Ruta devuelta por Supabase Storage
                    uploaded_by: userId, // <-- ¡Asegúrate de que esta columna exista en tu DB!
                    // document_type: 'some_type' // Podrías añadir una forma de seleccionar el tipo de documento
                });

            if (dbError) {
                // Si la inserción falla después de la subida, intenta eliminar el archivo de storage
                console.error('Error al insertar metadatos del documento en DB, intentando limpiar el archivo subido:', dbError);
                if (uploadedFilePath) {
                    const { error: removeError } = await supabase.storage.from('documents').remove([uploadedFilePath]);
                    if (removeError) {
                        console.error('Error al intentar eliminar el archivo subido de Storage:', removeError.message);
                    }
                }
                throw new Error(`Error al guardar información del documento: ${dbError.message}`);
            }

            setSuccessMessage('¡Documento subido exitosamente!');
            console.log('Document uploaded successfully:', uploadedFilePath);
            // Vuelve a cargar los documentos para actualizar la lista
            if (selectedPolicyId) {
                await fetchDocumentsForPolicy(selectedPolicyId);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al subir el documento.');
            console.error('Error during document upload:', err);
            setSuccessMessage(null); // Borra el mensaje de éxito en caso de error
        } finally {
            setUploadingDocument(false);
        }
    };

    // Renderizar estado de carga para pólizas
    if (loadingPolicies) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-blue-700">Cargando pólizas...</p>
            </div>
        );
    }

    // Renderizar mensaje si no se encuentran pólizas
    if (!policies || policies.length === 0) {
        return (
            <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100 text-center">
                <h2 className="text-2xl font-bold text-blue-800 mb-4">Mis Documentos</h2>
                <p className="text-gray-600 mb-4">
                    No tienes pólizas activas en tu cuenta. Para subir documentos, primero debes tener una póliza.
                </p>
                {error && <div className="text-red-600 mt-4">{error}</div>}
                {successMessage && <div className="text-green-600 mt-4">{successMessage}</div>}
            </div>
        );
    }

    // Renderizado principal del componente
    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">Mis Documentos por Póliza</h2>

            {/* Policy Selector */}
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
                                {policy.policy_number} - {policy.insurance_products?.[0]?.name || 'Nombre de producto no disponible'}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>

            {/* Document List for Selected Policy */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">Documentos de la Póliza Seleccionada</h3>
                {loadingDocuments ? (
                    <div className="text-center text-gray-600">Cargando documentos...</div>
                ) : documents.length === 0 ? (
                    <div className="text-gray-600 italic">No hay documentos subidos para esta póliza aún.</div>
                ) : (
                    <ul className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {documents.map((doc) => (
                            <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200">
                                <span className="text-gray-800 break-words flex-grow mr-4">{doc.document_name}</span>
                                <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 ease-in-out"
                                >
                                    Ver
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* File Upload Section */}
            <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">Subir Nuevo Documento</h3>
                <p className="text-gray-600 mb-4">
                    Por favor, seleccione el documento que desea subir para la póliza seleccionada.
                </p>

                <FileUpload
                    id="document-upload"
                    name="document-upload"
                    label="Seleccionar Documento"
                    onChange={handleDocumentUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.svg" // Sugerir tipos de archivo comunes
                    disabled={!selectedPolicyId || uploadingDocument} // Deshabilitar si no hay póliza seleccionada o si se está subiendo
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
        </div>
    );
};

export default ClientDocumentUpload;
