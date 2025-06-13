import React from 'react';

// Define la interfaz para un solo dependiente
export interface Dependent {
    id: string; // Para identificar de forma única cada dependiente en la UI
    relation: string;
    custom_relation?: string; // Solo si relation es 'Otro'
    first_name1: string;
    first_name2?: string; // Opcional
    last_name1: string;
    last_name2?: string; // Opcional
    id_card: string; // Cédula/Número de Identificación
    age: number | ''; // Edad del dependiente
}

interface DependentInputProps {
    dependent: Dependent;
    index: number;
    onChange: (index: number, updatedDependent: Dependent) => void;
    onRemove: (index: number) => void;
}

/**
 * Componente para ingresar los detalles de un solo dependiente.
 */
const limpiarEspacios = (valor: string) =>
  valor.replace(/\s+/g, ' ').trim();

const soloUnaPalabra = (valor: string) => {
  let limpio = limpiarEspacios(valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ''));
  return limpio.split(' ')[0] || '';
};

const DependentInput: React.FC<DependentInputProps> = ({ dependent, index, onChange, onRemove }) => {
    // Maneja los cambios en los campos individuales del dependiente
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let updatedValue: string | number = value;

        // Restricciones para nombres y apellidos: solo letras y una palabra
        if (name === 'first_name1' || name === 'first_name2' || name === 'last_name1' || name === 'last_name2') {
            updatedValue = soloUnaPalabra(value);
        }
        // Solo números para cédula, máximo 10 dígitos
        else if (name === 'id_card') {
            updatedValue = value.replace(/\D/g, '').slice(0, 10);
        }
        // Solo números para edad, sin decimales, mínimo 0
        else if (name === 'age') {
            updatedValue = value === '' ? '' : Math.max(0, parseInt(value.replace(/\D/g, ''), 10));
        }
        // Para los demás campos, limpiar espacios
        else if (name === 'custom_relation') {
            updatedValue = limpiarEspacios(value);
        }

        const newDependent = { ...dependent, [name]: updatedValue };

        // Lógica para 'Otro' en relación
        if (name === 'relation' && value !== 'Otro') {
            delete newDependent.custom_relation;
        }

        onChange(index, newDependent);
    };

    return (
        <div className="p-4 border border-gray-200 rounded-md shadow-sm bg-gray-50 space-y-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-700">Dependiente #{index + 1}</h4>
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
                    <label htmlFor={`dep_first_name1-${index}`} className="block text-sm font-medium text-gray-700">Primer Nombre</label>
                    <input
                        type="text"
                        id={`dep_first_name1-${index}`}
                        name="first_name1"
                        value={dependent.first_name1}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Segundo Nombre (Opcional) */}
                <div>
                    <label htmlFor={`dep_first_name2-${index}`} className="block text-sm font-medium text-gray-700">Segundo Nombre (Opcional)</label>
                    <input
                        type="text"
                        id={`dep_first_name2-${index}`}
                        name="first_name2"
                        value={dependent.first_name2 || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Primer Apellido */}
                <div>
                    <label htmlFor={`dep_last_name1-${index}`} className="block text-sm font-medium text-gray-700">Primer Apellido</label>
                    <input
                        type="text"
                        id={`dep_last_name1-${index}`}
                        name="last_name1"
                        value={dependent.last_name1}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Segundo Apellido (Opcional) */}
                <div>
                    <label htmlFor={`dep_last_name2-${index}`} className="block text-sm font-medium text-gray-700">Segundo Apellido (Opcional)</label>
                    <input
                        type="text"
                        id={`dep_last_name2-${index}`}
                        name="last_name2"
                        value={dependent.last_name2 || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Cédula */}
                <div>
                    <label htmlFor={`dep_id_card-${index}`} className="block text-sm font-medium text-gray-700">Cédula</label>
                    <input
                        type="text"
                        id={`dep_id_card-${index}`}
                        name="id_card"
                        value={dependent.id_card}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Edad */}
                <div>
                    <label htmlFor={`dep_age-${index}`} className="block text-sm font-medium text-gray-700">Edad</label>
                    <input
                        type="number"
                        id={`dep_age-${index}`}
                        name="age"
                        value={dependent.age}
                        onChange={handleChange}
                        required
                        min="0"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                {/* Relación */}
                <div>
                    <label htmlFor={`dep_relation-${index}`} className="block text-sm font-medium text-gray-700">Relación Filial</label>
                    <select
                        id={`dep_relation-${index}`}
                        name="relation"
                        value={dependent.relation}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Selecciona una relación</option>
                        <option value="Hijo">Hijo/Hija</option>
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Padre">Padre/Madre</option>
                        <option value="Hermano">Hermano/Hermana</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                {/* Campo "Otro" si la relación es "Otro" */}
                {dependent.relation === 'Otro' && (
                    <div>
                        <label htmlFor={`dep_custom_relation-${index}`} className="block text-sm font-medium text-gray-700">Especificar Relación</label>
                        <input
                            type="text"
                            id={`dep_custom_relation-${index}`}
                            name="custom_relation"
                            value={dependent.custom_relation || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ej: Nieto"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DependentInput;