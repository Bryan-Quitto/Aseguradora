import React from 'react';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos para cada dependiente

// Importa la interfaz y el componente individual de dependiente
import DependentInput, { Dependent } from './DependentInput'; // Asegúrate de que la ruta sea correcta

interface DependentInputListProps {
    dependents: Dependent[];
    onChange: (dependents: Dependent[]) => void;
    maxDependents: number | null; // El máximo de dependientes permitido por el producto (0 para no permitir)
}

/**
 * Componente que gestiona una lista de entradas de dependientes.
 * Permite añadir, editar y eliminar dependientes, y respeta el límite establecido.
 */
const DependentInputList: React.FC<DependentInputListProps> = ({ dependents, onChange, maxDependents }) => {

    // Maneja la adición de un nuevo dependiente
    const handleAddDependent = () => {
        // Si maxDependents es 0, no se permite añadir dependientes.
        // Si maxDependents es un número positivo y se ha alcanzado el límite, no se permite añadir más.
        if (maxDependents !== null && dependents.length >= maxDependents) {
            if (maxDependents === 0) {
                // Mensaje más específico si el producto no permite dependientes
                alert('Este producto de seguro no permite dependientes.');
            } else {
                alert(`No se pueden añadir más de ${maxDependents} dependientes para este producto.`);
            }
            return;
        }

        const newDependent: Dependent = {
            id: uuidv4(), // Genera un ID único
            relation: '',
            first_name1: '',
            last_name1: '',
            id_card: '',
            age: '',
        };
        onChange([...dependents, newDependent]);
    };

    // Maneja la actualización de un dependiente específico
    const handleUpdateDependent = (index: number, updatedDependent: Dependent) => {
        const newDependents = dependents.map((d, i) =>
            i === index ? updatedDependent : d
        );
        onChange(newDependents);
    };

    // Maneja la eliminación de un dependiente
    const handleRemoveDependent = (index: number) => {
        const newDependents = dependents.filter((_, i) => i !== index);
        onChange(newDependents);
    };

    return (
        <div className="space-y-6">
            {dependents.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No hay dependientes añadidos aún.</p>
            ) : (
                <div className="space-y-4">
                    {dependents.map((d, index) => (
                        <DependentInput
                            key={d.id} // Usa el ID único como key
                            dependent={d}
                            index={index}
                            onChange={handleUpdateDependent}
                            onRemove={handleRemoveDependent}
                        />
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={handleAddDependent}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                // Deshabilita el botón si no se permiten dependientes (maxDependents === 0) o si se alcanzó el límite
                disabled={maxDependents !== null && dependents.length >= maxDependents}
            >
                Añadir Dependiente
            </button>

            {maxDependents !== null && dependents.length > maxDependents && maxDependents !== 0 && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Advertencia:</strong>
                    <span className="block sm:inline"> Ha excedido el número máximo de dependientes permitidos ({maxDependents}).</span>
                </div>
            )}
        </div>
    );
};

export default DependentInputList;