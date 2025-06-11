import React from 'react';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos para cada beneficiario

// Importa la interfaz y el componente individual de beneficiario
import BeneficiaryInput, { Beneficiary } from './BeneficiaryInput'; // Asegúrate de que la ruta sea correcta

interface BeneficiaryInputListProps {
    beneficiaries: Beneficiary[];
    onChange: (beneficiaries: Beneficiary[]) => void;
    maxBeneficiaries: number | null; // El máximo de beneficiarios permitido por el producto (0 para ilimitado, 5 para límite)
}

/**
 * Componente que gestiona una lista de entradas de beneficiarios.
 * Permite añadir, editar y eliminar beneficiarios, y valida la suma de porcentajes.
 */
const BeneficiaryInputList: React.FC<BeneficiaryInputListProps> = ({ beneficiaries, onChange, maxBeneficiaries }) => {

    // Maneja la adición de un nuevo beneficiario
    const handleAddBeneficiary = () => {
        // No añadir si se ha alcanzado el límite de beneficiarios y no es 0 (ilimitado)
        if (maxBeneficiaries !== null && maxBeneficiaries !== 0 && beneficiaries.length >= maxBeneficiaries) {
            alert(`No se pueden añadir más de ${maxBeneficiaries} beneficiarios para este producto.`);
            return;
        }

        const newBeneficiary: Beneficiary = {
            id: uuidv4(), // Genera un ID único
            relation: '',
            first_name1: '',
            last_name1: '',
            id_card: '',
            percentage: '',
        };
        onChange([...beneficiaries, newBeneficiary]);
    };

    // Maneja la actualización de un beneficiario específico
    const handleUpdateBeneficiary = (index: number, updatedBeneficiary: Beneficiary) => {
        const newBeneficiaries = beneficiaries.map((b, i) =>
            i === index ? updatedBeneficiary : b
        );
        onChange(newBeneficiaries);
    };

    // Maneja la eliminación de un beneficiario
    const handleRemoveBeneficiary = (index: number) => {
        const newBeneficiaries = beneficiaries.filter((_, i) => i !== index);
        onChange(newBeneficiaries);
    };

    // Calcula la suma total de los porcentajes de los beneficiarios
    const totalPercentage = beneficiaries.reduce((sum, b) => {
        const percentage = typeof b.percentage === 'number' ? b.percentage : 0;
        return sum + percentage;
    }, 0);

    return (
        <div className="space-y-6">
            {beneficiaries.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No hay beneficiarios añadidos aún.</p>
            ) : (
                <div className="space-y-4">
                    {beneficiaries.map((b, index) => (
                        <BeneficiaryInput
                            key={b.id} // Usa el ID único como key
                            beneficiary={b}
                            index={index}
                            onChange={handleUpdateBeneficiary}
                            onRemove={handleRemoveBeneficiary}
                        />
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={handleAddBeneficiary}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                disabled={maxBeneficiaries !== null && maxBeneficiaries !== 0 && beneficiaries.length >= maxBeneficiaries}
            >
                Añadir Beneficiario
            </button>

            {/* Mensaje de validación de porcentaje */}
            {beneficiaries.length > 0 && totalPercentage !== 100 && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Advertencia:</strong>
                    <span className="block sm:inline"> La suma de los porcentajes de los beneficiarios debe ser 100%. Actualmente es {totalPercentage}%.</span>
                </div>
            )}
        </div>
    );
};

export default BeneficiaryInputList;