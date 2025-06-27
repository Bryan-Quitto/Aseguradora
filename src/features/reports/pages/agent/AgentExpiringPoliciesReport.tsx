import { useState, useEffect, useMemo } from 'react';
import { Breadcrumb, Button, Spinner, Label, Select } from 'flowbite-react';
import { IconHome } from '@tabler/icons-react';
import html2pdf from 'html2pdf.js';
import { getPoliciesByAgentId, getAllClientProfiles, ClientProfile, Policy, getAgentProfileById, AgentProfile } from '../../../policies/policy_management';
import AgentExpiringPoliciesReportTemplate, { EnrichedAgentPolicy } from '../../components/AgentExpiringPoliciesReportTemplate';
import PageContainer from '../../../../components/container/PageContainer';
import { useAuth } from '../../../../contexts/useAuth';

const AgentExpiringPoliciesReport = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allPolicies, setAllPolicies] = useState<EnrichedAgentPolicy[]>([]);
    const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
    const [daysThreshold, setDaysThreshold] = useState(30);
    
    const reportId = "agent-expiring-policies-report-to-print";
    const reportTitle = "Reporte de Pólizas a Vencer";

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Usuario no autenticado.");
            return;
        }

        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [policiesRes, clientsRes, agentProfileRes] = await Promise.all([
                    getPoliciesByAgentId(user.id),
                    getAllClientProfiles(),
                    getAgentProfileById(user.id)
                ]);

                if (policiesRes.error) throw new Error(`Error al obtener pólizas: ${policiesRes.error.message}`);
                if (clientsRes.error) throw new Error(`Error al obtener clientes: ${clientsRes.error.message}`);
                if (agentProfileRes.error) throw new Error(`Error al obtener perfil del agente: ${agentProfileRes.error.message}`);

                setAgentProfile(agentProfileRes.data);
                const clientsMap = new Map(clientsRes.data?.map((c: ClientProfile) => [c.user_id, c]));
                const enrichedPolicies: EnrichedAgentPolicy[] = (policiesRes.data || []).map((policy: Policy) => ({
                    ...policy,
                    clientProfile: clientsMap.get(policy.client_id),
                }));

                setAllPolicies(enrichedPolicies);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [user]);

    const filteredPolicies = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() + daysThreshold);

        return allPolicies.filter(policy => {
            const endDate = new Date(policy.end_date);
            return (
                policy.status === 'active' &&
                endDate >= today &&
                endDate <= thresholdDate
            );
        }).sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

    }, [allPolicies, daysThreshold]);


    const handleDownloadPDF = async () => {
        const element = document.getElementById(reportId);
        if (!element) return;

        setIsDownloading(true);
        setError(null);

        const options = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `reporte_polizas_a_vencer_${daysThreshold}dias_${new Date().toISOString().split('T')[0]}.pdf`,
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
        <PageContainer title={reportTitle} description="Página de reporte de mis pólizas a punto de vencer.">
            <Breadcrumb className="mb-6">
                <Breadcrumb.Item href="/agent/dashboard" icon={IconHome}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item>Reportes</Breadcrumb.Item>
                <Breadcrumb.Item>{reportTitle}</Breadcrumb.Item>
            </Breadcrumb>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold">{reportTitle}</h1>
                <div className="flex items-center gap-4">
                    <div>
                        <Label htmlFor="days-threshold" value="Ver pólizas a vencer en los próximos:" />
                        <Select id="days-threshold" value={daysThreshold} onChange={(e) => setDaysThreshold(Number(e.target.value))} disabled={loading}>
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
                    <AgentExpiringPoliciesReportTemplate
                        id={reportId}
                        reportTitle={reportTitle}
                        policies={filteredPolicies}
                        generatedAt={new Date()}
                        daysThreshold={daysThreshold}
                        agentName={agentProfile?.full_name || null}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default AgentExpiringPoliciesReport;