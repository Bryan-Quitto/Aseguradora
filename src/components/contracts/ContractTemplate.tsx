import { Policy } from 'src/features/policies/policy_management';
import logo from 'src/assets/images/logos/logo-wrappixel.png';

interface ContractTemplateProps {
  policy: Policy & { 
    profiles?: { full_name?: string | null; email?: string | null } | null;
    insurance_products?: { name: string; type?: 'life' | 'health' | 'other' } | null;
  };
}

const ContractTemplate = ({ policy }: ContractTemplateProps) => {
  const product = policy.insurance_products;
  const clientProfile = policy.profiles;

  const formatDate = (dateString: string) => {
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

  const buildFullName = (person: { first_name1: string; first_name2?: string | null; last_name1: string; last_name2?: string | null; }): string => {
    return [
      person.first_name1,
      person.first_name2,
      person.last_name1,
      person.last_name2,
    ].filter(Boolean).join(' ');
  };

  return (
    <div id="contract-to-print" className="p-10 bg-white text-gray-900 font-sans text-sm">
      <header className="flex justify-between items-start pb-4 mb-8 border-b-2 border-gray-800">
        <div>
          <h1 className="text-4xl font-extrabold text-blue-900">Savalta Seguros</h1>
          <p className="text-gray-600 mt-1">Tu Tranquilidad, Nuestra Prioridad</p>
        </div>
        <img src={logo} alt="Logo Savalta Seguros" className="h-16" />
      </header>

      <main>
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">CONTRATO DE PÓLIZA DE SEGURO</h2>
        <p className="text-center text-lg font-semibold text-gray-600 mb-10">Póliza Nro. {policy.policy_number}</p>

        <section className="mb-8 p-4 border rounded-md">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Partes Involucradas</h3>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <p><strong>Contratante:</strong></p>
              <p>{clientProfile?.full_name || 'Nombre no disponible'}</p>
              <p>{clientProfile?.email}</p>
            </div>
            <div>
              <p><strong>Compañía:</strong></p>
              <p>Savalta Seguros S.A.</p>
              <p>RUC: 1790000000001</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Detalles de la Póliza</h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
            <div><strong>Producto:</strong><br />{product?.name || 'N/A'}</div>
            <div><strong>Inicio de Vigencia:</strong><br />{formatDate(policy.start_date)}</div>
            <div><strong>Fin de Vigencia:</strong><br />{formatDate(policy.end_date)}</div>
            <div><strong>Prima:</strong><br />{formatCurrency(policy.premium_amount)}</div>
            <div><strong>Frecuencia de Pago:</strong><br />{capitalize(policy.payment_frequency)}</div>
            <div><strong>Estado:</strong><br />{capitalize(policy.status)}</div>
          </div>
        </section>

        {product?.type === 'life' && (
          <>
            <section className="mb-8">
              <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Cobertura Principal de Vida</h3>
              <div className="grid grid-cols-2 gap-4">
                  <p><strong>Monto de Cobertura por Fallecimiento:</strong> {formatCurrency(policy.coverage_amount)}</p>
                  <p><strong>Muerte Accidental (AD&D):</strong> {policy.ad_d_included ? `Sí, por ${formatCurrency(policy.ad_d_coverage)}` : 'No Incluido'}</p>
              </div>
            </section>
            {policy.beneficiaries && policy.beneficiaries.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Beneficiarios Designados</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Nombre Completo</th>
                      <th className="border p-2 text-left">Relación</th>
                      <th className="border p-2 text-left">Cédula</th>
                      <th className="border p-2 text-right">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policy.beneficiaries.map((b, index) => (
                      <tr key={b.id || index}>
                        <td className="border p-2">{buildFullName(b)}</td>
                        <td className="border p-2">{capitalize(b.custom_relation || b.relation)}</td>
                        <td className="border p-2">{b.id_card}</td>
                        <td className="border p-2 text-right">{b.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        {product?.type === 'health' && (
          <>
            <section className="mb-8">
              <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Coberturas Principales de Salud</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded"><strong className="block">Deducible Anual</strong>{formatCurrency(policy.deductible)}</div>
                  <div className="p-3 bg-blue-50 rounded"><strong className="block">Coaseguro</strong>{policy.coinsurance}%</div>
                  <div className="p-3 bg-blue-50 rounded"><strong className="block">Gasto Máximo Anual</strong>{formatCurrency(policy.max_annual)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <p><strong>Dental Básico:</strong> {policy.has_dental_basic ? 'Incluido' : 'No Incluido'}</p>
                  <p><strong>Dental Premium:</strong> {policy.has_dental_premium ? 'Incluido' : 'No Incluido'}</p>
                  <p><strong>Visión Básica:</strong> {policy.has_vision_basic ? 'Incluido' : 'No Incluido'}</p>
                  <p><strong>Visión Completa:</strong> {policy.has_vision_full ? 'Incluido' : 'No Incluido'}</p>
              </div>
            </section>
            {policy.dependents_details && policy.dependents_details.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800">Dependientes Incluidos</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Nombre Completo</th>
                      <th className="border p-2 text-left">Relación</th>
                      <th className="border p-2 text-left">Cédula</th>
                      <th className="border p-2 text-center">Edad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policy.dependents_details.map((d, index) => (
                      <tr key={d.id || index}>
                        <td className="border p-2">{buildFullName(d)}</td>
                        <td className="border p-2">{capitalize(d.custom_relation || d.relation)}</td>
                        <td className="border p-2">{d.id_card}</td>
                        <td className="border p-2 text-center">{d.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        <section className="mt-12 text-xs text-gray-600">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Términos y Condiciones</h3>
          <p className="mb-2">1. Este documento constituye un acuerdo legal vinculante entre el Contratante y la Compañía. Al firmar, el Contratante confirma haber leído, entendido y aceptado todos los términos, condiciones, coberturas y exclusiones detallados en las Condiciones Generales y Particulares de la Póliza.</p>
          <p className="mb-2">2. La veracidad de la información proporcionada por el Contratante es fundamental. Cualquier omisión o declaración falsa puede resultar en la anulación del contrato.</p>
          <p>3. Los reembolsos solo pueden ser solicitados en un plazo de hasta 60 días desde la fecha de la factura del servicio médico, sujeto a las condiciones de la póliza.</p>
        </section>
      </main>

      <footer className="mt-16 pt-4 border-t text-center text-xs text-gray-500">
        <p>Documento generado electrónicamente el {new Date().toLocaleString('es-EC')}.</p>
        <p>La firma adjunta a este contrato valida la aceptación de todos los términos aquí expuestos.</p>
        <p className="mt-2 font-bold">Savalta Seguros S.A. © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default ContractTemplate;