import { useState, useEffect } from 'react';
import { Breadcrumb, Button, Spinner } from 'flowbite-react';
import { IconHome } from '@tabler/icons-react';
import html2pdf from 'html2pdf.js';
import { getAllPolicies, getAllClientProfiles, getAllAgentProfiles, ClientProfile, AgentProfile, Policy } from '../../../policies/policy_management';
import PoliciesReportTemplate, { EnrichedPolicy } from '../../components/PoliciesReportTemplate';
import PageContainer from '../../../../components/container/PageContainer';

const AdminPoliciesReport = () => {
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [policies, setPolicies] = useState<EnrichedPolicy[]>([]);
    
    const reportId = "policies-report-to-print";
    const reportTitle = "Reporte General de Pólizas";

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [policiesRes, clientsRes, agentsRes] = await Promise.all([
                    getAllPolicies(),
                    getAllClientProfiles(),
                    getAllAgentProfiles()
                ]);

                if (policiesRes.error) throw new Error(`Error al obtener pólizas: ${policiesRes.error.message}`);
                if (clientsRes.error) throw new Error(`Error al obtener clientes: ${clientsRes.error.message}`);
                if (agentsRes.error) throw new Error(`Error al obtener agentes: ${agentsRes.error.message}`);

                const clientsMap = new Map(clientsRes.data?.map((c: ClientProfile) => [c.user_id, c]));
                const agentsMap = new Map(agentsRes.data?.map((a: AgentProfile) => [a.user_id, a]));

                const enrichedPolicies: EnrichedPolicy[] = (policiesRes.data || []).map((policy: Policy) => ({
                    ...policy,
                    clientProfile: clientsMap.get(policy.client_id),
                    agentProfile: policy.agent_id ? agentsMap.get(policy.agent_id) : null
                }));

                setPolicies(enrichedPolicies);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    const handleDownloadPDF = async () => {
        const element = document.getElementById(reportId);
        if (!element) {
            setError("No se pudo encontrar el elemento del reporte para generar el PDF.");
            return;
        }

        setIsDownloading(true);
        setError(null);

        const options = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `reporte_general_polizas_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        try {
            await html2pdf().from(element).set(options).save();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al generar el PDF.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <PageContainer title={reportTitle} description="Página de reporte de pólizas generales">
            <Breadcrumb className="mb-6">
                <Breadcrumb.Item href="/admin/dashboard" icon={IconHome}>
                    Inicio
                </Breadcrumb.Item>
                <Breadcrumb.Item>Reportes</Breadcrumb.Item>
                <Breadcrumb.Item>{reportTitle}</Breadcrumb.Item>
            </Breadcrumb>
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">{reportTitle}</h1>
                <Button onClick={handleDownloadPDF} disabled={isDownloading || loading || !!error}>
                    {isDownloading ? (
                        <>
                            <Spinner size="sm" />
                            <span className="pl-3">Generando PDF...</span>
                        </>
                    ) : (
                        'Descargar PDF'
                    )}
                </Button>
            </div>
            
            {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">{error}</div>}

            <div className="border rounded-lg p-4 shadow-sm bg-gray-50 max-h-[70vh] overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="xl" />
                        <span className="ml-4 text-gray-600">Cargando datos del reporte...</span>
                    </div>
                ) : (
                    <PoliciesReportTemplate
                        id={reportId}
                        reportTitle={reportTitle}
                        policies={policies}
                        generatedAt={new Date()}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default AdminPoliciesReport;