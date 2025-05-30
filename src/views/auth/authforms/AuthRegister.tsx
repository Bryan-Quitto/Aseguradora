import { Button, Label, TextInput, Select } from "flowbite-react";
import { supabase } from "../../../supabase/client.ts";
import { useState } from "react";

const AuthRegister = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manejo de estado con un solo objeto formData
  const [formData, setFormData] = useState({
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    segundoNombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    nacionalidad: "Paraguay", // Valor por defecto
    tipoIdentificacion: "Cédula", // Valor por defecto
    numeroIdentificacion: "",
    lugarNacimiento: "Ecuador", // Valor por defecto
    fechaNacimiento: "",
    sexo: "Masculino", // Valor por defecto
    estadoCivil: "Soltero", // Valor por defecto
    estatura: "",
    peso: "",
  });

  // Array de nacionalidades para reutilizar
  const NATIONALITIES = [
    "Panameña", "Colombiana", "Venezolana", "Brasileña", "Peruana", "Estadounidense",
    "Canadiense", "Española", "Italiana", "Francesa", "Alemana", "Británica",
    "Suiza", "Australiana", "Mexicana", "Argentina", "Chilena", "Uruguaya",
    "Paraguaya", "Boliviana", "Cubana", "Dominicana", "Hondureña", "Guatemalteca",
    "Salvadoreña", "Nicaragüense", "Costarricense", "Ecuatoriana"
  ];

  // Array de países derivado de NATIONALITIES
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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Validaciones en tiempo real para nombres y apellidos (solo letras y espacios)
    if (["primerApellido", "segundoApellido", "primerNombre", "segundoNombre"].includes(name)) {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(value)) return;
    }

    // Validación en tiempo real para número de identificación (solo números)
    if (name === "numeroIdentificacion") {
      if (!/^\d*$/.test(value)) return;
    }

    // Validación en tiempo real para estatura y peso (números y un punto decimal)
    if (["estatura", "peso"].includes(name)) {
      if (!/^[0-9.]*$/.test(value) || (value.match(/\./g) || []).length > 1) return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    // Validación de campos requeridos
    const requiredFields = [
      "primerApellido", "primerNombre", "email", "password", "confirmPassword",
      "nacionalidad", "tipoIdentificacion", "numeroIdentificacion", "lugarNacimiento",
      "fechaNacimiento", "sexo", "estadoCivil", "estatura", "peso"
    ];

    for (const key of requiredFields) {
      const typedKey = key as keyof typeof formData;
      if (formData[typedKey].toString().trim() === "") {
        setError("Por favor, completa todos los campos requeridos.");
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!/^\d+$/.test(formData.numeroIdentificacion)) {
      setError("El número de identificación solo debe contener números.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaNacimiento)) {
      setError("Por favor, ingresa una fecha de nacimiento válida en formato AAAA-MM-DD.");
      return;
    }
    if (isNaN(parseFloat(formData.estatura)) || isNaN(parseFloat(formData.peso))) {
      setError("Estatura y Peso deben ser números válidos.");
      return;
    }

    // Verificación de perfil existente por email o número de identificación
    try {
      const { data: existingProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id') // Selecciona user_id, no id, ya que id no existe
        .or(`email.eq.${formData.email},numero_identificacion.eq.${formData.numeroIdentificacion}`);

      if (fetchError) {
        console.error("Error al verificar perfil existente:", fetchError);
        setError("Ocurrió un error al verificar el perfil. Intenta de nuevo.");
        return;
      }
      if (existingProfiles && existingProfiles.length > 0) {
        setError("Este correo o número de identificación ya está registrado. Por favor, inicia sesión.");
        return;
      }
    } catch (e) {
      console.error("Excepción al verificar perfil existente:", e);
      setError("Ocurrió una excepción al verificar el perfil. Intenta de nuevo.");
      return;
    }

    // Registro en Auth
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            primer_nombre: formData.primerNombre,
            segundo_nombre: formData.segundoNombre,
            primer_apellido: formData.primerApellido,
            segundo_apellido: formData.segundoApellido,
            nacionalidad: formData.nacionalidad,
            tipo_identificacion: formData.tipoIdentificacion,
            numero_identificacion: formData.numeroIdentificacion,
            lugar_nacimiento: formData.lugarNacimiento,
            fecha_nacimiento: formData.fechaNacimiento,
            sexo: formData.sexo,
            estado_civil: formData.estadoCivil,
            estatura: parseFloat(formData.estatura),
            peso: parseFloat(formData.peso),
            role: 'client' // Asegúrate de que este rol coincida con el que el trigger inserta
          }
        }
      });

      if (signUpError) {
        console.error("Error al registrar usuario en Auth:", signUpError.message);
        if (signUpError.status === 400 && /already registered|duplicate/i.test(signUpError.message)) {
          setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
        } else if (signUpError.message.includes("Password should be at least 6 characters")) {
          setError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setError(`Error al registrar usuario: ${signUpError.message}`);
        }
        return; // Detener la ejecución si hay un error de signUp
      }

      if (data.user) {
        const userId = data.user.id;
        const userEmail = data.user.email!;
        const fullName = `${formData.primerNombre} ${formData.segundoNombre ? formData.segundoNombre + ' ' : ''}${formData.primerApellido} ${formData.segundoApellido}`;

        // Actualizar en profiles (cambiado de insert a update)
        // El trigger handle_new_user ya creó la fila, ahora la actualizamos
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            primer_apellido: formData.primerApellido,
            segundo_apellido: formData.segundoApellido,
            primer_nombre: formData.primerNombre,
            segundo_nombre: formData.segundoNombre,
            nombres: `${formData.primerNombre} ${formData.segundoNombre || ''}`.trim(), // Asegurarse de que 'nombres' se construya correctamente
            full_name: fullName,
            email: userEmail,
            nacionalidad: formData.nacionalidad,
            tipo_identificacion: formData.tipoIdentificacion,
            numero_identificacion: formData.numeroIdentificacion,
            lugar_nacimiento: formData.lugarNacimiento,
            fecha_nacimiento: formData.fechaNacimiento,
            sexo: formData.sexo,
            estado_civil: formData.estadoCivil,
            estatura: parseFloat(formData.estatura) || null, // Usar || null para manejar NaN
            peso: parseFloat(formData.peso) || null, // Usar || null para manejar NaN
            role: 'client'
          })
          .eq('user_id', userId); // Condición para actualizar la fila correcta

        if (updateError) {
          console.error("Error al actualizar perfil:", updateError);
          setError(`Usuario registrado, pero hubo un error al guardar los datos del perfil: ${updateError.message}`);
        } else {
          setSuccess("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
        }
      } else {
        // Esto se ejecuta si signUp no devuelve un usuario pero tampoco un error (ej. necesita verificación de email)
        setSuccess("Registro iniciado. Por favor, revisa tu correo electrónico para completar el proceso.");
      }
    } catch (e) {
      console.error("Excepción inesperada durante el proceso de registro:", e);
      setError("Ocurrió una excepción inesperada durante el registro.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 overflow-x-auto">
      <form onSubmit={handleSubmit} className="min-w-[700px] md:min-w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="primerApellido" value="Primer Apellido" />
            </div>
            <TextInput
              id="primerApellido"
              name="primerApellido"
              value={formData.primerApellido}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="segundoApellido" value="Segundo Apellido" />
            </div>
            <TextInput
              id="segundoApellido"
              name="segundoApellido"
              value={formData.segundoApellido}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="primerNombre" value="Primer Nombre" />
            </div>
            <TextInput
              id="primerNombre"
              name="primerNombre"
              value={formData.primerNombre}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="segundoNombre" value="Segundo Nombre" />
            </div>
            <TextInput
              id="segundoNombre"
              name="segundoNombre"
              value={formData.segundoNombre}
              onChange={handleChange}
            />
          </div>
        </div>
        
        {/* Correo */}
        <div>
          <div className="mb-2 block">
            <Label htmlFor="email" value="Correo Electrónico" />
          </div>
          <TextInput
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Contraseñas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="password" value="Contraseña" />
            </div>
            <TextInput
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="confirmPassword" value="Confirmar Contraseña" />
            </div>
            <TextInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
        </div>

        {/* Nacionalidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Nacionalidad</label>
            <Select
              name="nacionalidad"
              value={formData.nacionalidad}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione</option>
              {NATIONALITIES.map((nat) => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </Select>
          </div>
          
          {/* Tipo de Identificación */}
          <div>
            <label className="block text-sm font-medium">Tipo de Identificación</label>
            <Select
              name="tipoIdentificacion"
              value={formData.tipoIdentificacion}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione</option>
              <option value="Cédula">Cédula</option>
              <option value="Pasaporte">Pasaporte</option>
            </Select>
          </div>
        </div>

        {/* Número ID */}
        <div>
          <label className="block text-sm font-medium">Número de Identificación</label>
          <TextInput
            name="numeroIdentificacion"
            value={formData.numeroIdentificacion}
            onChange={handleChange}
            type="text"
            required
          />
        </div>

        {/* Lugar y Fecha de Nacimiento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Lugar de Nacimiento</label>
            <Select
              name="lugarNacimiento"
              value={formData.lugarNacimiento}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione</option>
              {COUNTRIES.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium">Fecha de Nacimiento</label>
            <TextInput
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              type="date"
              required
            />
          </div>
        </div>

        {/* Sexo y Estado Civil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Sexo</label>
            <Select
              name="sexo"
              value={formData.sexo}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium">Estado Civil</label>
            <Select
              name="estadoCivil"
              value={formData.estadoCivil}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione</option>
              <option value="Soltero">Soltero</option>
              <option value="Casado">Casado</option>
              <option value="Divorciado">Divorciado</option>
              <option value="Viudo">Viudo</option>
              <option value="U/Libre">U/Libre</option>
            </Select>
          </div>
        </div>

        {/* Estatura y Peso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Estatura (en cm)</label>
            <TextInput
              name="estatura"
              value={formData.estatura}
              onChange={handleChange}
              type="text"
              placeholder="Ej. 170"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Peso (en kg)</label>
            <TextInput
              name="peso"
              value={formData.peso}
              onChange={handleChange}
              type="text"
              placeholder="Ej. 65.5"
              required
            />
          </div>
        </div>

        {/* Mensajes de error/éxito */}
        {error && (
          <div className="text-red-500 text-sm mt-4 p-2 bg-red-100 border border-red-500 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-500 text-sm mt-4 p-2 bg-green-100 border border-green-500 rounded">
            {success}
          </div>
        )}

        {/* Botón */}
        <Button color={'primary'} type="submit" className="w-full mt-6">Registrarse</Button>
      </form>
    </div>
  );
};

export default AuthRegister;
