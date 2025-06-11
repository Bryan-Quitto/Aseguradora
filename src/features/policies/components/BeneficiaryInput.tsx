import React from 'react';

// Define la interfaz para un solo beneficiario
export interface Beneficiary {
    id: string; // Para identificar de forma única cada beneficiario en la UI
    relation: string;
    custom_relation?: string; // Solo si relation es 'Otro'
    first_name1: string;
    first_name2?: string; // Opcional
    last_name1: string;
    last_name2?: string; // Opcional
    id_card: string; // Cédula/Número de Identificación
    percentage: number | ''; // Porcentaje de la cobertura, puede ser vacío inicialmente
}

interface BeneficiaryInputProps {
    beneficiary: Beneficiary;
    index: number;
    onChange: (index: number, updatedBeneficiary: Beneficiary) => void;
    onRemove: (index: number) => void;
}

/**
 * Componente para ingresar los detalles de un solo beneficiario.
 */
const BeneficiaryInput: React.FC<BeneficiaryInputProps> = ({ beneficiary, index, onChange, onRemove }) => {
    // Maneja los cambios en los campos individuales del beneficiario
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let updatedValue: string | number = value;

        // Convertir el porcentaje a número si el campo es 'percentage'
        if (name === 'percentage') {
            updatedValue = value === '' ? '' : parseFloat(value);
        }

        const newBeneficiary = { ...beneficiary, [name]: updatedValue };

        // Lógica para 'Otro' en relación
        if (name === 'relation' && value !== 'Otro') {
            delete newBeneficiary.custom_relation;
        }

        onChange(index, newBeneficiary);
    };

    return (
        <div className="p-4 border border-gray-200 rounded-md shadow-sm bg-gray-50 space-y-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-700">Beneficiario #{index + 1}</h4>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                    Eliminar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primer Nombre */}
                <div>
                    <label htmlFor={`first_name1-${index}`} className="block text-sm font-medium text-gray-700">Primer Nombre</label>
                    <input
                        type="text"
                        id={`first_name1-${index}`}
                        name="first_name1"
                        value={beneficiary.first_name1}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Segundo Nombre (Opcional) */}
                <div>
                    <label htmlFor={`first_name2-${index}`} className="block text-sm font-medium text-gray-700">Segundo Nombre (Opcional)</label>
                    <input
                        type="text"
                        id={`first_name2-${index}`}
                        name="first_name2"
                        value={beneficiary.first_name2 || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Primer Apellido */}
                <div>
                    <label htmlFor={`last_name1-${index}`} className="block text-sm font-medium text-gray-700">Primer Apellido</label>
                    <input
                        type="text"
                        id={`last_name1-${index}`}
                        name="last_name1"
                        value={beneficiary.last_name1}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Segundo Apellido (Opcional) */}
                <div>
                    <label htmlFor={`last_name2-${index}`} className="block text-sm font-medium text-gray-700">Segundo Apellido (Opcional)</label>
                    <input
                        type="text"
                        id={`last_name2-${index}`}
                        name="last_name2"
                        value={beneficiary.last_name2 || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Cédula */}
                <div>
                    <label htmlFor={`id_card-${index}`} className="block text-sm font-medium text-gray-700">Cédula</label>
                    <input
                        type="text"
                        id={`id_card-${index}`}
                        name="id_card"
                        value={beneficiary.id_card}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Relación */}
                <div>
                    <label htmlFor={`relation-${index}`} className="block text-sm font-medium text-gray-700">Relación Filial</label>
                    <select
                        id={`relation-${index}`}
                        name="relation"
                        value={beneficiary.relation}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Selecciona una relación</option>
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Hijo">Hijo</option>
                        <option value="Padre">Padre/Madre</option>
                        <option value="Hermano">Hermano/Hermana</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                {/* Campo "Otro" si la relación es "Otro" */}
                {beneficiary.relation === 'Otro' && (
                    <div>
                        <label htmlFor={`custom_relation-${index}`} className="block text-sm font-medium text-gray-700">Especificar Relación</label>
                        <input
                            type="text"
                            id={`custom_relation-${index}`}
                            name="custom_relation"
                            value={beneficiary.custom_relation || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ej: Sobrino"
                        />
                    </div>
                )}
                {/* Porcentaje de Cobertura */}
                <div>
                    <label htmlFor={`percentage-${index}`} className="block text-sm font-medium text-gray-700">Porcentaje de Cobertura (%)</label>
                    <input
                        type="number"
                        id={`percentage-${index}`}
                        name="percentage"
                        value={beneficiary.percentage}
                        onChange={handleChange}
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default BeneficiaryInput;