import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from 'src/supabase/client';
import BeneficiaryInputList from '../../policies/components/BeneficiaryInputList';
import { Beneficiary } from '../../policies/components/BeneficiaryInput';
import DependentInputList from '../../policies/components/DependentInputList';
import { Dependent } from '../../policies/components/DependentInput';
import {
    Policy,
    InsuranceProduct,
    updatePolicy,
    getPolicyById,
    getInsuranceProductById,
} from '../../policies/policy_management';
import { 
    ClientProfile,
    getClientProfileById
} from '../../clients/hooks/cliente_backend';
import { useAuth } from 'src/contexts/AuthContext';

const rejectionReasonsConfig = [
    { id: 'invalid_document', label: 'Documento(s) Inválido(s) o Ilegible(s)', requiresComment: true, placeholder: "Especifica qué documento(s) son inválidos..." },
    { id: 'missing_document', label: 'Falta(n) Documento(s) Requerido(s)', requiresComment: true, placeholder: "Especifica qué documento(s) faltan..." },
    { id: 'inconsistent_data', label: 'Información Inconsistente', requiresComment: true, placeholder: "Detalla la inconsistencia..." },
    { id: 'invalid_signature', label: 'Firma Inválida o Inconsistente', requiresComment: false, placeholder: "La firma no coincide con el documento de identidad." },
    { id: 'not_eligible', label: 'No Cumple con los Requisitos del Producto', requiresComment: true, placeholder: "Especificar el requisito no cumplido..." },
    { id: 'other_reason', label: 'Otra Razón', requiresComment: true, placeholder: "Detalla la razón específica..." }
];

const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export default function AgentEditPolicy() {
    const { policyId } = useParams<{ policyId: string }>(); 
    const navigate = useNavigate();
    const { user } = useAuth();

    const [policy, setPolicy] = useState<Policy | null>(null);
    const [product, setProduct] = useState<InsuranceProduct | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);

    const [status, setStatus] = useState<Policy['status']>('pending');
    const [contractDetails, setContractDetails] = useState<string>('');
    const [dateOfBirth, setDateOfBirth] = useState<string>('');
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [dependents, setDependents] = useState<Dependent[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
    const [rejectionError, setRejectionError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolicyData = async () => {
            if (!policyId) {
                setError('ID de póliza no proporcionado.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setMessage(null);

            try {
                const { data: policyData, error: policyError } = await getPolicyById(policyId);
                if (policyError) throw new Error('Error al cargar la póliza.');
                if (!policyData) throw new Error('Póliza no encontrada.');

                setPolicy(policyData);
                setStatus(policyData.status);
                setContractDetails(policyData.contract_details || '');
                setBeneficiaries(policyData.beneficiaries || []);
                setDependents(policyData.dependents_details || []);

                const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
                if (productError) throw new Error('Error al cargar el producto.');
                setProduct(productData);

                const { data: clientData, error: clientError } = await getClientProfileById(policyData.client_id);
                if (clientError) throw new Error('Error al cargar el cliente.');
                setClient(clientData);

                if (clientData?.fecha_nacimiento) {
                    setDateOfBirth(clientData.fecha_nacimiento);
                }

            } catch (err: any) {
                setError(`Error inesperado: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicyData();
    }, [policyId]);

    const handleStatusChange = (newStatus: Policy['status']) => {
        setStatus(newStatus);
        if (newStatus === 'rejected') {
            setIsRejectionModalOpen(true);
        }
    };
    
    const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
        setRejectionData(prev => {
            if (type === 'reason') {
                return { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } };
            }
            return { ...prev, comments: { ...prev.comments, [id]: value as string } };
        });
        setRejectionError(null);
    };

    const handleConfirmRejection = async () => {
        if (!policyId || !user?.id) {
            setRejectionError('Datos de sesión o póliza no disponibles.');
            return;
        }

        const selectedReasons = Object.keys(rejectionData.reasons).filter(key => rejectionData.reasons[key]);
        if (selectedReasons.length === 0) {
            setRejectionError('Debe seleccionar al menos una razón para el rechazo.');
            return;
        }

        const commentsForDB: Record<string, string> = {};
        for (const reasonId of selectedReasons) {
            const reasonConfig = rejectionReasonsConfig.find(r => r.id === reasonId);
            if (reasonConfig?.requiresComment && !rejectionData.comments[reasonId]?.trim()) {
                setRejectionError(`Por favor, añada un comentario para: "${reasonConfig.label}"`);
                return;
            }
            if (rejectionData.comments[reasonId]?.trim()) {
                commentsForDB[reasonId] = rejectionData.comments[reasonId].trim();
            }
        }
        
        setSaving(true);
        setRejectionError(null);

        try {
            await supabase.from('policy_rejections').insert([{
                policy_id: policyId,
                reasons: selectedReasons,
                comments: commentsForDB,
                rejected_by: user.id,
            }]);
            
            await updatePolicy(policyId, { status: 'rejected' });
            
            setMessage("Póliza rechazada y motivos registrados exitosamente.");
            setIsRejectionModalOpen(false);
            setRejectionData({ reasons: {}, comments: {} });
            setTimeout(() => navigate(`/agent/dashboard/policies/${policyId}`), 1500);

        } catch (err: any) {
            setError(`Error al procesar el rechazo: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (status === 'rejected') {
            setIsRejectionModalOpen(true);
            return;
        }

        setSaving(true);
        setMessage(null);
        setError(null);

        if (!policyId || !policy || !product) {
            setError("Error: Faltan datos de póliza o producto para guardar.");
            setSaving(false);
            return;
        }

        const calculatedAge = calculateAge(dateOfBirth);
        if (calculatedAge === null) {
            setError("La fecha de nacimiento ingresada no es válida.");
            setSaving(false);
            return;
        }

        const updatedPolicyData: Partial<Policy> = {
            status,
            contract_details: contractDetails,
            age_at_inscription: calculatedAge,
            beneficiaries: product.type === 'life' ? beneficiaries : null,
            num_beneficiaries: product.type === 'life' ? beneficiaries.length : null,
            dependents_details: product.type === 'health' ? dependents : null,
            num_dependents: product.type === 'health' ? dependents.length : null,
        };

        try {
            const { error: updateError } = await updatePolicy(policyId, updatedPolicyData);
            if (updateError) throw updateError;
            setMessage("Póliza actualizada exitosamente.");
            setTimeout(() => navigate(`/agent/dashboard/policies/${policyId}`), 1500);
        } catch (err: any) {
            setError(`Error al actualizar póliza: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8">Cargando...</div>;
    if (error && !policy) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!policy) return <div className="text-center p-8">Póliza no encontrada.</div>;

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-blue-700">Editar Póliza: {product?.name}</h2>
                    <Link to="/agent/dashboard/policies" className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Volver a Pólizas</Link>
                </div>

                {message && <div className="p-4 mb-4 rounded-lg text-white bg-green-500">{message}</div>}
                {error && <div className="p-4 mb-4 rounded-lg text-white bg-red-500">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                        <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-blue-800 mb-4">Información de la Póliza</h3>
                            <p><strong>Número de Póliza:</strong> {policy.policy_number}</p>
                            <p><strong>Producto:</strong> {product?.name}</p>
                            <p><strong>Tipo:</strong> {product?.type}</p>
                            <p><strong>Fecha de Inicio:</strong> {policy.start_date}</p>
                        </div>
                        <div className="bg-teal-50 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-teal-800 mb-4">Información del Cliente</h3>
                            {client ? (
                                <>
                                    <p><strong>Nombre:</strong> {client.full_name}</p>
                                    <p><strong>Email:</strong> {client.email}</p>
                                    <p><strong>Identificación:</strong> {client.numero_identificacion}</p>
                                    <p><strong>Nacionalidad:</strong> {client.nacionalidad}</p>
                                    <p><strong>Sexo:</strong> {client.sexo}</p>
                                </>
                            ) : <p>Cargando perfil...</p>}
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h3 className="text-xl font-semibold text-gray-800">Detalles Editables</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
                                <select
                                    id="status" value={status}
                                    onChange={(e) => handleStatusChange(e.target.value as Policy['status'])}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="pending">Pendiente</option>
                                    <option value="awaiting_signature">Esperando Firma</option>
                                    <option value="active">Activa</option>
                                    <option value="cancelled">Cancelada</option>
                                    <option value="expired">Expirada</option>
                                    <option value="rejected">Rechazada</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                                <input
                                    type="date" id="dateOfBirth" value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="contractDetails" className="block text-sm font-medium text-gray-700">Detalles del Contrato (Notas)</label>
                                <textarea
                                    id="contractDetails" value={contractDetails} onChange={(e) => setContractDetails(e.target.value)}
                                    rows={4} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    {product?.type === 'life' && (
                        <div className="pt-6 border-t">
                            <h4 className="text-xl font-semibold text-gray-800 mb-4">Beneficiarios</h4>
                            <BeneficiaryInputList beneficiaries={beneficiaries} onChange={setBeneficiaries} maxBeneficiaries={product.coverage_details?.max_beneficiaries ?? null} />
                        </div>
                    )}
                    {product?.type === 'health' && (
                        <div className="pt-6 border-t">
                            <h4 className="text-xl font-semibold text-gray-800 mb-4">Dependientes</h4>
                            <DependentInputList dependents={dependents} onChange={setDependents} maxDependents={product.coverage_details?.max_dependents ?? null} />
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-6 border-t">
                        <button type="button" onClick={() => navigate(`/agent/dashboard/policies/${policyId}`)} className="px-6 py-3 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-6 py-3 border rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>

            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Especificar Motivos de Rechazo</h3>
                        <p className="text-gray-600 mb-6">Selecciona las razones aplicables. Esta información será registrada y visible para el cliente.</p>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                            {rejectionReasonsConfig.map(reason => (
                                <div key={reason.id}>
                                    <label className="flex items-center"><input type="checkbox" className="h-5 w-5 rounded text-red-600 focus:ring-red-500" checked={!!rejectionData.reasons[reason.id]} onChange={(e) => handleRejectionChange('reason', reason.id, e.target.checked)} /><span className="ml-3">{reason.label}</span></label>
                                    {reason.requiresComment && rejectionData.reasons[reason.id] && (
                                        <textarea className="mt-2 block w-full px-3 py-2 border rounded-md shadow-sm" rows={2} placeholder={reason.placeholder} value={rejectionData.comments[reason.id] || ''} onChange={(e) => handleRejectionChange('comment', reason.id, e.target.value)} />
                                    )}
                                </div>
                            ))}
                        </div>
                        {rejectionError && <p className="text-red-600 text-sm mt-4">{rejectionError}</p>}
                        <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                            <button onClick={() => { setIsRejectionModalOpen(false); setStatus(policy.status); }} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancelar</button>
                            <button onClick={handleConfirmRejection} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">{saving ? 'Confirmando...' : 'Confirmar Rechazo'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}