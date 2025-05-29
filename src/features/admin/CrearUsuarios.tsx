import { Button, Label, Select, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { createUserProfile } from 'src/features/admin/hooks/administrador_backend'; // Importa la función de backend
import { supabase } from 'src/supabase/client'; // Importa la instancia de Supabase

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
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null); // Para mensajes de éxito/error

  const validateName = (value: string): boolean => {
    return /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/.test(value);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
    setSubmissionMessage(null); // Limpiar mensaje al cambiar input
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos los campos antes de enviar
    const newErrors: FormErrors = {};
    if (!validateName(formData.primerNombre)) newErrors.primerNombre = 'Primer Nombre inválido';
    if (!validateName(formData.primerApellido)) newErrors.primerApellido = 'Primer Apellido inválido';
    if (!validateEmail(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.rol) newErrors.rol = 'Debe seleccionar un rol';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSubmissionMessage('Por favor, corrige los errores en el formulario.');
      return;
    }

    setSubmissionMessage(null);

    try {
      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'password_temporal_segura', // Considera generar una contraseña temporal y enviarla por email
        options: {
          data: {
            full_name: `${formData.primerNombre} ${formData.segundoNombre || ''} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
            role: formData.rol,
          },
        },
      });

      if (authError) {
        console.error('Error al registrar usuario en Auth:', authError.message);
        setSubmissionMessage(`Error al registrar usuario: ${authError.message}`);
        return;
      }

      // Verificar si el usuario ya existe en Auth (user_repeated_signup)
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        // Esto puede indicar que el usuario ya existía y no se creó una nueva identidad
        setSubmissionMessage('El usuario con este email ya está registrado. Por favor, inicia sesión o usa otro email.');
        return;
      }

      if (authData.user) {
        // Opcional: Verificar la sesión actual para depuración
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error al obtener la sesión:', sessionError.message);
          setSubmissionMessage(`Error al obtener la sesión: ${sessionError.message}`);
          return;
        }
        if (!session) {
          console.error('No hay sesión activa después del registro.');
          setSubmissionMessage('Usuario creado con exito. Por favor, notifique al usuario de que revise su bandeja de entrada.');
          return;
        }

        // 2. Si el usuario se creó en Auth, crear el perfil en la tabla 'profiles'
        const { data: profileData, error: profileError } = await createUserProfile({
          id: authData.user.id,
          full_name: `${formData.primerNombre} ${formData.segundoNombre || ''} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
          role: formData.rol,
        });

        if (profileError) {
          console.error('Error al crear perfil en la tabla profiles:', profileError.message);
          setSubmissionMessage(`Usuario creado en Auth, pero error al crear perfil: ${profileError.message}`);
          // Considera revertir la creación del usuario en auth si el perfil falla
          return;
        }

        setSubmissionMessage('Usuario creado exitosamente!');
        setFormData({
          primerNombre: '',
          segundoNombre: '',
          primerApellido: '',
          segundoApellido: '',
          email: '',
          rol: ''
        });
        setErrors({});
      } else {
        setSubmissionMessage('No se pudo crear el usuario. Inténtalo de nuevo.');
      }

    } catch (error: any) {
      console.error('Error inesperado:', error.message);
      setSubmissionMessage(`Error inesperado: ${error.message}`);
    }
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
            color={errors.rol ? 'failure' : undefined}
            helperText={errors.rol}
          >
            <option value="">Seleccionar rol</option>
            <option value="admin">Administrador</option>
            <option value="agente">Agente</option>
            <option value="cliente">Cliente</option>
          </Select>
        </div>

        {submissionMessage && (
          <div className={`p-3 rounded-md text-sm ${submissionMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {submissionMessage}
          </div>
        )}

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