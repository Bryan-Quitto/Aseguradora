import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Policy, getPolicyById, updatePolicy, UpdatePolicyData } from '../policies/policy_management'; // Importa UpdatePolicyData

export default function AdminEditPolicy() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState<UpdatePolicyData>({}); // Estado para los datos del formulario
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No se proporcionó un ID de póliza para editar.");
      setLoading(false);
      return;
    }

    const fetchPolicy = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await getPolicyById(id);
        if (fetchError) {
          setError(`Error al cargar la póliza: ${fetchError.message}`);
        } else if (data) {
          setPolicy(data);
          // Inicializa formData con los valores actuales de la póliza
          // spread operator para copiar todas las propiedades de 'data'
          setFormData({
            policy_number: data.policy_number,
            client_id: data.client_id,
            agent_id: data.agent_id,
            product_id: data.product_id,
            start_date: data.start_date,
            end_date: data.end_date,
            status: data.status,
            premium_amount: data.premium_amount,
            payment_frequency: data.payment_frequency,
            coverage_amount: data.coverage_amount,
            ad_d_included: data.ad_d_included,
            ad_d_coverage: data.ad_d_coverage,
            beneficiaries: data.beneficiaries,
            age_at_inscription: data.age_at_inscription,
            num_beneficiaries: data.num_beneficiaries,
            num_dependents: data.num_dependents,
            dependents_details: data.dependents_details,
            dependent_type_counts: data.dependent_type_counts,
            deductible: data.deductible,
            coinsurance: data.coinsurance,
            max_annual: data.max_annual,
            has_dental: data.has_dental,
            has_vision: data.has_vision,
            num_dependents_health: data.num_dependents_health,
            dependents_details_health: data.dependents_details_health,
            has_dental_basic: data.has_dental_basic,
            wants_dental_premium: data.wants_dental_premium,
            has_dental_premium: data.has_dental_premium,
            has_vision_basic: data.has_vision_basic,
            wants_vision: data.wants_vision,
            has_vision_full: data.has_vision_full,
            wellness_rebate: data.wellness_rebate,
            // Si tienes campos de auto, añádelos aquí también
            // vehicle_make: data.vehicle_make,
            // vehicle_model: data.vehicle_model,
            // vehicle_year: data.vehicle_year,
            // vehicle_vin: data.vehicle_vin,
            // collision_coverage: data.collision_coverage,
            // comprehensive_coverage: data.comprehensive_coverage,
          });
        } else {
          setError('Póliza no encontrada para editar.');
        }
      } catch (e: any) {
        setError('Ocurrió un error inesperado: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [id]);

  // Manejador de cambios para los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    // Manejo de valores booleanos para checkboxes
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manejador de cambios para contract_details (si es JSONB)
  const handleContractDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setFormData(prev => ({ ...prev, contract_details: parsed }));
    } catch (err) {
      setFormData(prev => ({ ...prev, contract_details: null }));
    }
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      // Elimina campos undefined o null que no deben enviarse para actualización (opcional, pero buena práctica)
      const updatesToSend = Object.fromEntries(
        Object.entries(formData).filter(([, value]) => value !== undefined)
      );

      const { data, error: updateError } = await updatePolicy(id, updatesToSend);
      if (updateError) {
        setError(`Error al actualizar la póliza: ${updateError.message}`);
      } else if (data) {
        setPolicy(data); // Actualiza la póliza localmente con los datos guardados
        setSuccess('Póliza actualizada exitosamente!');
        // Opcional: navegar de vuelta a los detalles o a la lista después de un tiempo
        // setTimeout(() => navigate(`/admin/dashboard/policies/${id}`), 2000);
      }
    } catch (e: any) {
      setError('Ocurrió un error inesperado al actualizar: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-blue-600 text-lg">Cargando póliza para editar...</p>
      </div>
    );
  }

  if (error && !policy) { // Muestra el error solo si no hay póliza cargada
    return (
      <div className="flex justify-center items-center h-48 flex-col">
        <p className="text-red-500 text-lg">Error: {error}</p>
        <button
          onClick={() => navigate('/admin/dashboard/policies')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Volver a Pólizas
        </button>
      </div>
    );
  }

  if (!policy) { // Si no hay póliza y no hay error, es que no se encontró
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl border border-blue-100 text-center mx-auto">
        <h2 className="text-3xl font-bold text-blue-700 mb-6">Editar Póliza</h2>
        <p className="text-gray-600">Póliza no encontrada para editar.</p>
        <button
          onClick={() => navigate('/admin/dashboard/policies')}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Volver a Pólizas
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-blue-100 mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-8 text-center">Editar Póliza: {policy.policy_number}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo: policy_number */}
          <div>
            <label htmlFor="policy_number" className="block text-sm font-medium text-gray-700">Número de Póliza</label>
            <input
              type="text"
              name="policy_number"
              id="policy_number"
              value={formData.policy_number || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          {/* Campo: status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              name="status"
              id="status"
              value={formData.status || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="pending">Pendiente</option>
              <option value="active">Activa</option>
              <option value="cancelled">Cancelada</option>
              <option value="expired">Expirada</option>
              <option value="rejected">Rechazada</option>
            </select>
          </div>

          {/* Campo: start_date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
            <input
              type="date"
              name="start_date"
              id="start_date"
              value={formData.start_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          {/* Campo: end_date */}
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">Fecha de Fin</label>
            <input
              type="date"
              name="end_date"
              id="end_date"
              value={formData.end_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          {/* Campo: premium_amount */}
          <div>
            <label htmlFor="premium_amount" className="block text-sm font-medium text-gray-700">Monto Premium</label>
            <input
              type="number"
              name="premium_amount"
              id="premium_amount"
              value={formData.premium_amount || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              step="0.01"
              required
            />
          </div>

          {/* Campo: payment_frequency */}
          <div>
            <label htmlFor="payment_frequency" className="block text-sm font-medium text-gray-700">Frecuencia de Pago</label>
            <select
              name="payment_frequency"
              id="payment_frequency"
              value={formData.payment_frequency || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annually">Anual</option>
            </select>
          </div>

          {/* Campo: coverage_amount (ejemplo de campo opcional/numérico) */}
          <div>
            <label htmlFor="coverage_amount" className="block text-sm font-medium text-gray-700">Monto de Cobertura</label>
            <input
              type="number"
              name="coverage_amount"
              id="coverage_amount"
              value={formData.coverage_amount || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              step="0.01"
            />
          </div>

          {/* Campo: contract_details (Textarea para JSONB) */}
          <div className="md:col-span-2">
            <label htmlFor="contract_details" className="block text-sm font-medium text-gray-700">Detalles del Contrato (JSON o Texto)</label>
            <textarea
              name="contract_details"
              id="contract_details"
              value={typeof formData.contract_details === 'string' ? formData.contract_details : JSON.stringify(formData.contract_details, null, 2) || ''}
              onChange={handleContractDetailsChange}
              rows={5}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
              placeholder="Introduce detalles adicionales en formato JSON o texto plano..."
            ></textarea>
            <p className="mt-2 text-xs text-gray-500">
              Si introduces un JSON válido, se guardará como objeto; de lo contrario, se guardará como texto.
            </p>
          </div>

          {/* Puedes añadir más campos del formulario aquí, siguiendo el patrón */}
          {/* Por ejemplo, para booleanos (checkbox): */}
          {/*
          <div className="flex items-center">
            <input
              id="ad_d_included"
              name="ad_d_included"
              type="checkbox"
              checked={formData.ad_d_included || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="ad_d_included" className="ml-2 block text-sm text-gray-900">
              AD&D Incluido
            </label>
          </div>
          */}

        </div>

        {/* Mensajes de estado */}
        {submitting && <p className="text-blue-600 mt-4">Guardando cambios...</p>}
        {error && <p className="text-red-600 mt-4">{error}</p>}
        {success && <p className="text-green-600 mt-4">{success}</p>}

        {/* Botones de acción */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/policies/${id}`)}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}