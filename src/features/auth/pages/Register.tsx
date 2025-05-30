import FullLogo from "src/layouts/full/shared/logo/FullLogo";
import { Link } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "../../../supabase/client";
import { Label, TextInput, Select, Button } from "flowbite-react";

const gradientStyle = {
  background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  height: "100vh"
};

const NATIONALITIES = [
  "Panameña", "Colombiana", "Venezolana", "Brasileña", "Peruana", "Estadounidense",
  "Canadiense", "Española", "Italiana", "Francesa", "Alemana", "Británica",
  "Suiza", "Australiana", "Mexicana", "Argentina", "Chilena", "Uruguaya",
  "Paraguaya", "Boliviana", "Cubana", "Dominicana", "Hondureña", "Guatemalteca",
  "Salvadoreña", "Nicaragüense", "Costarricense", "Ecuatoriana"
];

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

const Register = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    if (["primerApellido", "segundoApellido", "primerNombre", "segundoNombre"].includes(name)) {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(value)) return;
    }

    if (name === "numeroID") {
      if (!/^\d*$/.test(value)) return;
    }

    if (["estatura", "peso"].includes(name)) {
      if (!/^[0-9.]*$/.test(value) || (value.match(/\./g) || []).length > 1) return;
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

    const requiredFields = [
      "primerApellido", "primerNombre", "correo", "password", "confirmPassword",
      "nacionalidad", "tipoID", "numeroID", "lugarNacimiento", "fechaNacimiento", "sexo",
      "estadoCivil", "estatura", "peso"
    ];

    for (const key of requiredFields) {
      const typedKey = key as keyof typeof formData;
      if (formData[typedKey].toString().trim() === "") {
        if (typedKey === "nacionalidadOtra" && formData.nacionalidad !== "Otra") continue;
        if (typedKey === "lugarNacimientoOtro" && formData.lugarNacimiento !== "Otra") continue;

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

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.correo)) {
        setError("Por favor, ingresa un correo electrónico válido.");
        return;
    }

    // Verificación de número de identificación existente en la tabla 'profiles'
    try {
      const { data: existingIdProfiles, error: fetchIdError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('numero_identificacion', formData.numeroID);

      if (fetchIdError) {
        console.error("Error al verificar número de identificación existente:", fetchIdError);
        setError("Ocurrió un error al verificar el número de identificación. Intenta de nuevo.");
        return;
      }
      if (existingIdProfiles && existingIdProfiles.length > 0) {
        setError("Este número de identificación ya está registrado.");
        return;
      }
    } catch (e) {
      console.error("Excepción al verificar número de identificación existente:", e);
      setError("Ocurrió una excepción al verificar el número de identificación. Intenta de nuevo.");
      return;
    }

    // Registro en Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.correo,
      password: formData.password,
      // Los datos del perfil se enviarán aquí para que el trigger los use
      options: {
        data: {
          primer_nombre: formData.primerNombre,
          segundo_nombre: formData.segundoNombre,
          primer_apellido: formData.primerApellido,
          segundo_apellido: formData.segundoApellido,
          nacionalidad: formData.nacionalidad === "Otra" ? formData.nacionalidadOtra : formData.nacionalidad,
          tipo_identificacion: formData.tipoID,
          numero_identificacion: formData.numeroID,
          lugar_nacimiento: formData.lugarNacimiento === "Otra" ? formData.lugarNacimientoOtro : formData.lugarNacimiento,
          fecha_nacimiento: formData.fechaNacimiento,
          sexo: formData.sexo,
          estado_civil: formData.estadoCivil,
          estatura: parseFloat(formData.estatura),
          peso: parseFloat(formData.peso),
          role: 'client', // Rol por defecto para nuevos usuarios
        }
      }
    });

    if (signUpError) {
      console.error("Error al registrar usuario en Auth:", signUpError.message);
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

      const userId = signUpData.user.id;
      const userEmail = signUpData.user.email!;
      const fullName = `${formData.primerNombre} ${formData.segundoNombre || ''} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim();

      // **** CAMBIO CLAVE: USAR UPSERT EN LUGAR DE INSERT/UPDATE ****
      // Esto insertará la fila si no existe (si el trigger no la creó)
      // o la actualizará si ya existe (si el trigger ya la creó).
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId, // CLAVE: Se necesita el user_id para el upsert por PK
          primer_apellido: formData.primerApellido,
          segundo_apellido: formData.segundoApellido,
          // 'nombres' fue eliminada de la DB, así que la quitamos del payload
          full_name: fullName,
          email: userEmail,
          primer_nombre: formData.primerNombre,
          segundo_nombre: formData.segundoNombre,
          nacionalidad: formData.nacionalidad === "Otra" ? formData.nacionalidadOtra : formData.nacionalidad,
          tipo_identificacion: formData.tipoID,
          numero_identificacion: formData.numeroID,
          lugar_nacimiento: formData.lugarNacimiento === "Otra" ? formData.lugarNacimientoOtro : formData.lugarNacimiento,
          fecha_nacimiento: formData.fechaNacimiento,
          sexo: formData.sexo,
          estado_civil: formData.estadoCivil,
          estatura: parseFloat(formData.estatura) || null,
          peso: parseFloat(formData.peso) || null,
          role: 'client', // Rol por defecto para nuevos usuarios
        });

      if (profileError) {
        console.error("Error al guardar/actualizar perfil:", profileError);
        setError(`Usuario registrado, pero hubo un error al guardar los datos del perfil: ${profileError.message}`);
      } else {
        console.log("Perfil guardado/actualizado exitosamente");
      }
    } else {
        setSuccess("Registro iniciado. Por favor, revisa tu correo electrónico para completar el proceso.");
    }
  };

  return (
    <div style={gradientStyle} className="bg-white relative h-screen py-20 flex justify-center items-center overflow-auto px-4">
      <div className="flex flex-col gap-2 p-0 w-full absolute top-0 left-0 right-0">
        <div className="mx-auto mt-5">
          <FullLogo />
          <p className="text-black block text-sm font-medium text-center my-3">Nombre Aseguradora</p>
        </div>
      </div>
      <div className="rounded-xl dark:shadow-dark-md shadow-md bg-white dark:bg-darkgray p-10 w-full max-w-4xl border-none my-auto">
        <h2 className="text-xl font-bold border-b border-black mb-4">1. Información Personal del Titular</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              <Label htmlFor="correo" value="Correo Electrónico" />
            </div>
            <TextInput
              id="correo"
              name="correo"
              type="email"
              value={formData.correo}
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
                <option value="Otra">Otra</option>
              </Select>
            </div>

            {formData.nacionalidad === "Otra" && (
              <div>
                <label className="block text-sm font-medium">Especifique nacionalidad</label>
                <TextInput
                  name="nacionalidadOtra"
                  value={formData.nacionalidadOtra}
                  onChange={handleChange}
                  type="text"
                  required={formData.nacionalidad === "Otra"}
                />
              </div>
            )}
            
            {/* Tipo de Identificación */}
            <div>
              <label className="block text-sm font-medium">Tipo de Identificación</label>
              <Select
                name="tipoID"
                value={formData.tipoID}
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
              name="numeroID"
              value={formData.numeroID}
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
                <option value="Otra">Otra</option>
              </Select>
            </div>

            {formData.lugarNacimiento === "Otra" && (
              <div>
                <label className="block text-sm font-medium">Especifique lugar de nacimiento</label>
                <TextInput
                  name="lugarNacimientoOtro"
                  value={formData.lugarNacimientoOtro}
                  onChange={handleChange}
                  type="text"
                  required={formData.lugarNacimiento === "Otra"}
                />
              </div>
            )}

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

          {/* Botón y Link */}
          <div className="mt-6 flex justify-center">
            <Button type="submit" className="bg-black text-white px-6 py-2 rounded">
              Registrarse
            </Button>
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
