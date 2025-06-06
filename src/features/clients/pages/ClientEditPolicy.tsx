import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Policy, getPolicyById, updatePolicy, InsuranceProduct, getInsuranceProductById } from '../../policies/policy_management';

export default function ClientEditPolicy() {
  const { policyId } = useParams<{ policyId: string }>(); // Obtiene el ID de la póliza de la URL
  const navigate = useNavigate();

  // --- DEBUGGING: Log policyId from URL params ---
  console.log('ClientEditPolicy: policyId from useParams:', policyId);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRejected, setIsRejected] = useState<boolean>(false);

  const [premiumAmount, setPremiumAmount] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    // --- DEBUGGING: Log useEffect trigger ---
    console.log('ClientEditPolicy: useEffect triggered with policyId:', policyId);

    const fetchPolicyDetails = async () => {
      if (!policyId) {
        // --- DEBUGGING: Log when policyId is NOT provided ---
        console.warn('ClientEditPolicy: policyId is undefined or null.');
        setError('ID de póliza no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: policyData, error: policyError } = await getPolicyById(policyId);

      // --- DEBUGGING: Log policy fetch result ---
      if (policyError) {
        console.error('ClientEditPolicy: Error al obtener póliza:', policyError);
        setError('Error al cargar la póliza. Por favor, inténtalo de nuevo.');
      } else if (policyData) {
        console.log('ClientEditPolicy: Póliza cargada exitosamente:', policyData);
        setPolicy(policyData);
        setPremiumAmount(policyData.premium_amount);
        setIsRejected(policyData.status === 'rejected');

        setStartDate(policyData.start_date ? new Date(policyData.start_date).toISOString().split('T')[0] : '');
        setEndDate(policyData.end_date ? new Date(policyData.end_date).toISOString().split('T')[0] : '');

        const { data: productData, error: productError } = await getInsuranceProductById(policyData.product_id);
        if (productError) {
          console.error(`ClientEditPolicy: Error al obtener producto ${policyData.product_id}:`, productError);
          setProductName('Producto Desconocido');
        } else if (productData) {
          console.log('ClientEditPolicy: Producto cargado exitosamente:', productData.name);
          setProductName(productData.name);
        }
      }
      setLoading(false);
    };

    fetchPolicyDetails();
  }, [policyId]); // Dependencia del policyId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy || isRejected) return;

    setIsSubmitting(true);
    setError(null);

    const updatedPolicyData = {
        premium_amount: premiumAmount,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      };

    // --- DEBUGGING: Log data being sent for update ---
    console.log('ClientEditPolicy: Attempting to update policy with ID:', policy.id, 'and data:', updatedPolicyData);

    const { error: updateError } = await updatePolicy(policy.id, updatedPolicyData);

    if (updateError) {
      console.error('ClientEditPolicy: Error al actualizar póliza:', updateError);
      setError('Error al actualizar la póliza. Por favor, inténtalo de nuevo.');
    } else {
      console.log('ClientEditPolicy: Póliza actualizada exitosamente!');
      alert('Póliza actualizada exitosamente!');
      navigate(`/client/dashboard/policies/${policy.id}`);
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

      {isRejected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">¡Atención!</strong>
          <span className="block sm:inline ml-2">Su póliza ha sido rechazada, contacte con el agente, o cree un nuevo contrato.</span>
        </div>
      )}

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
            disabled={isRejected}
          />
        </div>


        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
          <input
            type="date"
            id="startDate"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isRejected}
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
            disabled={isRejected}
          />
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
            disabled={isSubmitting || isRejected}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}