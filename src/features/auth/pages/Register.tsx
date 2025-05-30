import FullLogo from "src/layouts/full/shared/logo/FullLogo";
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

  const [formData, setFormData] = useState({
    primerApellido: "",
    segundoApellido: "",
    nombres: "",
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

    if (["primerApellido", "segundoApellido", "nombres"].includes(name)) {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(value)) return;
    }

    if (name === "numeroID") {
      if (!/^\d*$/.test(value)) return;
    }

    if (["estatura", "peso"].includes(name)) {
      if (!/^[0-9.]*$/.test(value)) return;
    }

    setFormData((prev) => {
      const newState = { ...prev, [name]: value };
      // Si se cambia Nacionalidad y no es "Otra", limpiar nacionalidadOtra
      if (name === "nacionalidad" && value !== "Otra") {
        newState.nacionalidadOtra = "";
      }
      // Si se cambia Lugar de Nacimiento y no es "Otra", limpiar lugarNacimientoOtro
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

    // Validar si algún campo está vacío
    for (const key in formData) {
      const typedKey = key as keyof typeof formData;
      // Omitir la validación de campos "Otra" si la opción principal no es "Otra"
      if (typedKey === "nacionalidadOtra" && formData.nacionalidad !== "Otra") {
        continue;
      }
      if (typedKey === "lugarNacimientoOtro" && formData.lugarNacimiento !== "Otra") {
        continue;
      }

      if (formData[typedKey].trim() === "") {
        // Personalizar mensaje si es un campo "Otra" requerido
        if (typedKey === "nacionalidadOtra" && formData.nacionalidad === "Otra") {
            setError("Por favor, especifique la nacionalidad.");
            return;
        }
        if (typedKey === "lugarNacimientoOtro" && formData.lugarNacimiento === "Otra") {
            setError("Por favor, especifique el lugar de nacimiento.");
            return;
        }
        setError("Por favor, complete todos los campos requeridos.");
        return;
      }
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Validación básica de formato de correo
    if (!/\S+@\S+\.\S+/.test(formData.correo)) {
        setError("Por favor, ingresa un correo electrónico válido.");
        return;
    }

    // Proceder con el registro
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.correo,
      password: formData.password,
      options: {
        data: {
          nombres: formData.nombres,
          primer_apellido: formData.primerApellido,
          segundo_apellido: formData.segundoApellido,
          // ... otros datos que quieras pasar
        }
      }
    });

    if (signUpError) {
      console.error("Error al registrar usuario:", signUpError.message);
      if (signUpError.status === 400 && /already registered|duplicate/i.test(signUpError.message)) {
        setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
      } else if (signUpError.message.includes("Password should be at least 6 characters")) {
        setError("La contraseña debe tener al menos 6 caracteres.");
      }
      else {
        setError(`Error al registrar usuario: ${signUpError.message}`);
      }
    } else if (signUpData.user) {
      setSuccess("¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta.");
      console.log("Usuario registrado:", signUpData.user);

      // AQUÍ: Lógica para guardar el resto de formData en tu tabla de perfiles
      // Deberás crear una tabla en Supabase (ej: 'profiles') con columnas para
      // user_id (FK a auth.users.id), primerApellido, segundoApellido, nombres, etc.
      // Ejemplo:
      
      const profileDataToInsert = {
        user_id: signUpData.user.id,
        primer_apellido: formData.primerApellido,
        segundo_apellido: formData.segundoApellido,
        nombres: formData.nombres,
        nacionalidad: formData.nacionalidad === "Otra" ? formData.nacionalidadOtra : formData.nacionalidad,
        tipo_identificacion: formData.tipoID,
        numero_identificacion: formData.numeroID,
        lugar_nacimiento: formData.lugarNacimiento === "Otra" ? formData.lugarNacimientoOtro : formData.lugarNacimiento,
        fecha_nacimiento: formData.fechaNacimiento,
        sexo: formData.sexo,
        estado_civil: formData.estadoCivil,
        estatura: parseFloat(formData.estatura) || null,
        peso: parseFloat(formData.peso) || null,
      };

      const { error: profileError } = await supabase
        .from('profiles') // Reemplaza 'profiles' con el nombre de tu tabla
        .insert(profileDataToInsert);

      if (profileError) {
        console.error("Error al guardar perfil:", profileError);
        setError(`Usuario registrado, pero hubo un error al guardar los datos del perfil: ${profileError.message}`);
      } else {
        console.log("Perfil guardado exitosamente");
        // Opcional: Redirigir al login o a una página de "revisa tu correo"
        // setTimeout(() => navigate('/auth/login'), 5000); // Ejemplo de redirección
      }
      
      // Por ahora, limpiamos el formulario (opcional)
      // setFormData({ /* ...resetear a valores iniciales... */ });
    } else {
        // Caso inesperado donde no hay error pero tampoco usuario (ej. confirmación manual habilitada y no hay sesión)
        setSuccess("Registro iniciado. Por favor, revisa tu correo electrónico para completar el proceso.");
    }
  };

  return (
    <div style={gradientStyle} className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <FullLogo />
          <p className="text-black text-sm font-medium text-center my-3">Nombre Aseguradora</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg px-6 py-10 md:px-12 md:py-14">
          <h2 className="text-2xl font-bold text-center mb-8 border-b border-gray-200 pb-4">
            1. Información Personal del Titular
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
            <div>
              <Label htmlFor="nombres" value="Nombre(s)" className="font-semibold text-gray-700" />
              <TextInput
                id="nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                required
                className="mt-1"
              />
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
                  <option value="Brazileña">Brazileña</option>
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
                  <option value="Otra">Otra</option>
                </select>
                {formData.nacionalidad === "Otra" && (
                  <input
                    name="nacionalidadOtra"
                    value={formData.nacionalidadOtra}
                    onChange={handleChange}
                    type="text"
                    placeholder="Especifique nacionalidad"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  {/* ...más opciones... */}
                  <option value="Otra">Otra</option>
                </select>
                {formData.lugarNacimiento === "Otra" && (
                  <input
                    name="lugarNacimientoOtro"
                    value={formData.lugarNacimientoOtro}
                    onChange={handleChange}
                    type="text"
                    placeholder="Especifique lugar de nacimiento"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                )}
              </div>
              <div>
                <Label htmlFor="fechaNacimiento" value="Fecha de Nacimiento" className="font-semibold text-gray-700" />
                <input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              >
                Registrarse
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
