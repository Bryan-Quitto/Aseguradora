import { useState, useEffect, useMemo } from 'react';
import { Breadcrumb, Button, Spinner, Label, Datepicker } from 'flowbite-react';
import { IconHome } from '@tabler/icons-react';
import html2pdf from 'html2pdf.js';
import { getAllPolicies, getAllAgentProfiles, AgentProfile, Policy } from '../../../policies/policy_management';
import AgentProductionReportTemplate from '../../components/AgentProductionReportTemplate';
import PageContainer from '../../../../components/container/PageContainer';

interface AgentProductionData {
  agentId: string;
  agentName: string | null;
  agentEmail: string | null;
  policyCount: number;
  totalPremium: number;
  averagePremium: number;
  policies: Policy[];
}

const AdminAgentProductionReport = () => {
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allPolicies, setAllPolicies] = useState<Policy[]>([]);
    const [allAgents, setAllAgents] = useState<AgentProfile[]>([]);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [startDate, setStartDate] = useState<Date>(thirtyDaysAgo);
    const [endDate, setEndDate] = useState<Date>(new Date());
    
    const reportId = "agent-production-report-to-print";
    const reportTitle = "Reporte de Producción por Agente";

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [policiesRes, agentsRes] = await Promise.all([
                    getAllPolicies(),
                    getAllAgentProfiles()
                ]);

                if (policiesRes.error) throw new Error(`Error al obtener pólizas: ${policiesRes.error.message}`);
                if (agentsRes.error) throw new Error(`Error al obtener agentes: ${agentsRes.error.message}`);
                
                setAllPolicies(policiesRes.data || []);
                setAllAgents(agentsRes.data || []);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    const agentProductionData = useMemo((): AgentProductionData[] => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredPolicies = allPolicies.filter(p => {
            const policyDate = new Date(p.created_at);
            return p.agent_id && policyDate >= start && policyDate <= end;
        });

        const productionMap = new Map<string, { totalPremium: number, policies: Policy[] }>();

        for (const policy of filteredPolicies) {
            if (policy.agent_id) {
                const agentData = productionMap.get(policy.agent_id) || { totalPremium: 0, policies: [] };
                agentData.totalPremium += policy.premium_amount;
                agentData.policies.push(policy);
                productionMap.set(policy.agent_id, agentData);
            }
        }
        
        return allAgents.map(agent => {
            const data = productionMap.get(agent.user_id);
            const policyCount = data?.policies.length || 0;
            const totalPremium = data?.totalPremium || 0;
            return {
                agentId: agent.user_id,
                agentName: agent.full_name,
                agentEmail: agent.email,
                policyCount,
                totalPremium,
                averagePremium: policyCount > 0 ? totalPremium / policyCount : 0,
                policies: data?.policies || []
            };
        }).sort((a, b) => b.totalPremium - a.totalPremium);

    }, [allPolicies, allAgents, startDate, endDate]);


    const handleDownloadPDF = async () => {
        const element = document.getElementById(reportId);
        if (!element) return;

        setIsDownloading(true);
        setError(null);
        const options = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `reporte_produccion_agentes_${new Date().toISOString().split('T')[0]}.pdf`,
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
        <PageContainer title={reportTitle} description="Página para ver la producción de los agentes.">
            <Breadcrumb className="mb-6">
                <Breadcrumb.Item href="/admin/dashboard" icon={IconHome}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item>Reportes</Breadcrumb.Item>
                <Breadcrumb.Item>{reportTitle}</Breadcrumb.Item>
            </Breadcrumb>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold">{reportTitle}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <Label htmlFor="start-date" value="Fecha Inicio" />
                        <Datepicker id="start-date" value={startDate} maxDate={endDate} onChange={(date: Date | null) => { if (date) setStartDate(date); }} language="es-ES" />
                    </div>
                     <div>
                        <Label htmlFor="end-date" value="Fecha Fin" />
                        <Datepicker id="end-date" value={endDate} minDate={startDate} maxDate={new Date()} onChange={(date: Date | null) => { if (date) setEndDate(date); }} language="es-ES" />
                    </div>
                    <Button onClick={handleDownloadPDF} disabled={isDownloading || loading || !!error} className="self-end">
                        {isDownloading ? <Spinner size="sm" /> : 'Descargar PDF'}
                    </Button>
                </div>
            </div>
            
            {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">{error}</div>}

            <div className="border rounded-lg p-4 shadow-sm bg-gray-50 max-h-[70vh] overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner size="xl" /></div>
                ) : (
                    <AgentProductionReportTemplate
                        id={reportId}
                        reportTitle={reportTitle}
                        productionData={agentProductionData}
                        generatedAt={new Date()}
                        startDate={startDate}
                        endDate={endDate}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default AdminAgentProductionReport;