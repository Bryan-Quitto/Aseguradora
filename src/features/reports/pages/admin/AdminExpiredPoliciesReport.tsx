import { useState, useEffect, useMemo } from 'react';
import { Breadcrumb, Button, Spinner, Label, Select } from 'flowbite-react';
import { IconHome } from '@tabler/icons-react';
import html2pdf from 'html2pdf.js';
import { getAllPolicies, getAllClientProfiles, getAllAgentProfiles, ClientProfile, AgentProfile, Policy } from '../../../policies/policy_management';
import ExpiredPoliciesReportTemplate, { EnrichedPolicy } from '../../components/ExpiredPoliciesReportTemplate';
import PageContainer from '../../../../components/container/PageContainer';

const AdminExpiredPoliciesReport = () => {
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allPolicies, setAllPolicies] = useState<EnrichedPolicy[]>([]);
    const [daysSinceExpiration, setDaysSinceExpiration] = useState(30);
    
    const reportId = "expired-policies-report-to-print";
    const reportTitle = "Reporte de Pólizas Vencidas";

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

                setAllPolicies(enrichedPolicies);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    const filteredPolicies = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() - daysSinceExpiration);

        return allPolicies.filter(policy => {
            const endDate = new Date(policy.end_date);
            return (
                policy.status === 'expired' &&
                endDate <= today &&
                endDate >= thresholdDate
            );
        }).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

    }, [allPolicies, daysSinceExpiration]);


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
            filename: `reporte_polizas_vencidas_${daysSinceExpiration}dias_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
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
        <PageContainer title={reportTitle} description="Página de reporte de pólizas que ya han vencido.">
            <Breadcrumb className="mb-6">
                <Breadcrumb.Item href="/admin/dashboard" icon={IconHome}>
                    Inicio
                </Breadcrumb.Item>
                <Breadcrumb.Item>Reportes</Breadcrumb.Item>
                <Breadcrumb.Item>{reportTitle}</Breadcrumb.Item>
            </Breadcrumb>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold">{reportTitle}</h1>
                <div className="flex items-center gap-4">
                    <div>
                        <Label htmlFor="days-since" value="Ver pólizas vencidas en los últimos:" />
                        <Select id="days-since" value={daysSinceExpiration} onChange={(e) => setDaysSinceExpiration(Number(e.target.value))} disabled={loading}>
                            <option value={30}>30 días</option>
                            <option value={60}>60 días</option>
                            <option value={90}>90 días</option>
                        </Select>
                    </div>
                    <Button onClick={handleDownloadPDF} disabled={isDownloading || loading || !!error} className="self-end">
                        {isDownloading ? <Spinner size="sm" /> : 'Descargar PDF'}
                    </Button>
                </div>
            </div>
            
            {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">{error}</div>}

            <div className="border rounded-lg p-4 shadow-sm bg-gray-50 max-h-[70vh] overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="xl" />
                        <span className="ml-4 text-gray-600">Cargando datos del reporte...</span>
                    </div>
                ) : (
                    <ExpiredPoliciesReportTemplate
                        id={reportId}
                        reportTitle={reportTitle}
                        policies={filteredPolicies}
                        generatedAt={new Date()}
                        daysSinceExpiration={daysSinceExpiration}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default AdminExpiredPoliciesReport;