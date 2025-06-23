import { useState, useEffect } from 'react';
import { useAuth } from 'src/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import FileUpload from 'src/components/shared/FileUpload';
import { Icon } from '@iconify/react';
import {
    getActivePoliciesByClientId,
    getRequiredDocuments,
    createReimbursementRequest,
    PolicyInfo,
    RequiredDocument
} from 'src/features/reimbursements/reimbursement_management';

export default function ClientNewReimbursement() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [policies, setPolicies] = useState<PolicyInfo[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<PolicyInfo | null>(null);
    const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(new Map());
    const [amountRequested, setAmountRequested] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolicies = async () => {
            if (!user?.id) return;
            setLoading(true);
            const { data, error: fetchError } = await getActivePoliciesByClientId(user.id);
            if (fetchError) {
                setError('Error al cargar tus pólizas activas.');
            } else {
                setPolicies(data || []);
            }
            setLoading(false);
        };
        fetchPolicies();
    }, [user?.id]);

    useEffect(() => {
        const fetchRequiredDocs = async () => {
            if (!selectedPolicy) {
                setRequiredDocs([]);
                return;
            }
            const { data, error: fetchError } = await getRequiredDocuments(selectedPolicy.product_id);
            if (fetchError) {
                setError('Error al cargar los documentos requeridos para esta póliza.');
                setRequiredDocs([]);
            } else {
                setRequiredDocs(data || []);
            }
        };
        fetchRequiredDocs();
    }, [selectedPolicy]);

    const handleFileChange = (documentName: string, files: FileList | null) => {
        if (files && files.length > 0) {
            setUploadedFiles(prev => new Map(prev).set(documentName, files[0]));
        }
    };

    const handleFileRemove = (documentName: string) => {
        setUploadedFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(documentName);
            return newMap;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!user?.id || !selectedPolicy) {
            setError('Faltan datos del usuario o de la póliza.');
            return;
        }

        const amount = parseFloat(amountRequested);
        if (isNaN(amount) || amount <= 0) {
            setError('El monto del reembolso es obligatorio y debe ser un número mayor a cero.');
            return;
        }

        const requiredDocsNames = requiredDocs.filter(d => d.is_required).map(d => d.document_name);
        for (const docName of requiredDocsNames) {
            if (!uploadedFiles.has(docName)) {
                setError(`Falta subir el documento requerido: ${docName}`);
                return;
            }
        }

        setSubmitting(true);
        
        try {
            await createReimbursementRequest(
                {
                    client_id: user.id,
                    policy_id: selectedPolicy.id,
                    amount_requested: amount
                },
                uploadedFiles,
                user.id
            );
            navigate('/client/dashboard/reimbursements');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Cargando tus pólizas...</div>;
    }

    if (!selectedPolicy) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-blue-700 mb-4">Paso 1: Selecciona tu Póliza</h2>
                {policies.length === 0 ? (
                    <p className="text-gray-600">No tienes pólizas activas para solicitar un reembolso.</p>
                ) : (
                    <div className="space-y-3">
                        {policies.map(policy => (
                            <button
                                key={policy.id}
                                onClick={() => setSelectedPolicy(policy)}
                                className="w-full text-left p-4 bg-gray-50 hover:bg-blue-100 border border-gray-200 rounded-lg transition"
                            >
                                <p className="font-semibold text-blue-800">{policy.policy_number}</p>
                                <p className="text-sm text-gray-600">{policy.product_name}</p>
                            </button>
                        ))}
                    </div>
                )}
                 <div className="mt-6 text-center">
                    <Link to="/client/dashboard/reimbursements" className="text-sm text-gray-600 hover:underline">Volver a mis reembolsos</Link>
                </div>
            </div>
        );
    }
    
    const requiredDocsSatisfied = requiredDocs
        .filter(d => d.is_required)
        .every(d => uploadedFiles.has(d.document_name));

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Paso 2: Completa tu Solicitud</h2>
            <div className="mb-6 bg-gray-100 p-3 rounded-md text-sm">
                <p>Póliza: <strong className="text-blue-800">{selectedPolicy.policy_number}</strong> ({selectedPolicy.product_name})</p>
                <button onClick={() => { setSelectedPolicy(null); setUploadedFiles(new Map()); }} className="text-xs text-blue-600 hover:underline">Cambiar Póliza</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto del Reembolso <span className="text-red-500">*</span></label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                        <input type="number" id="amount" value={amountRequested} onChange={e => setAmountRequested(e.target.value)} required className="block w-full rounded-md border-gray-300 pl-7 pr-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="0.00" step="0.01" />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Documentos Requeridos</h3>
                    <div className="space-y-4">
                        {requiredDocs.map(doc => (
                            <div key={doc.id} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">
                                            {doc.document_name}
                                            {doc.is_required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        {doc.description && <p className="text-xs text-gray-500 mt-1">{doc.description}</p>}
                                    </div>
                                    {uploadedFiles.has(doc.document_name) && (
                                        <button type="button" onClick={() => handleFileRemove(doc.document_name)} className="text-red-500 hover:text-red-700 text-xs">
                                            Quitar
                                        </button>
                                    )}
                                </div>
                                
                                {uploadedFiles.has(doc.document_name) ? (
                                    <div className="mt-2 flex items-center p-2 bg-green-100 rounded-md text-sm">
                                        <Icon icon="solar:check-circle-bold" className="text-green-600 mr-2 h-5 w-5 flex-shrink-0" />
                                        <span className="truncate flex-grow">{uploadedFiles.get(doc.document_name)?.name}</span>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <FileUpload
                                            id={doc.id}
                                            name={doc.document_name}
                                            label={'Seleccionar Archivo'}
                                            onChange={(files) => handleFileChange(doc.document_name, files)}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            disabled={submitting}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">{error}</div>}

                <div className="flex justify-end pt-4 border-t">
                    <button type="submit" disabled={!requiredDocsSatisfied || submitting || !amountRequested || parseFloat(amountRequested) <= 0} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </div>
            </form>
        </div>
    );
}