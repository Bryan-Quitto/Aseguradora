import { Policy, ClientProfile, AgentProfile } from '../../policies/policy_management';
import logo from '../../../assets/images/logos/logo-wrappixel.png';

export interface EnrichedPolicy extends Policy {
  clientProfile?: ClientProfile | null;
  agentProfile?: AgentProfile | null;
}

interface ExpiringPoliciesReportTemplateProps {
  id: string;
  reportTitle: string;
  policies: EnrichedPolicy[];
  generatedAt: Date;
  daysThreshold: number;
}

const ExpiringPoliciesReportTemplate = ({ id, reportTitle, policies, generatedAt, daysThreshold }: ExpiringPoliciesReportTemplateProps) => {

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getDaysUntilExpiration = (endDateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const endDate = new Date(endDateString);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div id={id} className="p-8 bg-white text-gray-900 font-sans text-sm">
      <header className="flex justify-between items-center pb-4 mb-6 border-b-2 border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Savalta Seguros</h1>
          <p className="text-gray-600 mt-1">Reporte de Renovaciones</p>
        </div>
        <img src={logo} alt="Logo Savalta Seguros" className="h-16" />
      </header>

      <main>
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">{reportTitle}</h2>
        <p className="text-center text-sm text-gray-600">Pólizas que vencen en los próximos {daysThreshold} días.</p>
        <p className="text-center text-xs text-gray-500 mb-8">Generado el: {generatedAt.toLocaleString('es-EC')}</p>

        <section className="mb-8">
            <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-center">
                <p className="text-sm text-yellow-800 font-bold">Total de Pólizas a Vencer</p>
                <p className="text-3xl font-extrabold text-yellow-900">{policies.length}</p>
            </div>
        </section>

        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Nro. Póliza</th>
                  <th className="border p-2 text-left">Cliente</th>
                  <th className="border p-2 text-left">Agente</th>
                  <th className="border p-2 text-center">Fin Vigencia</th>
                  <th className="border p-2 text-center">Días para Vencer</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => {
                  const daysLeft = getDaysUntilExpiration(policy.end_date);
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="border p-2 font-mono">{policy.policy_number}</td>
                      <td className="border p-2">{policy.clientProfile?.full_name || 'N/A'}</td>
                      <td className="border p-2">{policy.agentProfile?.full_name || 'Sin agente'}</td>
                      <td className="border p-2 text-center font-semibold">{formatDate(policy.end_date)}</td>
                      <td className={`border p-2 text-center font-bold ${
                        daysLeft <= 7 ? 'text-red-600' : 
                        daysLeft <= 30 ? 'text-yellow-600' : 
                        'text-gray-700'
                      }`}>
                        {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {policies.length === 0 && (
            <div className="text-center p-10 border border-t-0 border-gray-300">
                <p className="text-gray-500">No se encontraron pólizas a vencer en el período seleccionado.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Este es un documento generado automáticamente para la gestión proactiva de renovaciones.</p>
        <p className="mt-2 font-bold">Savalta Seguros S.A. © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default ExpiringPoliciesReportTemplate;