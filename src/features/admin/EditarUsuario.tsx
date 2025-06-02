import { Button, Modal, Label, TextInput, Select, Radio } from 'flowbite-react';
import { useState, useEffect } from 'react';
import { getUserProfileById, updateUserProfile } from 'src/features/admin/hooks/administrador_backend';
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
  showModal: boolean; // Para controlar la visibilidad del modal desde el padre
  onClose: () => void; // Para cerrar el modal desde el padre
  onUserUpdated: () => void; // Callback para indicar que un usuario ha sido actualizado
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


export default function EditarUsuario({ userId, showModal, onClose, onUserUpdated }: EditarUsuarioProps) {
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

  // Estados para el modal personalizado (para mensajes de éxito/error del formulario)
  const [showFormStatusModal, setShowFormStatusModal] = useState(false);
  const [formStatusModalMessage, setFormStatusModalMessage] = useState('');
  const [formStatusModalTitle, setFormStatusModalTitle] = useState('');
  const [formStatusModalType, setFormStatusModalType] = useState<'alert' | 'confirm'>('alert');
  const [formStatusModalAction, setFormStatusModalAction] = useState<(() => void) | null>(null);

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

  // Cargar datos del usuario al iniciar el componente o cuando el modal se abre
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !showModal) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setSubmissionMessage(null); // Limpiar mensajes anteriores
      setErrors({}); // Limpiar errores anteriores

      const { data, error } = await getUserProfileById(userId);
      if (error) {
        setSubmissionMessage(`Error al cargar datos del usuario: ${error.message}`);
        setShowFormStatusModal(true);
        setFormStatusModalTitle('Error');
        setFormStatusModalMessage(`Error al cargar datos del usuario: ${error.message}`);
        setFormStatusModalType('alert');
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
  }, [userId, showModal]); // Se ejecuta cuando el userId o showModal cambian

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
      setShowFormStatusModal(true);
      setFormStatusModalTitle('Error de Validación');
      setFormStatusModalMessage('Por favor corrige los errores en el formulario antes de enviar.');
      setFormStatusModalType('alert');
      return;
    }

    // Preparar datos para envío
    const updates = {
      primer_nombre: formData.primerNombre,
      segundo_nombre: formData.segundoNombre,
      primer_apellido: formData.primerApellido,
      segundo_apellido: formData.segundoApellido,
      email: formData.email,
      nacionalidad: formData.nacionalidad === 'Otra' ? formData.nacionalidadOtra : formData.nacionalidad,
      tipo_identificacion: formData.tipoID,
      numero_identificacion: formData.numeroID,
      lugar_nacimiento: formData.lugarNacimiento === 'Otra' ? formData.lugarNacimientoOtra : formData.lugarNacimiento,
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
      setShowFormStatusModal(true);
      setFormStatusModalTitle('Error de Actualización');
      setFormStatusModalMessage(`Error al actualizar el usuario: ${error.message}`);
      setFormStatusModalType('alert');
    } else {
      setSubmissionMessage('Usuario actualizado con éxito');
      setShowFormStatusModal(true);
      setFormStatusModalTitle('Éxito');
      setFormStatusModalMessage('Usuario actualizado con éxito.');
      setFormStatusModalType('alert');
      setFormStatusModalAction(() => {
        onUserUpdated(); // Llama al callback para que el padre sepa que se actualizó el usuario
        onClose(); // Cierra el modal de edición
      });
    }
  };

  return (
    <>
      <Modal show={showModal} onClose={onClose} dismissible className="overflow-y-auto">
        <Modal.Header>Editar Usuario</Modal.Header>
        <Modal.Body className="overflow-y-auto max-h-[80vh]"> {/* Ajusta la altura máxima del cuerpo del modal */}
          {loading ? (
            <div className="text-center p-4">Cargando datos del usuario...</div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primer Nombre */}
              <div>
                <Label htmlFor="primerNombre" value="Primer Nombre" />
                <TextInput
                  id="primerNombre"
                  name="primerNombre"
                  type="text"
                  value={formData.primerNombre}
                  onChange={handleInputChange}
                  required
                />
                {errors.primerNombre && <p className="text-red-500 text-sm">{errors.primerNombre}</p>}
              </div>

              {/* Segundo Nombre */}
              <div>
                <Label htmlFor="segundoNombre" value="Segundo Nombre" />
                <TextInput
                  id="segundoNombre"
                  name="segundoNombre"
                  type="text"
                  value={formData.segundoNombre}
                  onChange={handleInputChange}
                />
                {errors.segundoNombre && <p className="text-red-500 text-sm">{errors.segundoNombre}</p>}
              </div>

              {/* Primer Apellido */}
              <div>
                <Label htmlFor="primerApellido" value="Primer Apellido" />
                <TextInput
                  id="primerApellido"
                  name="primerApellido"
                  type="text"
                  value={formData.primerApellido}
                  onChange={handleInputChange}
                  required
                />
                {errors.primerApellido && <p className="text-red-500 text-sm">{errors.primerApellido}</p>}
              </div>

              {/* Segundo Apellido */}
              <div>
                <Label htmlFor="segundoApellido" value="Segundo Apellido" />
                <TextInput
                  id="segundoApellido"
                  name="segundoApellido"
                  type="text"
                  value={formData.segundoApellido}
                  onChange={handleInputChange}
                />
                {errors.segundoApellido && <p className="text-red-500 text-sm">{errors.segundoApellido}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" value="Email" />
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
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
                >
                  <option value="">Seleccione</option>
                  {NATIONALITIES.map(nat => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                  <option value="Otra">Otra</option>
                </Select>
                {errors.nacionalidad && <p className="text-red-500 text-sm">{errors.nacionalidad}</p>}
              </div>

              {/* Nacionalidad Otra (condicional) */}
              {formData.nacionalidad === 'Otra' && (
                <div>
                  <Label htmlFor="nacionalidadOtra" value="Especifique Nacionalidad" />
                  <TextInput
                    id="nacionalidadOtra"
                    name="nacionalidadOtra"
                    type="text"
                    value={formData.nacionalidadOtra}
                    onChange={handleInputChange}
                    required={formData.nacionalidad === 'Otra'}
                  />
                  {errors.nacionalidadOtra && <p className="text-red-500 text-sm">{errors.nacionalidadOtra}</p>}
                </div>
              )}

              {/* Tipo de ID */}
              <div>
                <Label htmlFor="tipoID" value="Tipo de Identificación" />
                <Select
                  id="tipoID"
                  name="tipoID"
                  value={formData.tipoID}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Cédula">Cédula</option>
                  <option value="Pasaporte">Pasaporte</option>
                </Select>
                {errors.tipoID && <p className="text-red-500 text-sm">{errors.tipoID}</p>}
              </div>

              {/* Número de ID */}
              <div>
                <Label htmlFor="numeroID" value="Número de Identificación" />
                <TextInput
                  id="numeroID"
                  name="numeroID"
                  type="text"
                  value={formData.numeroID}
                  onChange={handleInputChange}
                  required
                />
                {errors.numeroID && <p className="text-red-500 text-sm">{errors.numeroID}</p>}
              </div>

              {/* Lugar de Nacimiento */}
              <div>
                <Label htmlFor="lugarNacimiento" value="Lugar de Nacimiento" />
                <Select
                  id="lugarNacimiento"
                  name="lugarNacimiento"
                  value={formData.lugarNacimiento}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                  <option value="Otra">Otro</option>
                </Select>
                {errors.lugarNacimiento && <p className="text-red-500 text-sm">{errors.lugarNacimiento}</p>}
              </div>

              {/* Lugar de Nacimiento Otra (condicional) */}
              {formData.lugarNacimiento === 'Otra' && (
                <div>
                  <Label htmlFor="lugarNacimientoOtra" value="Especifique Lugar de Nacimiento" />
                  <TextInput
                    id="lugarNacimientoOtra"
                    name="lugarNacimientoOtra"
                    type="text"
                    value={formData.lugarNacimientoOtra}
                    onChange={handleInputChange}
                    required={formData.lugarNacimiento === 'Otra'}
                  />
                  {errors.lugarNacimientoOtra && <p className="text-red-500 text-sm">{errors.lugarNacimientoOtra}</p>}
                </div>
              )}

              {/* Fecha de Nacimiento */}
              <div>
                <Label htmlFor="fechaNacimiento" value="Fecha de Nacimiento" />
                <TextInput
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={handleInputChange}
                  required
                />
                {errors.fechaNacimiento && <p className="text-red-500 text-sm">{errors.fechaNacimiento}</p>}
              </div>

              {/* Sexo */}
              <div className="flex flex-col gap-2">
                <Label value="Sexo" />
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Radio
                      id="sexo-masculino"
                      name="sexo"
                      value="Masculino"
                      checked={formData.sexo === 'Masculino'}
                      onChange={handleInputChange}
                    />
                    <Label htmlFor="sexo-masculino">Masculino</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio
                      id="sexo-femenino"
                      name="sexo"
                      value="Femenino"
                      checked={formData.sexo === 'Femenino'}
                      onChange={handleInputChange}
                    />
                    <Label htmlFor="sexo-femenino">Femenino</Label>
                  </div>
                </div>
                {errors.sexo && <p className="text-red-500 text-sm">{errors.sexo}</p>}
              </div>

              {/* Estado Civil */}
              <div>
                <Label htmlFor="estadoCivil" value="Estado Civil" />
                <Select
                  id="estadoCivil"
                  name="estadoCivil"
                  value={formData.estadoCivil}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Soltero">Soltero/a</option>
                  <option value="Casado">Casado/a</option>
                  <option value="Divorciado">Divorciado/a</option>
                  <option value="Viudo">Viudo/a</option>
                </Select>
                {errors.estadoCivil && <p className="text-red-500 text-sm">{errors.estadoCivil}</p>}
              </div>

              {/* Estatura */}
              <div>
                <Label htmlFor="estatura" value="Estatura (metros)" />
                <TextInput
                  id="estatura"
                  name="estatura"
                  type="text"
                  value={formData.estatura}
                  onChange={handleInputChange}
                  placeholder="Ej: 1.75"
                  required
                />
                {errors.estatura && <p className="text-red-500 text-sm">{errors.estatura}</p>}
              </div>

              {/* Peso */}
              <div>
                <Label htmlFor="peso" value="Peso (kg)" />
                <TextInput
                  id="peso"
                  name="peso"
                  type="text"
                  value={formData.peso}
                  onChange={handleInputChange}
                  placeholder="Ej: 70.5"
                  required
                />
                {errors.peso && <p className="text-red-500 text-sm">{errors.peso}</p>}
              </div>

              {/* Rol */}
              <div>
                <Label htmlFor="rol" value="Rol" />
                <Select
                  id="rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="administrador">Administrador</option>
                  <option value="usuario">Usuario</option>
                  {/* Agrega más roles si es necesario */}
                </Select>
                {errors.rol && <p className="text-red-500 text-sm">{errors.rol}</p>}
              </div>

              <div className="md:col-span-2 flex justify-end gap-4 mt-6">
                <Button color="gray" onClick={onClose}>
                  Cancelar
                </Button>
                <Button color="blue" type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal para mensajes de éxito/error del formulario */}
      <CustomModal
        show={showFormStatusModal}
        onClose={() => {
          setShowFormStatusModal(false);
          if (formStatusModalAction) {
            formStatusModalAction();
          }
        }}
        title={formStatusModalTitle}
        message={formStatusModalMessage}
        type={formStatusModalType}
      />
    </>
  );
}

// Wrapper para el router (este componente se encargaría de abrir el modal)
export const EditarUsuarioWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(true); // Controla la visibilidad del modal

  const handleCloseModal = () => {
    setOpenModal(false);
    navigate('/admin/dashboard/list-users'); // Redirige cuando el modal se cierra
  };

  const handleUserUpdated = () => {
    // Aquí podrías recargar la lista de usuarios o hacer otra acción
    console.log('Usuario actualizado en el wrapper!');
  };

  if (!id) {
    // Manejar el caso donde no hay ID, quizás redirigir o mostrar un error
    return <p className="text-red-500">Error: No se ha proporcionado un ID de usuario.</p>;
  }

  return (
    <EditarUsuario
      userId={id}
      showModal={openModal}
      onClose={handleCloseModal}
      onUserUpdated={handleUserUpdated}
    />
  );
};