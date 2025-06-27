import { Policy, ClientProfile, AgentProfile } from '../../policies/policy_management';
import logo from '../../../assets/images/logos/logo-wrappixel.png';

// Extendemos la póliza para incluir los perfiles ya resueltos
export interface EnrichedPolicy extends Policy {
  clientProfile?: ClientProfile | null;
  agentProfile?: AgentProfile | null;
}

interface PoliciesReportTemplateProps {
  id: string;
  reportTitle: string;
  policies: EnrichedPolicy[];
  generatedAt: Date;
}

const PoliciesReportTemplate = ({ id, reportTitle, policies, generatedAt }: PoliciesReportTemplateProps) => {

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const capitalize = (s: string | null | undefined): string => {
    if (!s) return 'N/A';
    const cleanString = s.replace(/_/g, ' ');
    return cleanString.charAt(0).toUpperCase() + cleanString.slice(1);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || typeof amount === 'undefined') return 'N/A';
    return `$${Number(amount).toFixed(2)}`;
  };

  // Resumen de estadísticas
  const totalPolicies = policies.length;
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const pendingPolicies = policies.filter(p => p.status === 'pending' || p.status === 'awaiting_signature').length;
  const totalPremiumSum = policies.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.premium_amount || 0), 0);

  return (
    <div id={id} className="p-8 bg-white text-gray-900 font-sans text-sm">
      <header className="flex justify-between items-center pb-4 mb-6 border-b-2 border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Savalta Seguros</h1>
          <p className="text-gray-600 mt-1">Reporte Interno</p>
        </div>
        <img src={logo} alt="Logo Savalta Seguros" className="h-16" />
      </header>

      <main>
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">{reportTitle}</h2>
        <p className="text-center text-gray-500 mb-8">Generado el: {generatedAt.toLocaleString('es-EC')}</p>

        <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-100 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-bold">Total Pólizas</p>
                <p className="text-2xl font-extrabold text-blue-800">{totalPolicies}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-bold">Pólizas Activas</p>
                <p className="text-2xl font-extrabold text-green-800">{activePolicies}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-bold">Pólizas Pendientes</p>
                <p className="text-2xl font-extrabold text-yellow-800">{pendingPolicies}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-bold">Suma de Primas (Activas)</p>
                <p className="text-2xl font-extrabold text-blue-900">{formatCurrency(totalPremiumSum)}</p>
            </div>
        </section>

        <section>
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Listado de Pólizas</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Nro. Póliza</th>
                  <th className="border p-2 text-left">Cliente</th>
                  <th className="border p-2 text-left">Producto</th>
                  <th className="border p-2 text-left">Agente</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-center">Inicio Vigencia</th>
                  <th className="border p-2 text-center">Fin Vigencia</th>
                  <th className="border p-2 text-right">Prima</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="border p-2 font-mono">{policy.policy_number}</td>
                    <td className="border p-2">{policy.clientProfile?.full_name || 'N/A'}</td>
                    <td className="border p-2">{policy.insurance_products?.name || 'N/A'}</td>
                    <td className="border p-2">{policy.agentProfile?.full_name || 'Sin agente'}</td>
                    <td className="border p-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-white text-[10px] ${
                            policy.status === 'active' ? 'bg-green-500' :
                            policy.status === 'pending' ? 'bg-yellow-500' :
                            policy.status === 'awaiting_signature' ? 'bg-blue-500' :
                            policy.status === 'expired' ? 'bg-red-500' :
                            'bg-gray-500'
                        }`}>
                            {capitalize(policy.status)}
                        </span>
                    </td>
                    <td className="border p-2 text-center">{formatDate(policy.start_date)}</td>
                    <td className="border p-2 text-center">{formatDate(policy.end_date)}</td>
                    <td className="border p-2 text-right font-semibold">{formatCurrency(policy.premium_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {policies.length === 0 && (
            <div className="text-center p-10 border border-t-0 border-gray-300">
                <p className="text-gray-500">No se encontraron pólizas para mostrar en este reporte.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Este es un documento generado automáticamente. La información es confidencial.</p>
        <p className="mt-2 font-bold">Savalta Seguros S.A. © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default PoliciesReportTemplate;