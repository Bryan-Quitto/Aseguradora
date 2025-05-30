import { Button, Modal } from 'flowbite-react';
import { useState, useEffect } from 'react';
import { getUserProfileById, updateUserProfile} from 'src/features/admin/hooks/administrador_backend';
import { useParams, useNavigate } from 'react-router-dom';

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
  onNavigate: () => void; // Para volver a la lista de usuarios
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
    setSubmissionMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar errores antes de validar
    let newErrors: FormErrors = {};

    // Validar campos requeridos
    const requiredFields = [
      'primerNombre', 'primerApellido', 'email', 'nacionalidad', 'tipoID', 'numeroID',
      'lugarNacimiento', 'fechaNacimiento', 'sexo', 'estadoCivil', 'estatura', 'peso', 'rol'
    ];
    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) {
        newErrors[field as keyof FormErrors] = 'Este campo es requerido';
      }
    }

    // Validaciones específicas
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (formData.numeroID && !validateNumber(formData.numeroID)) {
      newErrors.numeroID = 'Solo se permiten números';
    }
    if (formData.fechaNacimiento && !validateDate(formData.fechaNacimiento)) {
      newErrors.fechaNacimiento = 'Formato AAAA-MM-DD requerido';
    }
    if (formData.estatura && !validateDecimalNumber(formData.estatura)) {
      newErrors.estatura = 'Solo números y un punto decimal';
    }
    if (formData.peso && !validateDecimalNumber(formData.peso)) {
      newErrors.peso = 'Solo números y un punto decimal';
    }

    setErrors(newErrors);

    // Si hay errores, no enviar
    if (Object.keys(newErrors).length > 0) {
      setSubmissionMessage('Por favor corrige los errores en el formulario');
      return;
    }

    // Preparar datos para envío
    const updates = {
      primer_nombre: formData.primerNombre,
      segundo_nombre: formData.segundoNombre,
      primer_apellido: formData.primerApellido,
      segundo_apellido: formData.segundoApellido,
      email: formData.email,
      nacionalidad: formData.nacionalidad,
      tipo_identificacion: formData.tipoID,
      numero_identificacion: formData.numeroID,
      lugar_nacimiento: formData.lugarNacimiento,
      fecha_nacimiento: formData.fechaNacimiento,
      sexo: formData.sexo,
      estado_civil: formData.estadoCivil,
      estatura: parseFloat(formData.estatura),
      peso: parseFloat(formData.peso),
      role: formData.rol
    };

    setLoading(true);
    const { data, error } = await updateUserProfile(userId, updates);
    setLoading(false);

    if (error) {
      setSubmissionMessage(`Error al actualizar el usuario: ${error.message}`);
    } else {
      setSubmissionMessage('Usuario actualizado con éxito');
      setTimeout(() => {
        onNavigate(); // Redirige a la lista de usuarios
      }, 1200);
    }
  };

  // En el formulario, agrega un botón para volver:
  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Editar Usuario</h2>
      <form onSubmit={handleSubmit}>
        {/* ...campos del formulario... */}
        <div className="flex justify-between mt-6">
          <Button color="gray" onClick={onNavigate}>Cancelar</Button>
          <Button color="blue" type="submit">Guardar Cambios</Button>
        </div>
      </form>
      {/* Mensaje de confirmación o error */}
      {submissionMessage && (
        <div className={`my-4 p-3 rounded ${submissionMessage.includes('éxito') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {submissionMessage}
        </div>
      )}
      {/* ...modal y mensajes... */}
    </div>
  );
}

// Wrapper para el router
export const EditarUsuarioWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return <EditarUsuario userId={id!} onNavigate={() => navigate('/admin/dashboard/list-users')} />;
};
