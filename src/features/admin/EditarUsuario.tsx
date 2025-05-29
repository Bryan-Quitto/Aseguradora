import { Button, Label, Select, TextInput, Modal } from 'flowbite-react';
import { useState, useEffect } from 'react';
import { getUserProfileById, updateUserProfile, UserProfile } from 'src/features/admin/hooks/administrador_backend';

// Array de nacionalidades para reutilizar (copiado de Register.tsx y CrearUsuarios.tsx)
const NATIONALITIES = [
  "Panameña", "Colombiana", "Venezolana", "Brasileña", "Peruana", "Estadounidense",
  "Canadiense", "Española", "Italiana", "Francesa", "Alemana", "Británica",
  "Suiza", "Australiana", "Mexicana", "Argentina", "Chilena", "Uruguaya",
  "Paraguaya", "Boliviana", "Cubana", "Dominicana", "Hondureña", "Guatemalteca",
  "Salvadoreña", "Nicaragüense", "Costarricense", "Ecuatoriana"
];

// Array de países derivado de NATIONALITIES (copiado de Register.tsx y CrearUsuarios.tsx)
const COUNTRIES = NATIONALITIES.map(nationality => {
  switch (nationality) {
    case "Panameña": return "Panamá";
    case "Colombiana": return "Colombia";
    case "Venezolana": return "Venezuela";
    case "Brasileña": return "Brasil";
    case "Peruana": return "Perú";
    case "Estadounidense": return "Estados Unidos";
    case "Canadiense": return "Canadá";
    case "Española": return "España";
    case "Italiana": return "Italia";
    case "Francesa": return "Francia";
    case "Alemana": return "Alemania";
    case "Británica": return "Reino Unido";
    case "Suiza": return "Suiza";
    case "Australiana": return "Australia";
    case "Mexicana": return "México";
    case "Argentina": return "Argentina";
    case "Chilena": return "Chile";
    case "Uruguaya": return "Uruguay";
    case "Paraguaya": return "Paraguay";
    case "Boliviana": return "Bolivia";
    case "Cubana": return "Cuba";
    case "Dominicana": return "República Dominicana";
    case "Hondureña": return "Honduras";
    case "Guatemalteca": return "Guatemala";
    case "Salvadoreña": return "El Salvador";
    case "Nicaragüense": return "Nicaragua";
    case "Costarricense": return "Costa Rica";
    case "Ecuatoriana": return "Ecuador";
    default: return nationality;
  }
});

// Interfaz para los datos del formulario de edición
// Todos los campos son opcionales en el objeto de actualización, pero aquí son strings para el estado del formulario.
interface FormData {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
  nacionalidad: string;
  nacionalidadOtra: string;
  tipoID: string;
  numeroID: string;
  lugarNacimiento: string;
  lugarNacimientoOtra: string;
  fechaNacimiento: string;
  sexo: string;
  estadoCivil: string;
  estatura: string;
  peso: string;
  rol: string;
}

// Interfaz para los errores del formulario
interface FormErrors {
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  email?: string;
  nacionalidad?: string;
  nacionalidadOtra?: string;
  tipoID?: string;
  numeroID?: string;
  lugarNacimiento?: string;
  lugarNacimientoOtra?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  estatura?: string;
  peso?: string;
  rol?: string;
}

// Props para el componente EditarUsuario
interface EditarUsuarioProps {
  userId: string; // El ID del usuario a editar
  onNavigate: (view: string) => void; // Para volver a la lista de usuarios
}

// Componente de Modal Personalizado (copiado de ListarUsuarios.tsx)
interface CustomModalProps {
  show: boolean;
  onClose: () => void;
  message: string;
  title: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ show, onClose, message, title, type, onConfirm }) => {
  if (!show) return null;

  return (
    <Modal show={show} onClose={onClose} dismissible>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        {type === 'confirm' && (
          <Button color="gray" onClick={onClose}>
            Cancelar
          </Button>
        )}
        <Button
          color={type === 'alert' ? 'blue' : 'failure'}
          onClick={() => {
            if (onConfirm) onConfirm();
            onClose();
          }}
        >
          {type === 'alert' ? 'Aceptar' : 'Confirmar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};


export default function EditarUsuario({ userId, onNavigate }: EditarUsuarioProps) {
  const [formData, setFormData] = useState<FormData>({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    nacionalidad: '',
    nacionalidadOtra: '',
    tipoID: '',
    numeroID: '',
    lugarNacimiento: '',
    lugarNacimientoOtra: '',
    fechaNacimiento: '',
    sexo: '',
    estadoCivil: '',
    estatura: '',
    peso: '',
    rol: ''
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  // Estados para el modal personalizado
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  // Validaciones (copiadas de CrearUsuarios.tsx)
  const validateName = (value: string): boolean => {
    return /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/.test(value);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateNumber = (value: string): boolean => {
    return /^\d*$/.test(value);
  };

  const validateDecimalNumber = (value: string): boolean => {
    return /^[0-9.]*$/.test(value) && (value.match(/\./g) || []).length <= 1;
  };

  const validateDate = (date: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  };

  // Cargar datos del usuario al iniciar el componente
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data, error } = await getUserProfileById(userId);
      if (error) {
        setSubmissionMessage(`Error al cargar datos del usuario: ${error.message}`);
        setLoading(false);
        return;
      }
      if (data) {
        // Mapear los datos del perfil a los campos del formulario
        setFormData({
          primerNombre: data.primer_nombre || '',
          segundoNombre: data.segundo_nombre || '',
          primerApellido: data.primer_apellido || '',
          segundoApellido: data.segundo_apellido || '',
          email: data.email || '',
          nacionalidad: NATIONALITIES.includes(data.nacionalidad || '') ? (data.nacionalidad || '') : 'Otra',
          nacionalidadOtra: NATIONALITIES.includes(data.nacionalidad || '') ? '' : (data.nacionalidad || ''),
          tipoID: data.tipo_identificacion || '',
          numeroID: data.numero_identificacion || '',
          lugarNacimiento: COUNTRIES.includes(data.lugar_nacimiento || '') ? (data.lugar_nacimiento || '') : 'Otra',
          lugarNacimientoOtra: COUNTRIES.includes(data.lugar_nacimiento || '') ? '' : (data.lugar_nacimiento || ''),
          fechaNacimiento: data.fecha_nacimiento || '',
          sexo: data.sexo || '',
          estadoCivil: data.estado_civil || '',
          estatura: data.estatura?.toString() || '',
          peso: data.peso?.toString() || '',
          rol: data.role || ''
        });
      }
      setLoading(false);
    };

    fetchUserData();
  }, [userId]); // Se ejecuta cuando el userId cambia

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    const newErrors = { ...errors };

    // Validaciones específicas por campo (copiadas de CrearUsuarios.tsx)
    if (['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'].includes(name)) {
      if (value && !validateName(value)) {
        newErrors[name as keyof FormErrors] = 'Solo se permiten letras';
      } else {
        delete newErrors[name as keyof FormErrors];
      }
    } else if (name === 'email') {
      if (value && !validateEmail(value)) {
        newErrors.email = 'Email inválido';
      } else {
        delete newErrors.email;
      }
    } else if (name === 'numeroID') {
      if (value && !validateNumber(value)) {
        newErrors.numeroID = 'Solo se permiten números';
      } else {
        delete newErrors.numeroID;
      }
    } else if (name === 'fechaNacimiento') {
      if (value && !validateDate(value)) {
        newErrors.fechaNacimiento = 'Formato AAAA-MM-DD requerido';
      } else {
        delete newErrors.fechaNacimiento;
      }
    } else if (['estatura', 'peso'].includes(name)) {
      if (value && !validateDecimalNumber(value)) {
        newErrors[name as keyof FormErrors] = 'Solo números y un punto decimal';
      } else {
        delete newErrors[name as keyof FormErrors];
      }
    }

    // Limpiar errores de campos condicionales si la opción "Otra" no está seleccionada
    if (name === 'nacionalidad' && value !== 'Otra') {
      delete newErrors.nacionalidadOtra;
      setFormData(prev => ({ ...prev, nacionalidadOtra: '' }));
    }
    if (name === 'lugarNacimiento' && value !== 'Otra') {
      delete newErrors.lugarNacimientoOtra;
      setFormData(prev => ({ ...prev, lugarNacimientoOtra: '' }));
    }

    setErrors(newErrors);
    setSubmissionMessage(null); // Limpiar mensaje al cambiar input
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos los campos antes de enviar
    const newErrors: FormErrors = {};
    const requiredFields: Array<keyof FormData> = [
      'primerNombre', 'primerApellido', 'email',
      'nacionalidad', 'tipoID', 'numeroID', 'lugarNacimiento', 'fechaNacimiento',
      'sexo', 'estadoCivil', 'estatura', 'peso', 'rol'
    ];

    requiredFields.forEach(field => {
      if (field === 'nacionalidadOtra' && formData.nacionalidad !== 'Otra') return;
      if (field === 'lugarNacimientoOtra' && formData.lugarNacimiento !== 'Otra') return;

      if (!formData[field] || formData[field].toString().trim() === '') {
        if (field === 'nacionalidadOtra' && formData.nacionalidad === 'Otra') {
          newErrors.nacionalidadOtra = 'Especifique nacionalidad';
        } else if (field === 'lugarNacimientoOtra' && formData.lugarNacimiento === 'Otra') {
          newErrors.lugarNacimientoOtra = 'Especifique lugar de nacimiento';
        } else {
          newErrors[field] = 'Campo requerido';
        }
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSubmissionMessage('Por favor, corrige los errores en el formulario.');
      return;
    }

    setSubmissionMessage(null);

    // Preparar datos para la actualización
    const updates = {
      primer_nombre: formData.primerNombre,
      segundo_nombre: formData.segundoNombre || null, // Asegurar que sea null si está vacío
      primer_apellido: formData.primerApellido,
      segundo_apellido: formData.segundoApellido || null,
      full_name: `${formData.primerNombre} ${formData.segundoNombre || ''} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
      email: formData.email,
      nacionalidad: formData.nacionalidad === "Otra" ? formData.nacionalidadOtra : formData.nacionalidad,
      tipo_identificacion: formData.tipoID,
      numero_identificacion: formData.numeroID,
      lugar_nacimiento: formData.lugarNacimiento === "Otra" ? formData.lugarNacimientoOtra : formData.lugarNacimiento,
      fecha_nacimiento: formData.fechaNacimiento,
      sexo: formData.sexo,
      estado_civil: formData.estadoCivil,
      estatura: parseFloat(formData.estatura) || null,
      peso: parseFloat(formData.peso) || null,
      role: formData.rol,
    };

    try {
      setModalTitle('Confirmar Actualización');
      setModalMessage('¿Estás seguro de que quieres actualizar este perfil?');
      setModalType('confirm');
      setModalAction(() => async () => {
        const { data, error: updateError } = await updateUserProfile(userId, updates);

        if (updateError) {
          console.error('Error al actualizar perfil:', updateError.message);
          setSubmissionMessage(`Error al actualizar perfil: ${updateError.message}`);
          setModalTitle('Error');
          setModalMessage(`Error al actualizar perfil: ${updateError.message}`);
          setModalType('alert');
        } else if (data) {
          setSubmissionMessage('Perfil actualizado exitosamente!');
          setModalTitle('Éxito');
          setModalMessage('Perfil actualizado exitosamente!');
          setModalType('alert');
          onNavigate('listar-usuarios'); // Volver a la lista después de actualizar
        } else {
          setSubmissionMessage('No se pudo actualizar el perfil. Inténtalo de nuevo.');
          setModalTitle('Error');
          setModalMessage('No se pudo actualizar el perfil. Inténtalo de nuevo.');
          setModalType('alert');
        }
      });
      setShowModal(true);

    } catch (error: any) {
      console.error('Error inesperado:', error.message);
      setSubmissionMessage(`Error inesperado: ${error.message}`);
      setModalTitle('Error');
      setModalMessage(`Error inesperado: ${error.message}`);
      setModalType('alert');
      setShowModal(true);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Cargando datos del usuario...</div>;
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Editar Usuario</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombres y Apellidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primerNombre" value="Primer Nombre" />
            <TextInput
              id="primerNombre"
              name="primerNombre"
              value={formData.primerNombre}
              onChange={handleInputChange}
              color={errors.primerNombre ? 'failure' : undefined}
              helperText={errors.primerNombre}
              required
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
              required
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

        {/* Email */}
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
            required
          />
        </div>

        {/* Nacionalidad */}
        <div>
          <Label htmlFor="nacionalidad" value="Nacionalidad" />
          <Select
            id="nacionalidad"
            name="nacionalidad"
            value={formData.nacionalidad}
            onChange={handleInputChange}
            required
            color={errors.nacionalidad ? 'failure' : undefined}
            helperText={errors.nacionalidad}
          >
            <option value="">Selecciona tu nacionalidad</option>
            {NATIONALITIES.map((nationality) => (
              <option key={nationality} value={nationality}>{nationality}</option>
            ))}
            <option value="Otra">Otra</option>
          </Select>
          {formData.nacionalidad === "Otra" && (
            <TextInput
              type="text"
              name="nacionalidadOtra"
              value={formData.nacionalidadOtra}
              onChange={handleInputChange}
              placeholder="Especifica tu nacionalidad"
              className="mt-2"
              color={errors.nacionalidadOtra ? 'failure' : undefined}
              helperText={errors.nacionalidadOtra}
              required
            />
          )}
        </div>

        {/* Tipo de Identificación y Número de Identificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipoID" value="Tipo de Identificación" />
            <Select
              id="tipoID"
              name="tipoID"
              value={formData.tipoID}
              onChange={handleInputChange}
              required
              color={errors.tipoID ? 'failure' : undefined}
              helperText={errors.tipoID}
            >
              <option value="">Selecciona el tipo de identificación</option>
              <option value="Cédula">Cédula</option>
              <option value="Pasaporte">Pasaporte</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="numeroID" value="Número de Identificación" />
            <TextInput
              id="numeroID"
              name="numeroID"
              type="text"
              value={formData.numeroID}
              onChange={handleInputChange}
              color={errors.numeroID ? 'failure' : undefined}
              helperText={errors.numeroID}
              required
            />
          </div>
        </div>

        {/* Lugar de Nacimiento y Fecha de Nacimiento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lugarNacimiento" value="Lugar de Nacimiento" />
            <Select
              id="lugarNacimiento"
              name="lugarNacimiento"
              value={formData.lugarNacimiento}
              onChange={handleInputChange}
              required
              color={errors.lugarNacimiento ? 'failure' : undefined}
              helperText={errors.lugarNacimiento}
            >
              <option value="">Selecciona tu lugar de nacimiento</option>
              {COUNTRIES.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
              <option value="Otra">Otra</option>
            </Select>
            {formData.lugarNacimiento === "Otra" && (
              <TextInput
                type="text"
                name="lugarNacimientoOtra"
                value={formData.lugarNacimientoOtra}
                onChange={handleInputChange}
                placeholder="Especifica tu lugar de nacimiento"
                className="mt-2"
                color={errors.lugarNacimientoOtra ? 'failure' : undefined}
                helperText={errors.lugarNacimientoOtra}
                required
              />
            )}
          </div>

          <div>
            <Label htmlFor="fechaNacimiento" value="Fecha de Nacimiento" />
            <TextInput
              id="fechaNacimiento"
              name="fechaNacimiento"
              type="date"
              value={formData.fechaNacimiento}
              onChange={handleInputChange}
              color={errors.fechaNacimiento ? 'failure' : undefined}
              helperText={errors.fechaNacimiento}
              required
            />
          </div>
        </div>

        {/* Sexo y Estado Civil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sexo" value="Sexo" />
            <Select
              id="sexo"
              name="sexo"
              value={formData.sexo}
              onChange={handleInputChange}
              required
              color={errors.sexo ? 'failure' : undefined}
              helperText={errors.sexo}
            >
              <option value="">Selecciona tu sexo</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="Otro">Otro</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="estadoCivil" value="Estado Civil" />
            <Select
              id="estadoCivil"
              name="estadoCivil"
              value={formData.estadoCivil}
              onChange={handleInputChange}
              required
              color={errors.estadoCivil ? 'failure' : undefined}
              helperText={errors.estadoCivil}
            >
              <option value="">Selecciona tu estado civil</option>
              <option value="Soltero">Soltero/a</option>
              <option value="Casado">Casado/a</option>
              <option value="Divorciado">Divorciado/a</option>
              <option value="Viudo">Viudo/a</option>
              <option value="U/Libre">Unión Libre</option>
            </Select>
          </div>
        </div>

        {/* Estatura y Peso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="estatura" value="Estatura (metros)" />
            <TextInput
              id="estatura"
              name="estatura"
              type="text"
              value={formData.estatura}
              onChange={handleInputChange}
              placeholder="Ej: 1.75"
              color={errors.estatura ? 'failure' : undefined}
              helperText={errors.estatura}
              required
            />
          </div>

          <div>
            <Label htmlFor="peso" value="Peso (kg)" />
            <TextInput
              id="peso"
              name="peso"
              type="text"
              value={formData.peso}
              onChange={handleInputChange}
              placeholder="Ej: 70.5"
              color={errors.peso ? 'failure' : undefined}
              helperText={errors.peso}
              required
            />
          </div>
        </div>

        {/* Rol */}
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
            <option value="agent">Agente</option>
            <option value="client">Cliente</option>
            <option value="inactive">Inactivo</option> {/* Permitir seleccionar inactivo si es necesario */}
          </Select>
        </div>

        {submissionMessage && (
          <div className={`p-3 rounded-md text-sm ${submissionMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {submissionMessage}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button color="gray" onClick={() => onNavigate('listar-usuarios')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            color="blue"
            disabled={Object.keys(errors).length > 0 || loading}
          >
            Guardar Cambios
          </Button>
        </div>
      </form>

      {/* Modal Personalizado */}
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onConfirm={modalAction || undefined}
      />
    </div>
  );
}
