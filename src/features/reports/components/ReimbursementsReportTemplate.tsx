import { ReimbursementRequest } from '../../reimbursements/reimbursement_management';
import logo from '../../../assets/images/logos/logo-wrappixel.png';

export type EnrichedReimbursement = ReimbursementRequest & {
  policies: { policy_number: string } | null;
  profiles: { full_name: string; numero_identificacion: string; } | null;
};

interface ReimbursementsReportTemplateProps {
  id: string;
  reportTitle: string;
  reimbursements: EnrichedReimbursement[];
  generatedAt: Date;
}

const ReimbursementsReportTemplate = ({ id, reportTitle, reimbursements, generatedAt }: ReimbursementsReportTemplateProps) => {

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || typeof amount === 'undefined') return 'N/A';
    return `$${Number(amount).toFixed(2)}`;
  };

  const capitalize = (s: string | null | undefined): string => {
    if (!s) return 'N/A';
    const cleanString = s.replace(/_/g, ' ');
    return cleanString.charAt(0).toUpperCase() + cleanString.slice(1);
  };

  const totalRequested = reimbursements.reduce((sum, r) => sum + (r.amount_requested || 0), 0);
  const totalApproved = reimbursements.reduce((sum, r) => sum + (r.amount_approved || 0), 0);
  const approvedCount = reimbursements.filter(r => r.status === 'approved').length;
  const rejectedCount = reimbursements.filter(r => r.status === 'rejected').length;
  const pendingCount = reimbursements.filter(r => ['pending', 'in_review', 'more_info_needed'].includes(r.status)).length;

  return (
    <div id={id} className="p-8 bg-white text-gray-900 font-sans text-sm">
      <header className="flex justify-between items-center pb-4 mb-6 border-b-2 border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Savalta Seguros</h1>
          <p className="text-gray-600 mt-1">Reporte Financiero y Operativo</p>
        </div>
        <img src={logo} alt="Logo Savalta Seguros" className="h-16" />
      </header>

      <main>
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">{reportTitle}</h2>
        <p className="text-center text-xs text-gray-500 mb-8">Generado el: {generatedAt.toLocaleString('es-EC')}</p>

        <section className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg"><strong className="block text-xs">Total Solicitado</strong><span className="text-xl font-bold">{formatCurrency(totalRequested)}</span></div>
          <div className="p-3 bg-green-50 rounded-lg"><strong className="block text-xs">Total Aprobado</strong><span className="text-xl font-bold">{formatCurrency(totalApproved)}</span></div>
          <div className="p-3 bg-green-50 rounded-lg"><strong className="block text-xs">Solicitudes Aprobadas</strong><span className="text-2xl font-bold">{approvedCount}</span></div>
          <div className="p-3 bg-red-50 rounded-lg"><strong className="block text-xs">Solicitudes Rechazadas</strong><span className="text-2xl font-bold">{rejectedCount}</span></div>
          <div className="p-3 bg-yellow-50 rounded-lg"><strong className="block text-xs">Solicitudes Pendientes</strong><span className="text-2xl font-bold">{pendingCount}</span></div>
        </section>

        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Cliente</th>
                  <th className="border p-2 text-left">Nro. Póliza</th>
                  <th className="border p-2 text-center">Fecha Solicitud</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-right">Monto Solicitado</th>
                  <th className="border p-2 text-right">Monto Aprobado</th>
                </tr>
              </thead>
              <tbody>
                {reimbursements.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="border p-2">{req.profiles?.full_name || 'N/A'}</td>
                    <td className="border p-2 font-mono">{req.policies?.policy_number || 'N/A'}</td>
                    <td className="border p-2 text-center">{formatDate(req.request_date)}</td>
                    <td className="border p-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-white text-[10px] ${
                            req.status === 'approved' ? 'bg-green-500' :
                            req.status === 'rejected' ? 'bg-red-500' :
                            req.status === 'in_review' ? 'bg-blue-500' :
                            req.status === 'more_info_needed' ? 'bg-orange-500' :
                            'bg-gray-500'
                        }`}>
                            {capitalize(req.status)}
                        </span>
                    </td>
                    <td className="border p-2 text-right font-semibold">{formatCurrency(req.amount_requested)}</td>
                    <td className="border p-2 text-right font-bold text-green-700">{formatCurrency(req.amount_approved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reimbursements.length === 0 && (
            <div className="text-center p-10 border border-t-0 border-gray-300">
                <p className="text-gray-500">No se encontraron solicitudes de reembolso para los filtros seleccionados.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Este documento es para uso interno y contiene información financiera sensible.</p>
        <p className="mt-2 font-bold">Savalta Seguros S.A. © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default ReimbursementsReportTemplate;