
import FullLogo from "src/layouts/full/shared/logo/FullLogo";
// import AuthRegister from "../authforms/AuthRegister"; // Ya no es necesario si integramos aquí
import { Link, useNavigate } from "react-router"; // Asegúrate de usar react-router-dom si es lo que usas
import React, { useState } from "react";
import { supabase } from "../../../supabase/client"; // Importar el cliente de Supabase

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
    password: "", // NUEVO: Campo para contraseña
    confirmPassword: "", // NUEVO: Campo para confirmar contraseña
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
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl border border-black p-6 rounded">
        <div className="flex justify-center max-w-xs mx-auto mb-6"> {/* Contenedor para el logo MODIFICADO */}
          <FullLogo />
        </div>
        <h2 className="text-xl font-bold border-b border-black mb-4">
          1. Información Personal del Titular
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Apellidos y Nombres */}
          {/* ... (campos existentes: primerApellido, segundoApellido, nombres) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Primer Apellido</label>
              <input
                name="primerApellido"
                value={formData.primerApellido}
                onChange={handleChange}
                type="text"
                className="w-full border border-black px-2 py-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Segundo Apellido</label>
              <input
                name="segundoApellido"
                value={formData.segundoApellido}
                onChange={handleChange}
                type="text"
                className="w-full border border-black px-2 py-1"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Nombre(s)</label>
              <input
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                type="text"
                className="w-full border border-black px-2 py-1"
                required
              />
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="block text-sm font-medium">Correo Electrónico</label>
            <input
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              type="email"
              className="w-full border border-black px-2 py-1"
              required
            />
          </div>

          {/* --- INICIO: NUEVOS CAMPOS DE CONTRASEÑA --- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Contraseña</label>
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                className="w-full border border-black px-2 py-1"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Confirmar Contraseña</label>
              <input
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                type="password"
                className="w-full border border-black px-2 py-1"
                required
                minLength={6}
              />
            </div>
          </div>
          {/* --- FIN: NUEVOS CAMPOS DE CONTRASEÑA --- */}


          {/* Nacionalidad y Tipo ID */}
          {/* ... (campos existentes: nacionalidad, tipoID) ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Ajustado para mejor responsividad */}
            <div>
              <label className="block text-sm font-medium">Nacionalidad</label>
              <select
                name="nacionalidad"
                value={formData.nacionalidad}
                onChange={handleChange}
                className="w-full border border-black px-2 py-1"
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
                <option value="Panameña">Panameña</option>
                <option value="Paraguaya">Paraguaya</option>
                <option value="Otra">Otra</option>
              </select>
            </div>

            {formData.nacionalidad === "Otra" && (
              <div>
                <label className="block text-sm font-medium">Especifique nacionalidad</label>
                <input
                  name="nacionalidadOtra"
                  value={formData.nacionalidadOtra}
                  onChange={handleChange}
                  type="text"
                  className="w-full border border-black px-2 py-1"
                  required={formData.nacionalidad === "Otra"} // Requerido solo si "Otra" está seleccionado
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Tipo de Identificación</label>
              <select
                name="tipoID"
                value={formData.tipoID}
                onChange={handleChange}
                className="w-full border border-black px-2 py-1"
                required
              >
                <option value="">Seleccione</option>
                <option value="Cédula">Cédula</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
          </div>

          {/* Número ID */}
          {/* ... (campo existente: numeroID) ... */}
          <div>
            <label className="block text-sm font-medium">Número de Identificación</label>
            <input
              name="numeroID"
              value={formData.numeroID}
              onChange={handleChange}
              type="text"
              className="w-full border border-black px-2 py-1"
              required
            />
          </div>

          {/* Lugar y Fecha de Nacimiento */}
          {/* ... (campos existentes: lugarNacimiento, fechaNacimiento) ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Ajustado para mejor responsividad */}
            <div>
              <label className="block text-sm font-medium">Lugar de Nacimiento</label>
              <select
                name="lugarNacimiento"
                value={formData.lugarNacimiento}
                onChange={handleChange}
                className="w-full border border-black px-2 py-1"
                required
              >
                <option value="">Seleccione</option>
                <option value="Ecuador">Ecuador</option>
                {/* ... más opciones ... */}
                <option value="Otra">Otra</option>
              </select>
            </div>

            {formData.lugarNacimiento === "Otra" && (
              <div>
                <label className="block text-sm font-medium">Especifique lugar de nacimiento</label>
                <input
                  name="lugarNacimientoOtro"
                  value={formData.lugarNacimientoOtro}
                  onChange={handleChange}
                  type="text"
                  className="w-full border border-black px-2 py-1"
                  required={formData.lugarNacimiento === "Otra"} // Requerido solo si "Otra" está seleccionado
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Fecha de Nacimiento</label>
              <input
                name="fechaNacimiento"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                type="date"
                className="w-full border border-black px-2 py-1"
                required
              />
            </div>
          </div>

          {/* Sexo y Estado Civil */}
          {/* ... (campos existentes: sexo, estadoCivil) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Sexo</label>
              <select
                name="sexo"
                value={formData.sexo}
                onChange={handleChange}
                className="w-full border border-black px-2 py-1"
                required
              >
                <option value="">Seleccione</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Estado Civil</label>
              <select
                name="estadoCivil"
                value={formData.estadoCivil}
                onChange={handleChange}
                className="w-full border border-black px-2 py-1"
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
          {/* ... (campos existentes: estatura, peso) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Estatura (en cm)</label>
              <input
                name="estatura"
                value={formData.estatura}
                onChange={handleChange}
                type="text"
                className="w-full border border-black px-2 py-1"
                placeholder="Ej. 170"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Peso (en kg)</label>
              <input
                name="peso"
                value={formData.peso}
                onChange={handleChange}
                type="text"
                className="w-full border border-black px-2 py-1"
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

          {/* Botón y Link */}
          <div className="mt-6 flex justify-center">
            <button type="submit" className="bg-black text-white px-6 py-2 rounded">
              Registrarse
            </button>
          </div>

          <div className="flex gap-2 text-sm font-medium mt-4 items-center justify-center">
            <p>¿Ya tiene una cuenta?</p>
            <Link to="/auth/login" className="text-black underline">
              Ingrese
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
