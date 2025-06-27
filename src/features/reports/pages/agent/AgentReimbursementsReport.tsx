import { useState, useEffect, useMemo } from 'react';
import { Breadcrumb, Button, Spinner, Label, Select } from 'flowbite-react';
import { IconHome } from '@tabler/icons-react';
import html2pdf from 'html2pdf.js';
import { getReimbursementRequestsByAgentId } from '../../../reimbursements/reimbursement_management';
import { getAgentProfileById, AgentProfile } from '../../../policies/policy_management';
import AgentReimbursementsReportTemplate, { EnrichedAgentReimbursement } from '../../components/AgentReimbursementsReportTemplate';
import PageContainer from '../../../../components/container/PageContainer';
import { useAuth } from '../../../../contexts/useAuth';

const AgentReimbursementsReport = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allReimbursements, setAllReimbursements] = useState<EnrichedAgentReimbursement[]>([]);
    const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    
    const reportId = "agent-reimbursements-report-to-print";
    const reportTitle = "Reporte de Reembolsos de Mis Clientes";

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Usuario no autenticado.");
            return;
        }

        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [reimbursementsRes, agentProfileRes] = await Promise.all([
                    getReimbursementRequestsByAgentId(user.id),
                    getAgentProfileById(user.id)
                ]);

                if (reimbursementsRes.error) throw new Error(`Error al obtener reembolsos: ${reimbursementsRes.error.message}`);
                if (agentProfileRes.error) throw new Error(`Error al obtener perfil del agente: ${agentProfileRes.error.message}`);
                
                setAllReimbursements(reimbursementsRes.data || []);
                setAgentProfile(agentProfileRes.data);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [user]);

    const filteredReimbursements = useMemo(() => {
        if (statusFilter === 'all') {
            return allReimbursements;
        }
        return allReimbursements.filter(req => req.status === statusFilter);
    }, [allReimbursements, statusFilter]);


    const handleDownloadPDF = async () => {
        const element = document.getElementById(reportId);
        if (!element) return;

        setIsDownloading(true);
        setError(null);

        const options = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `reporte_reembolsos_agente_${statusFilter}_${new Date().toISOString().split('T')[0]}.pdf`,
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
        <PageContainer title={reportTitle} description="Página de reporte de solicitudes de reembolso de mis clientes.">
            <Breadcrumb className="mb-6">
                <Breadcrumb.Item href="/agent/dashboard" icon={IconHome}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item>Reportes</Breadcrumb.Item>
                <Breadcrumb.Item>{reportTitle}</Breadcrumb.Item>
            </Breadcrumb>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold">{reportTitle}</h1>
                <div className="flex items-center gap-4">
                    <div>
                        <Label htmlFor="status-filter" value="Filtrar por estado:" />
                        <Select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={loading}>
                            <option value="all">Todos</option>
                            <option value="pending">Pendiente</option>
                            <option value="in_review">En Revisión</option>
                            <option value="approved">Aprobado</option>
                            <option value="rejected">Rechazado</option>
                            <option value="more_info_needed">Más Información Requerida</option>
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
                    <AgentReimbursementsReportTemplate
                        id={reportId}
                        reportTitle={reportTitle}
                        reimbursements={filteredReimbursements}
                        generatedAt={new Date()}
                        agentName={agentProfile?.full_name || null}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default AgentReimbursementsReport;