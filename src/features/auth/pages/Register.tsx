import logo from 'src/assets/images/logos/logo-wrappixel.png';
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "../../../supabase/client"; // Asegúrate de que esta ruta sea correcta
import { Label, TextInput } from "flowbite-react";

const gradientStyle = {
  background: "linear-gradient(-45deg, #4A90E2, #333333, #A2D5C6, #FFFFFF)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  minHeight: "100vh",
};

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Nuevo estado de carga

  const [formData, setFormData] = useState({
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    segundoNombre: "",
    nacionalidad: "",
    nacionalidadOtra: "",
    tipoID: "",
    numeroID: "",
    lugarNacimiento: "",
    lugarNacimientoOtro: "",
    fechaNacimiento: "",
    sexo: "",
    estadoCivil: "",
    estatura: "",
    peso: "",
    correo: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Solo letras y espacios para nombres y apellidos
    if (["primerApellido", "segundoApellido", "primerNombre", "segundoNombre"].includes(name)) {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(value)) return;
      // No permitir solo espacios
      if (value.length > 0 && value.trim() === "") return;
    }

    // Solo números y máximo 10 dígitos para número de identificación
    if (name === "numeroID") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    // Solo números y punto decimal para estatura y peso
    if (["estatura", "peso"].includes(name)) {
      if (!/^[0-9.]*$/.test(value)) return;
    }

    setFormData((prev) => {
      const newState = { ...prev, [name]: value };
      if (name === "nacionalidad" && value !== "Otra") {
        newState.nacionalidadOtra = "";
      }
      if (name === "lugarNacimiento" && value !== "Otra") {
        newState.lugarNacimientoOtro = "";
      }
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true); // Iniciar carga

    // Validar si algún campo está vacío
    const requiredFields = [
      "primerApellido", "primerNombre", "nacionalidad", "tipoID", "numeroID",
      "lugarNacimiento", "fechaNacimiento", "sexo", "estadoCivil",
      "estatura", "peso", "correo", "password", "confirmPassword"
    ];

    for (const key of requiredFields) {
      const typedKey = key as keyof typeof formData;
      if (formData[typedKey].trim() === "") {
        if (typedKey === "nacionalidadOtra" && formData.nacionalidad !== "Otra") {
          continue;
        }
        if (typedKey === "lugarNacimientoOtro" && formData.lugarNacimiento !== "Otra") {
          continue;
        }

        if (typedKey === "nacionalidadOtra" && formData.nacionalidad === "Otra") {
            setError("Por favor, especifique la nacionalidad.");
            setLoading(false);
            return;
        }
        if (typedKey === "lugarNacimientoOtro" && formData.lugarNacimiento === "Otra") {
            setError("Por favor, especifique el lugar de nacimiento.");
            setLoading(false);
            return;
        }
        setError("Por favor, complete todos los campos requeridos.");
        setLoading(false);
        return;
      }
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    // Validación básica de formato de correo
    if (!/\S+@\S+\.\S+/.test(formData.correo)) {
        setError("Por favor, ingresa un correo electrónico válido.");
        setLoading(false);
        return;
    }

    try {
      // 1. Verificar si el número de identificación ya existe en 'profiles'
      const { data: existingIdProfiles, error: fetchIdError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('numero_identificacion', formData.numeroID);

      if (fetchIdError) {
        console.error("Error al verificar número de identificación existente:", fetchIdError);
        setError("Ocurrió un error al verificar el número de identificación. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      if (existingIdProfiles && existingIdProfiles.length > 0) {
        setError("Este número de identificación ya está registrado.");
        setLoading(false);
        return;
      }

      // 2. Proceder con el registro de autenticación en Supabase (auth.users)
      const full_name_combined = `${formData.primerNombre || ''} ${formData.segundoNombre || ''} ${formData.primerApellido || ''} ${formData.segundoApellido || ''}`.trim().replace(/\s\s+/g, ' ');

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.correo,
        password: formData.password,
        options: {
          data: {
            // **AQUÍ ES DONDE PASAMOS TODOS LOS DATOS A raw_user_meta_data**
            primer_apellido: formData.primerApellido,
            segundo_apellido: formData.segundoApellido,
            primer_nombre: formData.primerNombre,
            segundo_nombre: formData.segundoNombre,
            full_name: full_name_combined, // Ya lo tienes calculado, lo enviamos.
            nacionalidad: formData.nacionalidad === "Otra" ? formData.nacionalidadOtra : formData.nacionalidad,
            tipo_identificacion: formData.tipoID,
            numero_identificacion: formData.numeroID,
            lugar_nacimiento: formData.lugarNacimiento === "Otra" ? formData.lugarNacimientoOtro : formData.lugarNacimiento,
            fecha_nacimiento: formData.fechaNacimiento,
            sexo: formData.sexo,
            estado_civil: formData.estadoCivil,
            estatura: parseFloat(formData.estatura) || null, // Convertir a número, o null si no es válido
            peso: parseFloat(formData.peso) || null, // Convertir a número, o null si no es válido
            role: 'client', // Importante: Envía el rol desde el frontend
          },
          emailRedirectTo: `${window.location.origin}/dashboard` // URL a la que redirigir después de la confirmación
        }
      });

      if (signUpError) {
        console.error("Error al registrar usuario:", signUpError.message);
        if (signUpError.status === 400 && /already registered|duplicate/i.test(signUpError.message)) {
          setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
        } else if (signUpError.message.includes("Password should be at least 6 characters")) {
          setError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setError(`Error al registrar usuario: ${signUpError.message}`);
        }
        setLoading(false);
        return;
      }

      // Con esta estrategia, tu trigger handle_new_user se encargará de
      // la inserción en 'profiles' y 'clients'.
      // Por lo tanto, no necesitamos las siguientes llamadas a la base de datos desde el frontend:
      // - supabase.from('profiles').update(...)
      // - supabase.from('clients').insert(...)

      // Verificamos si Supabase Auth retornó un usuario. Si la confirmación de email está activa,
      // es posible que user sea null aquí, pero el registro igual se inició.
      const userId = signUpData.user?.id;

      if (!userId) {
        // Este escenario significa que Supabase Auth inició el registro (ej. envió un email de confirmación),
        // pero no devolvió un usuario activo inmediatamente.
        setSuccess("Registro iniciado. Por favor, revisa tu correo electrónico para verificar tu cuenta y completar tu perfil.");
        setLoading(false);
        return;
      }

      // Si el usuario ya existe pero no confirmado, o si ya se envió un correo,
      // Supabase.auth.signUp devolverá un 'user' en data.user si ya estaba confirmado,
      // o null si requiere confirmación y es un nuevo registro/ya fue enviado el email.

      // Si llegamos hasta aquí y hay un userId, significa que el registro en auth.users
      // fue exitoso y el trigger se encargó de las inserciones en profiles y clients.
      setSuccess("¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta. Serás redirigido a la página de inicio.");
      setTimeout(() => {
        navigate('/auth/login');
      }, 6000);

    } catch (e: any) {
      console.error("Excepción durante el registro:", e);
      setError(`Ocurrió un error inesperado: ${e.message}`);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <div style={gradientStyle} className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="h-50" />
        </div>
        <div className="bg-white rounded-2xl shadow-lg px-6 py-10 md:px-12 md:py-14">
          <h2 className="text-2xl font-bold text-center mb-8 border-b border-gray-200 pb-4">
            Información personal del titular
          </h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="primerApellido" value="Primer Apellido" className="font-semibold text-gray-700" />
                <TextInput
                  id="primerApellido"
                  name="primerApellido"
                  value={formData.primerApellido}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="segundoApellido" value="Segundo Apellido" className="font-semibold text-gray-700" />
                <TextInput
                  id="segundoApellido"
                  name="segundoApellido"
                  value={formData.segundoApellido}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="primerNombre" value="Primer Nombre" className="font-semibold text-gray-700" />
                <TextInput
                  id="primerNombre"
                  name="primerNombre"
                  value={formData.primerNombre}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="segundoNombre" value="Segundo Nombre" className="font-semibold text-gray-700" />
                <TextInput
                  id="segundoNombre"
                  name="segundoNombre"
                  value={formData.segundoNombre}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="correo" value="Correo Electrónico" className="font-semibold text-gray-700" />
              <TextInput
                id="correo"
                name="correo"
                type="email"
                value={formData.correo}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="password" value="Contraseña" className="font-semibold text-gray-700" />
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" value="Confirmar Contraseña" className="font-semibold text-gray-700" />
                <TextInput
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Nacionalidad y Tipo ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nacionalidad" value="Nacionalidad" className="font-semibold text-gray-700" />
                <select
                  name="nacionalidad"
                  value={formData.nacionalidad}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Panameña">Panameña</option>
                  <option value="Colombiana">Colombiana</option>
                  <option value="Venezolana">Venezolana</option>
                  <option value="Brasileña">Brasileña</option>
                  <option value="Peruana">Peruana</option>
                  <option value="Estadounidense">Estadounidense</option>
                  <option value="Canadiense">Canadiense</option>
                  <option value="Española">Española</option>
                  <option value="Italiana">Italiana</option>
                  <option value="Francesa">Francesa</option>
                  <option value="Alemana">Alemana</option>
                  <option value="Británica">Británica</option>
                  <option value="Suiza">Suiza</option>
                  <option value="Australiana">Australiana</option>
                  <option value="Mexicana">Mexicana</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Chilena">Chilena</option>
                  <option value="Uruguaya">Uruguaya</option>
                  <option value="Paraguaya">Paraguaya</option>
                  <option value="Boliviana">Boliviana</option>
                  <option value="Cubana">Cubana</option>
                  <option value="Dominicana">Dominicana</option>
                  <option value="Hondureña">Hondureña</option>
                  <option value="Guatemalteca">Guatemalteca</option>
                  <option value="Salvadoreña">Salvadoreña</option>
                  <option value="Nicaragüense">Nicaragüense</option>
                  <option value="Costarricense">Costarricense</option>
                  <option value="Ecuatoriana">Ecuatoriana</option>
                  <option value="Otra">Otra</option>
                </select>
                {formData.nacionalidad === "Otra" && (
                  <TextInput
                    name="nacionalidadOtra"
                    value={formData.nacionalidadOtra}
                    onChange={handleChange}
                    type="text"
                    placeholder="Especifique nacionalidad"
                    className="mt-2"
                    required
                  />
                )}
              </div>
              <div>
                <Label htmlFor="tipoID" value="Tipo de Identificación" className="font-semibold text-gray-700" />
                <select
                  name="tipoID"
                  value={formData.tipoID}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Cédula">Cédula</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
            </div>

            {/* Número de Identificación */}
            <div>
              <Label htmlFor="numeroID" value="Número de Identificación" className="font-semibold text-gray-700" />
              <TextInput
                id="numeroID"
                name="numeroID"
                value={formData.numeroID}
                onChange={handleChange}
                required
                maxLength={10}
                className="mt-1"
              />
            </div>

            {/* Lugar y Fecha de Nacimiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="lugarNacimiento" value="Lugar de Nacimiento" className="font-semibold text-gray-700" />
                <select
                  name="lugarNacimiento"
                  value={formData.lugarNacimiento}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Ecuador">Ecuador</option>
                  <option value="Panamá">Panamá</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Venezuela">Venezuela</option>
                  <option value="Brasil">Brasil</option>
                  <option value="Perú">Perú</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Canadá">Canadá</option>
                  <option value="España">España</option>
                  <option value="Italia">Italia</option>
                  <option value="Francia">Francia</option>
                  <option value="Alemania">Alemania</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Suiza">Suiza</option>
                  <option value="Australia">Australia</option>
                  <option value="México">México</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Chile">Chile</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Paraguay">Paraguay</option>
                  <option value="Bolivia">Bolivia</option>
                  <option value="Cuba">Cuba</option>
                  <option value="República Dominicana">República Dominicana</option>
                  <option value="Honduras">Honduras</option>
                  <option value="Guatemala">Guatemala</option>
                  <option value="El Salvador">El Salvador</option>
                  <option value="Nicaragua">Nicaragua</option>
                  <option value="Costa Rica">Costa Rica</option>
                  <option value="Otra">Otra</option>
                </select>
                {formData.lugarNacimiento === "Otra" && (
                  <TextInput
                    name="lugarNacimientoOtro"
                    value={formData.lugarNacimientoOtro}
                    onChange={handleChange}
                    type="text"
                    placeholder="Especifique lugar de nacimiento"
                    className="mt-2"
                    required
                  />
                )}
              </div>
              <div>
                <Label htmlFor="fechaNacimiento" value="Fecha de Nacimiento" className="font-semibold text-gray-700" />
                <TextInput
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  type="date"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* Sexo y Estado Civil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="sexo" value="Sexo" className="font-semibold text-gray-700" />
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <Label htmlFor="estadoCivil" value="Estado Civil" className="font-semibold text-gray-700" />
                <select
                  name="estadoCivil"
                  value={formData.estadoCivil}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione</option>
                  <option value="Soltero">Soltero</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viudo">Viudo</option>
                  <option value="U/Libre">U/Libre</option>
                </select>
              </div>
            </div>

            {/* Estatura y Peso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="estatura" value="Estatura (en cm)" className="font-semibold text-gray-700" />
                <TextInput
                  id="estatura"
                  name="estatura"
                  value={formData.estatura}
                  onChange={handleChange}
                  placeholder="Ej. 170"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="peso" value="Peso (en kg)" className="font-semibold text-gray-700" />
                <TextInput
                  id="peso"
                  name="peso"
                  value={formData.peso}
                  onChange={handleChange}
                  placeholder="Ej. 65.5"
                  required
                  className="mt-1"
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

            {/* Botón y Link */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded transition"
                disabled={loading} // Deshabilitar el botón durante la carga
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>
              <div className="flex gap-2 text-sm font-medium items-center justify-center">
                <p>¿Ya tiene una cuenta?</p>
                <Link to="/auth/login" className="text-blue-700 underline">
                  Ingrese
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;