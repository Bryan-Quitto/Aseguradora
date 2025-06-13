import logo from 'src/assets/images/logos/logo-wrappixel.png';
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "../../../supabase/client";
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
  const [loading, setLoading] = useState<boolean>(false);

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

  // Función para limpiar espacios en blanco al inicio/final y entre palabras
  const limpiarEspacios = (valor: string) =>
    valor.replace(/\s+/g, ' ').trim();

  // Función para permitir solo letras y solo una palabra (sin espacios)
  const soloUnaPalabra = (valor: string) => {
    let limpio = limpiarEspacios(valor.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ]/g, ''));
    return limpio.split(' ')[0] || '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    // Solo letras y solo una palabra para nombres y apellidos
    if (["primerApellido", "segundoApellido", "primerNombre", "segundoNombre"].includes(name)) {
      newValue = soloUnaPalabra(value);
    }
    // Solo números y máximo 10 dígitos para número de identificación
    else if (name === "numeroID") {
      newValue = value.replace(/\D/g, '').slice(0, 10);
    }
    // Solo números y punto decimal para estatura y peso
    else if (["estatura", "peso"].includes(name)) {
      newValue = value.replace(/[^0-9.]/g, '');
    }
    // Validación para fecha de nacimiento: no permitir fechas futuras
    else if (name === "fechaNacimiento") {
      const hoy = new Date().toISOString().split('T')[0];
      if (value > hoy) {
        setError("La fecha de nacimiento no puede ser mayor a la fecha actual.");
        return;
      }
      setError(null);
      newValue = value;
    }
    // Para los demás campos, limpiar espacios al inicio y final
    else {
      newValue = limpiarEspacios(value);
    }

    setFormData((prev) => {
      const newState = { ...prev, [name]: newValue };
      if (name === "nacionalidad" && newValue !== "Otra") {
        newState.nacionalidadOtra = "";
      }
      if (name === "lugarNacimiento" && newValue !== "Otra") {
        newState.lugarNacimientoOtro = "";
      }
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

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

    // Validar que la fecha de nacimiento no sea futura
    const hoy = new Date().toISOString().split('T')[0];
    if (formData.fechaNacimiento > hoy) {
      setError("La fecha de nacimiento no puede ser mayor a la fecha actual.");
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
            // AQUÍ ES DONDE PASAMOS TODOS LOS DATOS A raw_user_meta_data
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
          emailRedirectTo: `${window.location.origin}/client/dashboard` // URL a la que redirigir después de la confirmación
        }
      });

      if (signUpError) {
        console.error("Error al registrar usuario:", signUpError.message);
        // Si el correo ya está registrado y confirmado, Supabase devolverá un error 400.
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

      // Si signUpData.user es null, significa que el usuario necesita confirmación por email,
      // o que el email ya existía pero no estaba confirmado y se ha reenviado el email de confirmación.
      const userId = signUpData.user?.id;

      if (!userId) {
        setSuccess("Registro iniciado. Por favor, revisa tu correo electrónico para verificar tu cuenta y completar tu perfil.");
        setLoading(false);
        return;
      }

      // Este bloque se ejecutaría si la confirmación de email estuviera deshabilitada en Supabase
      // o si, por alguna razón, el usuario es confirmado instantáneamente al registrarse.
      // En un flujo típico con confirmación de email, el usuario_id solo estaría disponible
      // después de que el usuario haga clic en el enlace de verificación del correo electrónico.
      setSuccess("¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta. Serás redirigido a la página de inicio.");
      setTimeout(() => {
        navigate('/auth/login');
      }, 6000);

    } catch (e: any) {
      console.error("Excepción durante el registro:", e);
      setError(`Ocurrió un error inesperado: ${e.message}`);
    } finally {
      setLoading(false); // Finalizar carga
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
                  max={new Date().toISOString().split('T')[0]} // Restringe fechas futuras
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