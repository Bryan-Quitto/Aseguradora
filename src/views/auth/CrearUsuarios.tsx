import { Button, Label, Select, TextInput } from 'flowbite-react';
import { useState } from 'react';

interface FormData {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
  rol: string;
}

interface FormErrors {
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  email?: string;
  rol?: string;
}

export default function CrearUsuarios() {
  const [formData, setFormData] = useState<FormData>({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    rol: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateName = (value: string): boolean => {
    return /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/.test(value);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validación en tiempo real
    const newErrors = { ...errors };
    if (['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'].includes(name)) {
      if (!validateName(value)) {
        newErrors[name as keyof FormErrors] = 'Solo se permiten letras';
      } else {
        delete newErrors[name as keyof FormErrors];
      }
    } else if (name === 'email') {
      if (!validateEmail(value)) {
        newErrors.email = 'Email inválido';
      } else {
        delete newErrors.email;
      }
    }
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar los datos al servidor
    console.log(formData);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Crear Nuevo Usuario</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primerNombre" value="Primer Nombre" />
            <TextInput
              id="primerNombre"
              name="primerNombre"
              value={formData.primerNombre}
              onChange={handleInputChange}
              color={errors.primerNombre ? 'failure' : undefined}
              helperText={errors.primerNombre}
            />
          </div>
          
          <div>
            <Label htmlFor="segundoNombre" value="Segundo Nombre" />
            <TextInput
              id="segundoNombre"
              name="segundoNombre"
              value={formData.segundoNombre}
              onChange={handleInputChange}
              color={errors.segundoNombre ? 'failure' : undefined}
              helperText={errors.segundoNombre}
            />
          </div>

          <div>
            <Label htmlFor="primerApellido" value="Primer Apellido" />
            <TextInput
              id="primerApellido"
              name="primerApellido"
              value={formData.primerApellido}
              onChange={handleInputChange}
              color={errors.primerApellido ? 'failure' : undefined}
              helperText={errors.primerApellido}
            />
          </div>

          <div>
            <Label htmlFor="segundoApellido" value="Segundo Apellido" />
            <TextInput
              id="segundoApellido"
              name="segundoApellido"
              value={formData.segundoApellido}
              onChange={handleInputChange}
              color={errors.segundoApellido ? 'failure' : undefined}
              helperText={errors.segundoApellido}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" value="Email" />
          <TextInput
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            color={errors.email ? 'failure' : undefined}
            helperText={errors.email}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rol" value="Rol" />
          <Select
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleInputChange}
            required
          >
            <option value="">Seleccionar rol</option>
            <option value="admin">Administrador</option>
            <option value="agente">Agente</option>
            <option value="cliente">Cliente</option>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            color="blue"
            disabled={Object.keys(errors).length > 0}
          >
            Crear Usuario
          </Button>
        </div>
      </form>
    </div>
  );
}