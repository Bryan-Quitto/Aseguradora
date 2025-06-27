import { Policy } from '../../policies/policy_management';
import logo from '../../../assets/images/logos/logo-wrappixel.png';

interface AgentProductionData {
  agentId: string;
  agentName: string | null;
  agentEmail: string | null;
  policyCount: number;
  totalPremium: number;
  averagePremium: number;
  policies: Policy[];
}

interface AgentProductionReportTemplateProps {
  id: string;
  reportTitle: string;
  productionData: AgentProductionData[];
  generatedAt: Date;
  startDate: Date | null;
  endDate: Date | null;
}

const AgentProductionReportTemplate = ({ id, reportTitle, productionData, generatedAt, startDate, endDate }: AgentProductionReportTemplateProps) => {

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || typeof amount === 'undefined') return '$0.00';
    return `$${Number(amount).toFixed(2)}`;
  };

  const overallTotalPolicies = productionData.reduce((sum, agent) => sum + agent.policyCount, 0);
  const overallTotalPremium = productionData.reduce((sum, agent) => sum + agent.totalPremium, 0);

  return (
    <div id={id} className="p-8 bg-white text-gray-900 font-sans text-sm">
      <header className="flex justify-between items-center pb-4 mb-6 border-b-2 border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Savalta Seguros</h1>
          <p className="text-gray-600 mt-1">Reporte de Desempeño Comercial</p>
        </div>
        <img src={logo} alt="Logo Savalta Seguros" className="h-16" />
      </header>

      <main>
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">{reportTitle}</h2>
        <p className="text-center text-sm text-gray-600">
            Período del reporte: {formatDate(startDate)} - {formatDate(endDate)}
        </p>
        <p className="text-center text-xs text-gray-500 mb-8">Generado el: {generatedAt.toLocaleString('es-EC')}</p>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg"><strong className="block text-xs">Total Pólizas Generadas</strong><span className="text-3xl font-bold">{overallTotalPolicies}</span></div>
          <div className="p-4 bg-green-50 rounded-lg"><strong className="block text-xs">Primas Totales Generadas</strong><span className="text-3xl font-bold">{formatCurrency(overallTotalPremium)}</span></div>
        </section>

        <section>
            <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Resumen por Agente</h3>
            <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border p-2 text-left">Agente</th>
                        <th className="border p-2 text-center">Pólizas Vendidas</th>
                        <th className="border p-2 text-right">Primas Totales</th>
                        <th className="border p-2 text-right">Prima Promedio</th>
                    </tr>
                </thead>
                <tbody>
                    {productionData.filter(agent => agent.policyCount > 0).map((agent) => (
                        <tr key={agent.agentId}>
                            <td className="border p-2">
                                <p className="font-semibold">{agent.agentName}</p>
                                <p className="text-gray-600">{agent.agentEmail}</p>
                            </td>
                            <td className="border p-2 text-center font-bold text-xl">{agent.policyCount}</td>
                            <td className="border p-2 text-right font-semibold">{formatCurrency(agent.totalPremium)}</td>
                            <td className="border p-2 text-right">{formatCurrency(agent.averagePremium)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {productionData.filter(agent => agent.policyCount > 0).length === 0 && (
                <div className="text-center p-10 border border-t-0 border-gray-300">
                    <p className="text-gray-500">No se encontró producción de agentes en el período seleccionado.</p>
                </div>
            )}
        </section>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Este documento es para la evaluación del rendimiento del equipo de ventas.</p>
        <p className="mt-2 font-bold">Savalta Seguros S.A. © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default AgentProductionReportTemplate;