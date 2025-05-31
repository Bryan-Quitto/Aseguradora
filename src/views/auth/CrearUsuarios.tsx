import { Button, Label, Select, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ¡IMPORTANTE! Reemplaza con tus credenciales de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybgslgymtvueuckvbllk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ3NsZ3ltdHZ1ZXVja3ZibGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MjQ4MTIsImV4cCI6MjA2MzEwMDgxMn0.BIr0vKkHmk4mS9KovpU9X7_CuiVSUzYjlQTcmeIMvao';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FormData {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
}

interface FormErrors {
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  email?: string;
}

export default function CrearUsuarios() {
  const [formData, setFormData] = useState<FormData>({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

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
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.primerNombre.trim()) newErrors.primerNombre = 'Primer nombre es requerido';
    if (!validateName(formData.primerNombre)) newErrors.primerNombre = 'Solo se permiten letras';

    if (!formData.primerApellido.trim()) newErrors.primerApellido = 'Primer apellido es requerido';
    if (!validateName(formData.primerApellido)) newErrors.primerApellido = 'Solo se permiten letras';

    if (!formData.email.trim()) newErrors.email = 'Email es requerido';
    if (!validateEmail(formData.email)) newErrors.email = 'Email inválido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (!validateForm()) {
      setMessage('Por favor, corrige los errores en el formulario.');
      return;
    }

    setLoading(true);

    try {
      // 1. Iniciar sesión o crear usuario con un enlace mágico/OTP
      // Esto enviará un correo al usuario para que "inicie sesión" o complete el registro.
      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`, // Redirigir después de la confirmación
          data: {
            full_name: `${formData.primerNombre} ${formData.segundoNombre || ''} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
            role: 'client' // Puedes usar esto para almacenar el rol en los metadatos de auth.users
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Si el email ya está en uso, Supabase podría no devolver un error directo
      // con signInWithOtp, sino simplemente enviar el correo.
      // Para saber el user_id para profiles y clients, la forma más robusta
      // es manejar el caso donde el usuario ya existe.
      // Aquí, asumimos que signInWithOtp o bien lo crea o gestiona la existencia.
      // En un flujo real, si el user_id no se obtiene directamente,
      // podrías necesitar buscar el usuario por email después de signInWithOtp
      // si Supabase no te proporciona el ID de inmediato, o confiar en que
      // el flujo de confirmación del Magic Link finalmente asocie el user_id.

      // Para este caso, después de signInWithOtp, Supabase no te da el user_id
      // directamente en la respuesta porque no se ha autenticado todavía.
      // El usuario debe hacer clic en el enlace del correo.
      // Por lo tanto, no podemos insertar en 'profiles' y 'clients' inmediatamente aquí
      // con el user_id generado por auth.users.

      // La estrategia debe ser:
      // 1. Enviar el Magic Link.
      // 2. Insertar los datos en 'profiles' y 'clients' *después* de que el usuario
      //    haya confirmado su correo y se haya autenticado por primera vez.
      //    Esto se haría en un hook de Supabase o en una función de servidor
      //    que se active cuando un nuevo usuario de `auth.users` se cree o confirme.

      // Sin embargo, si quieres que los datos del perfil se creen *antes* de que
      // el usuario confirme, necesitaríamos una forma de obtener el user_id.
      // Supabase no expone el user_id de un usuario no confirmado al cliente
      // por motivos de seguridad.

      // Una solución común para este escenario (admin crea cuenta, usuario completa)
      // es crear un trigger en Supabase que inserte en 'profiles' y 'clients'
      // cuando un nuevo usuario es creado en 'auth.users'.

      // Alternativamente, si el admin necesita crear el usuario con una contraseña
      // (que luego el usuario puede cambiar), necesitarías una Key de Servicio
      // (solo en el backend, ¡NUNCA en el frontend!) para usar `admin.createUser`.
      // Si esa es tu necesidad, házmelo saber y te guío con un backend simple.

      // Para el propósito de este componente en el frontend, y manteniendo tu lógica
      // de "no contraseña temporal", lo más cercano es que el usuario reciba un correo
      // y al confirmar, se active la creación de su perfil.

      // Por ahora, solo podemos confirmar el envío del correo.
      setMessage('Correo de verificación enviado al usuario para completar el registro. El usuario deberá confirmar su email para activar su cuenta y crear su perfil.');
      setIsSuccess(true);
      setFormData({
        primerNombre: '',
        segundoNombre: '',
        primerApellido: '',
        segundoApellido: '',
        email: '',
      });
      setErrors({});

    } catch (error: any) {
      console.error('Error al iniciar flujo de registro:', error.message);
      setMessage(`Error al iniciar registro: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Crear Nuevo Usuario (Cliente)</h2>

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
            value="client" // Siempre 'client' por defecto en este formulario
            required
            disabled // Deshabilitar el campo ya que no se puede cambiar
          >
            <option value="client">Cliente</option>
          </Select>
        </div>

        {message && (
          <div className={`p-4 text-sm rounded-lg ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            color="blue"
            disabled={Object.keys(errors).length > 0 || loading}
          >
            {loading ? 'Enviando enlace...' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
}