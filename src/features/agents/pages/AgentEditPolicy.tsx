import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Policy, getPolicyById, updatePolicy, UpdatePolicyData, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';

/**
 * Componente para que un agente edite los detalles de una póliza.
 */
export default function AgentEditPolicy() {
  const { policyId } = useParams<{ policyId: string }>(); // Obtiene el ID de la póliza de la URL
  console.log('AgentEditPolicy cargado. policyId de useParams (inicial):', policyId); // <--- LOG INICIAL
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estados para los campos editables por el agente
  const [premiumAmount, setPremiumAmount] = useState<number>(0);
  const [status, setStatus] = useState<Policy['status']>('pending'); // Agente sí puede editar el estado
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [contractDetails, setContractDetails] = useState<string>(''); // Nuevo campo: detalles del contrato

  useEffect(() => {
    console.log('useEffect ejecutado. policyId dentro de useEffect:', policyId); // <--- LOG DENTRO DE useEffect
    const fetchPolicyDetails = async () => {
      if (!policyId) {
        console.error('ERROR: ID de póliza no proporcionado en fetchPolicyDetails.'); // <--- LOG DE ERROR ESPECÍFICO
        setError('ID de póliza no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: policyData, error: policyError } = await getPolicyById(policyId);
      console.log('Resultado de getPolicyById para policyId:', policyId, '-> Data:', policyData, 'Error:', policyError); // <--- LOG DE RESULTADO DE API

      if (policyError) {
        console.error('Error al obtener póliza:', policyError);
        setError('Error al cargar la póliza. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      if (policyData) {
        setPolicy(policyData);
        setPremiumAmount(policyData.premium_amount);
        setStatus(policyData.status);
        setContractDetails(JSON.stringify(policyData.contract_details || {}, null, 2));

        setStartDate(policyData.start_date ? new Date(policyData.start_date).toISOString().split('T')[0] : '');
        setEndDate(policyData.end_date ? new Date(policyData.end_date).toISOString().split('T')[0] : '');

        const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
        if (productError) {
          console.error(`Error al obtener producto ${policyData.product_id}:`, productError);
          setProductName('Producto Desconocido');
        } else if (productData) {
          setProductName(productData.name);
        }
      }
      setLoading(false);
    };

    fetchPolicyDetails();
  }, [policyId]); // Asegúrate de que policyId esté en el array de dependencias

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) {
        console.warn('handleSubmit llamado sin policy cargada.'); // <--- LOG ADICIONAL
        return;
    }

    setIsSubmitting(true);
    setError(null);

    let parsedContractDetails: Record<string, any> | undefined;
    try {
      parsedContractDetails = JSON.parse(contractDetails);
    } catch (parseError) {
      console.error('Error al parsear contractDetails:', parseError); // <--- LOG DE ERROR DE PARSEO
      setError('Formato inválido para Detalles del Contrato. Debe ser JSON.');
      setIsSubmitting(false);
      return;
    }

    const updatedPolicyData: UpdatePolicyData = {
      premium_amount: premiumAmount,
      status: status,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
      contract_details: parsedContractDetails,
    };

    console.log('Datos a enviar para actualizar póliza:', policy.id, updatedPolicyData); // <--- LOG DE DATOS A ENVIAR

    const { error: updateError } = await updatePolicy(policy.id, updatedPolicyData);

    if (updateError) {
      console.error('Error al actualizar póliza:', updateError);
      setError('Error al actualizar la póliza. Por favor, inténtalo de nuevo.');
    } else {
      alert('Póliza actualizada exitosamente!');
      navigate(`/agent/dashboard/policies/${policy.id}`);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-blue-600 text-xl">Cargando detalles de la póliza...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-600 text-xl">Póliza no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl border border-blue-100 mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-6">Editar Póliza: {policy.policy_number}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Producto</label>
          <input
            type="text"
            id="productName"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-100"
            value={productName}
            disabled
          />
        </div>

        <div>
          <label htmlFor="premiumAmount" className="block text-sm font-medium text-gray-700">Monto Prima</label>
          <input
            type="number"
            id="premiumAmount"
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={premiumAmount}
            onChange={(e) => setPremiumAmount(parseFloat(e.target.value))}
            required
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
          <select
            id="status"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Policy['status'])}
            required
          >
            <option value="pending">Pendiente</option>
            <option value="active">Activa</option>
            <option value="cancelled">Cancelada</option>
            <option value="expired">Expirada</option>
            <option value="rejected">Rechazada</option>
          </select>
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
          <input
            type="date"
            id="startDate"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha de Fin</label>
          <input
            type="date"
            id="endDate"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="contractDetails" className="block text-sm font-medium text-gray-700">Detalles del Contrato (JSON)</label>
          <textarea
            id="contractDetails"
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
            value={contractDetails}
            onChange={(e) => setContractDetails(e.target.value)}
            placeholder='{"clausula1": "valor1", "clausula2": "valor2"}'
          ></textarea>
          <p className="mt-1 text-sm text-gray-500">
            Introduce los detalles adicionales del contrato en formato JSON válido.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}