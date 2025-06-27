import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Policy, getPolicyById, InsuranceProduct, getInsuranceProductById, updatePolicy } from '../../policies/policy_management';
import { ClientProfile, getClientProfileById } from '../../clients/hooks/cliente_backend';
import { useAuth } from 'src/contexts/useAuth';
import { enviarLinkFirma } from 'src/utils/enviarLinkFirma';
import { supabase } from 'src/supabase/client';

interface PolicyDocument {
  id: string;
  policy_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string;
}

const detailLabels: { [key: string]: string } = {
  deductible: 'Deducible Anual',
  max_annual_out_of_pocket: 'Gasto Máximo Anual',
  coinsurance_percentage: 'Coaseguro',
  max_dependents: 'Máximo de Dependientes',
  max_age_for_inscription: 'Edad Máxima para Inscripción',
  wellness_rebate_percentage: 'Reembolso por Bienestar',
  includes_dental_basic: 'Incluye Dental Básico',
  includes_dental_premium: 'Incluye Dental Premium',
  includes_vision_basic: 'Incluye Visión Básica',
  includes_vision_full: 'Incluye Visión Completa',
};

const formatDetailValue = (key: string, value: any): string => {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (key.includes('_percentage')) return `${value}%`;
  if (['deductible', 'max_annual_out_of_pocket'].includes(key)) return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return String(value);
};

const rejectionReasonsConfig = [
    { id: 'invalid_document', label: 'Documento(s) Inválido(s)', requiresComment: true, placeholder: "Especifica qué documento(s) son inválidos." },
    { id: 'missing_document', label: 'Falta(n) Documento(s)', requiresComment: true, placeholder: "Especifica qué documento(s) faltan." },
    { id: 'inconsistent_data', label: 'Información Inconsistente', requiresComment: true, placeholder: "Detalla la inconsistencia." },
    { id: 'invalid_signature', label: 'Firma Inválida o Inconsistente', requiresComment: false },
    { id: 'not_eligible', label: 'No Cumple Requisitos', requiresComment: true, placeholder: "Especificar el requisito no cumplido." },
    { id: 'other_reason', label: 'Otra Razón', requiresComment: true, placeholder: "Detalla la razón del rechazo." }
];

export default function AgentApplicationDetail() {
  const { id: applicationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<Policy | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [product, setProduct] = useState<InsuranceProduct | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionData, setRejectionData] = useState<{ reasons: Record<string, boolean>; comments: Record<string, string> }>({ reasons: {}, comments: {} });
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplicationDetails = async () => {
      if (!applicationId) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      setActionMessage(null);
      const { data: policyData, error: policyError } = await getPolicyById(applicationId);
      if (policyError || !policyData) {
        setError('Solicitud no encontrada.'); setLoading(false); return;
      }
      setApplication(policyData);
      const { data: clientData } = await getClientProfileById(policyData.client_id);
      setClient(clientData);
      const { data: productData } = await getInsuranceProductById(policyData.product_id);
      setProduct(productData);
      await fetchDocumentsForPolicy(applicationId);
      setLoading(false);
    };
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchDocumentsForPolicy = async (policyId: string) => {
    setLoadingDocuments(true);
    try {
        const { data, error: docsError } = await supabase
            .from('policy_documents')
            .select('*')
            .eq('policy_id', policyId)
            .order('uploaded_at', { ascending: false });

        if (docsError) throw docsError;

        const documentsWithUrls = await Promise.all((data || []).map(async (doc: PolicyDocument) => {
            let fileUrl = '#';
            // Lógica condicional: decide el bucket basado en la ruta del archivo
            if (doc.file_path.startsWith('contracts/')) {
                // Si la ruta es de un contrato, busca en el bucket 'contracts'
                const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(doc.file_path);
                fileUrl = urlData?.publicUrl || '#';
            } else {
                // Para cualquier otra ruta (como las firmas), busca en el bucket 'documents'
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(doc.file_path);
                fileUrl = urlData?.publicUrl || '#';
            }
            return { ...doc, file_url: fileUrl };
        }));
        
        setDocuments(documentsWithUrls);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar documentos.');
    } finally {
        setLoadingDocuments(false);
    }
};

  const handleInitialApproval = async () => {
    if (!application || !client?.email) return;
    setLoading(true);
    try {
      const { data, error: updateError } = await updatePolicy(application.id, { status: 'awaiting_signature' });
      if (updateError) throw updateError;
      if (data) {
        setApplication(data);
        const { success, message } = await enviarLinkFirma(client.email, data.id);
        if (!success) setError(`Aprobada, pero falló envío de firma: ${message}`);
        else setActionMessage(`Solicitud aprobada. Se envió enlace de firma a ${client.email}.`);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al aprobar.');
    } finally { setLoading(false); }
  };

  const handleFinalActivation = async () => {
    if (!application) return;
    setLoading(true);
    try {
        const {data, error} = await updatePolicy(application.id, { status: 'active' });
        if (error) throw error;
        setApplication(data);
        setActionMessage(`Póliza ${application.policy_number} activada exitosamente.`);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al activar la póliza.');
    } finally {
        setLoading(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!application || !user?.id) { setRejectionError('Faltan datos.'); return; }
    const selectedReasons = Object.keys(rejectionData.reasons).filter(key => rejectionData.reasons[key]);
    if (selectedReasons.length === 0) { setRejectionError('Seleccione al menos una razón.'); return; }
    const commentsForDB: Record<string, string> = {};
    for (const reasonId of selectedReasons) {
        const reasonConfig = rejectionReasonsConfig.find(r => r.id === reasonId);
        if (reasonConfig?.requiresComment && !rejectionData.comments[reasonId]?.trim()) {
            setRejectionError(`Añada comentario para: "${reasonConfig.label}"`); return;
        }
        if (rejectionData.comments[reasonId]?.trim()) commentsForDB[reasonId] = rejectionData.comments[reasonId].trim();
    }
    setLoading(true);
    try {
        await supabase.from('policy_rejections').insert([{ policy_id: application.id, reasons: selectedReasons, comments: commentsForDB, rejected_by: user.id }]);
        const { data, error: updateError } = await updatePolicy(application.id, { status: 'rejected' });
        if (updateError) throw updateError;
        setApplication(data);
        setActionMessage(`Solicitud ${application.policy_number} rechazada.`);
        setIsRejectionModalOpen(false);
        setRejectionData({ reasons: {}, comments: {} });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al rechazar.');
    } finally { setLoading(false); }
  };
  
  const handleRejectionChange = (type: 'reason' | 'comment', id: string, value: string | boolean) => {
    setRejectionData(prev => type === 'reason' ? { ...prev, reasons: { ...prev.reasons, [id]: value as boolean } } : { ...prev, comments: { ...prev.comments, [id]: value as string } });
  };

  if (loading) return <div className="text-center p-8">Cargando...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!application) return <div className="text-center p-8">Solicitud no encontrada.</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-blue-700">Revisar Solicitud: {product?.name}</h2>
          <Link to="/agent/dashboard/applications" className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Volver a Solicitudes</Link>
        </div>

        {actionMessage && <div className="bg-green-100 border-green-400 text-green-700 px-4 py-3 rounded mb-4">{actionMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
            <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Información de la Solicitud</h3>
                <p><strong>Número:</strong> {application.policy_number}</p>
                <p><strong>Producto:</strong> {product?.name}</p>
                <p><strong>Tipo:</strong> {product?.type}</p>
                <p><strong>Fecha de Inicio:</strong> {application.start_date}</p>
                <p><strong>Fecha de Fin:</strong> {application.end_date}</p>
                <p><strong>Prima:</strong> ${application.premium_amount.toFixed(2)} {application.payment_frequency}</p>
                <p><strong>Estado:</strong>
                    <span className={`ml-2 px-2 text-xs font-semibold rounded-full ${application.status === 'awaiting_signature' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {application.status === 'awaiting_signature' ? 'Revisión de Firma' : 'Pendiente'}
                    </span>
                </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-green-800 mb-4">Información del Cliente</h3>
                {client ? (
                    <>
                        <p><strong>Nombre:</strong> {client.full_name}</p>
                        <p><strong>Email:</strong> {client.email}</p>
                        <p><strong>ID:</strong> {client.numero_identificacion}</p>
                        <p><strong>Nacimiento:</strong> {client.fecha_nacimiento}</p>
                        <p><strong>Nacionalidad:</strong> {client.nacionalidad}</p>
                        <p><strong>Sexo:</strong> {client.sexo}</p>
                        <p><strong>Estado Civil:</strong> {client.estado_civil}</p>
                    </>
                ) : <p>Cargando...</p>}
            </div>

            {product?.coverage_details && Object.keys(product.coverage_details).length > 0 && (
                <div className="md:col-span-2 bg-yellow-50 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-yellow-800 mb-4">Detalles de Cobertura del Producto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                        {Object.entries(product.coverage_details).map(([key, value]) => detailLabels[key] && (
                            <div key={key} className="flex justify-between text-sm py-1.5 border-b"><span className="font-medium">{detailLabels[key]}:</span><span className="font-semibold">{formatDetailValue(key, value)}</span></div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="md:col-span-2 bg-indigo-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-indigo-800 mb-4">Documentos Subidos</h3>
                {loadingDocuments ? <p>Cargando...</p> : documents.length === 0 ? <p>No hay documentos.</p> : (
                    <ul className="bg-white rounded-lg p-4 border">
                        {documents.map(doc => (
                            <li key={doc.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                <span>{doc.document_name}</span>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="bg-indigo-500 text-white font-bold py-1 px-3 rounded-full text-sm">Ver</a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {application.status === 'pending' && (
            <div className="mt-8 flex justify-end gap-4">
                <button onClick={() => setIsRejectionModalOpen(true)} disabled={loading} className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50">Rechazar</button>
                <button onClick={handleInitialApproval} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">{loading ? 'Aprobando...' : 'Aprobar y enviar a firmar'}</button>
            </div>
        )}

        {application.status === 'awaiting_signature' && (
             <div className="mt-8 flex justify-end gap-4">
                <button onClick={() => setIsRejectionModalOpen(true)} disabled={loading} className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50">Rechazar Firma</button>
                <button onClick={handleFinalActivation} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">{loading ? 'Activando...' : 'Activar Póliza'}</button>
            </div>
        )}
      </div>

      {isRejectionModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Especificar Motivos de Rechazo</h3>
            <p className="text-gray-600 mb-6">Selecciona las razones aplicables. Esta información será registrada.</p>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                {rejectionReasonsConfig.map(reason => (
                    <div key={reason.id}>
                        <label className="flex items-center"><input type="checkbox" className="h-5 w-5 rounded" checked={!!rejectionData.reasons[reason.id]} onChange={(e) => handleRejectionChange('reason', reason.id, e.target.checked)} /><span className="ml-3">{reason.label}</span></label>
                        {reason.requiresComment && rejectionData.reasons[reason.id] && (
                            <textarea className="mt-2 block w-full px-3 py-2 border rounded-md" rows={2} placeholder={reason.placeholder} value={rejectionData.comments[reason.id] || ''} onChange={(e) => handleRejectionChange('comment', reason.id, e.target.value)} />
                        )}
                    </div>
                ))}
            </div>
            {rejectionError && <p className="text-red-600 text-sm mt-4">{rejectionError}</p>}
            <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
              <button onClick={() => setIsRejectionModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancelar</button>
              <button onClick={handleConfirmRejection} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">{loading ? 'Confirmando...' : 'Confirmar Rechazo'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}