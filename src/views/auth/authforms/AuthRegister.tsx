import { Button, Label, TextInput, Select } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client.ts";
import { useState } from "react";

const AuthRegister = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [nombres, setNombres] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nacionalidad, setNacionalidad] = useState("Paraguay");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("Cédula");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [lugarNacimiento, setLugarNacimiento] = useState("Ecuador");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sexo, setSexo] = useState("Masculino");
  const [estadoCivil, setEstadoCivil] = useState("Soltero");
  const [estatura, setEstatura] = useState("");
  const [peso, setPeso] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    // --- LOGS DE VALIDACIÓN ---
    console.log("Iniciando handleSubmit...");
    console.log("Valores actuales de los campos:", {
      primerApellido, segundoApellido, nombres, email, nacionalidad,
      tipoIdentificacion, numeroIdentificacion, lugarNacimiento,
      fechaNacimiento, sexo, estadoCivil, estatura, peso
    });

    if (!primerApellido || !segundoApellido || !nombres || !email || !password || !confirmPassword ||
        !nacionalidad || !tipoIdentificacion || !numeroIdentificacion || !lugarNacimiento ||
        !fechaNacimiento || !sexo || !estadoCivil || !estatura || !peso) {
      console.error("Error: Campos incompletos.");
      setError("Por favor, completa todos los campos.");
      return;
    }

    if (password !== confirmPassword) {
      console.error("Error: Contraseñas no coinciden.");
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!/^\d+$/.test(numeroIdentificacion)) {
      console.error("Error: Número de identificación inválido.");
      setError("El número de identificación solo debe contener números.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
        console.error("Error: Formato de fecha de nacimiento inválido.");
        setError("Por favor, ingresa una fecha de nacimiento válida en formato YYYY-MM-DD.");
        return;
    }

    if (isNaN(parseFloat(estatura)) || isNaN(parseFloat(peso))) {
        console.error("Error: Estatura o Peso no son números válidos.");
        setError("Estatura y Peso deben ser números válidos.");
        return;
    }

    // --- LOGS DE VERIFICACIÓN DE PERFIL EXISTENTE ---
    console.log("Verificando perfil existente con email:", email, "o numero_identificacion:", numeroIdentificacion);
    try {
        const { data: existingProfiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .or(`email.eq.${email},numero_identificacion.eq.${numeroIdentificacion}`);

        if (fetchError) {
            console.error("Error al verificar perfil existente (fetchError):", fetchError);
            setError("Ocurrió un error al verificar el perfil. Intenta de nuevo.");
            return;
        }

        if (existingProfiles && existingProfiles.length > 0) {
            console.warn("Advertencia: Correo o número de identificación ya registrado.");
            setError("Este correo o número de identificación ya está registrado. Por favor, inicia sesión.");
            return;
        }
        console.log("Verificación de perfil existente: OK. No se encontró perfil duplicado.");

    } catch (e) {
        // Esto rara vez se activa con supabase.from, pero por si acaso.
        console.error("Excepción en la verificación de perfil existente:", e);
        setError("Ocurrió una excepción al verificar el perfil. Intenta de nuevo.");
        return;
    }


    // --- Preparando datos para Supabase Auth ---
    const userData = {
        primer_apellido: primerApellido,
        segundo_apellido: segundoApellido,
        nombres: nombres,
        nacionalidad: nacionalidad,
        tipo_identificacion: tipoIdentificacion,
        numero_identificacion: numeroIdentificacion,
        lugar_nacimiento: lugarNacimiento,
        fecha_nacimiento: fechaNacimiento,
        sexo: sexo,
        estado_civil: estadoCivil,
        estatura: parseFloat(estatura),
        peso: parseFloat(peso),
    };
    console.log("Datos a enviar en options.data para signUp:", userData);

    // --- Llamada a supabase.auth.signUp con try/catch ---
    try {
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: userData,
            }
        });

        if (signUpError) {
            console.error("Error completo de Supabase Auth signUp:", signUpError);
            console.error("Mensaje de error de signUp:", signUpError.message);
            console.error("Código de error de signUp:", signUpError.code);
            console.error("Status de error de signUp:", signUpError.status);

            if (signUpError.status === 400 && /already registered|duplicate/i.test(signUpError.message)) {
                setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
            } else {
                setError(`Error al registrar usuario: ${signUpError.message}`);
            }
            setSuccess(null);
        } else {
            console.log("signUp exitoso. Datos de usuario devueltos:", data);
            // Verifica raw_user_meta_data aquí en la consola
            console.log("user_metadata después de signUp (desde 'data.user'):", data.user?.user_metadata); // Nota: Supabase devuelve 'user_metadata' en el objeto user
            console.log("app_metadata después de signUp (desde 'data.user'):", data.user?.app_metadata);


            setSuccess("¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta.");
            setError(null);
        }
    } catch (e) {
        console.error("Excepción inesperada durante supabase.auth.signUp:", e);
        setError("Ocurrió una excepción inesperada durante el registro.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 overflow-x-auto">
      <form onSubmit={handleSubmit} className="min-w-[700px] md:min-w-full">
        <h2 className="text-xl font-semibold mb-6">1. Información Personal del Titular</h2>
        <hr className="mb-6" />

        {/* ... (resto del formulario HTML, sin cambios) ... */}

        {/* Primer Apellido y Segundo Apellido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="primer_apellido" value="Primer Apellido" />
            <TextInput
              id="primer_apellido"
              type="text"
              required
              value={primerApellido}
              onChange={(e) => setPrimerApellido(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="segundo_apellido" value="Segundo Apellido" />
            <TextInput
              id="segundo_apellido"
              type="text"
              required
              value={segundoApellido}
              onChange={(e) => setSegundoApellido(e.target.value)}
            />
          </div>
        </div>

        {/* Nombres */}
        <div className="mb-4">
          <Label htmlFor="nombres" value="Nombre(s)" />
          <TextInput
            id="nombres"
            type="text"
            required
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
        </div>

        {/* Correo Electrónico */}
        <div className="mb-4">
          <Label htmlFor="email" value="Correo Electrónico" />
          <TextInput
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Contraseña y Confirmar Contraseña */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="password" value="Contraseña" />
            <TextInput
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm_password" value="Confirmar Contraseña" />
            <TextInput
              id="confirm_password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Nacionalidad y Tipo de Identificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="nacionalidad" value="Nacionalidad" />
            <Select
              id="nacionalidad"
              required
              value={nacionalidad}
              onChange={(e) => setNacionalidad(e.target.value)}
            >
              <option value="Paraguay">Paraguay</option>
              <option value="Ecuador">Ecuador</option>
              {/* Añade más opciones según sea necesario */}
            </Select>
          </div>
          <div>
            <Label htmlFor="tipo_identificacion" value="Tipo de Identificación" />
            <Select
              id="tipo_identificacion"
              required
              value={tipoIdentificacion}
              onChange={(e) => setTipoIdentificacion(e.target.value)}
            >
              <option value="Cédula">Cédula</option>
              <option value="Pasaporte">Pasaporte</option>
              {/* Añade más opciones */}
            </Select>
          </div>
        </div>

        {/* Número de Identificación */}
        <div className="mb-4">
          <Label htmlFor="numero_identificacion" value="Número de Identificación" />
          <TextInput
            id="numero_identificacion"
            type="text"
            required
            value={numeroIdentificacion}
            onChange={(e) => setNumeroIdentificacion(e.target.value)}
          />
        </div>

        {/* Lugar de Nacimiento y Fecha de Nacimiento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="lugar_nacimiento" value="Lugar de Nacimiento" />
            <Select
              id="lugar_nacimiento"
              required
              value={lugarNacimiento}
              onChange={(e) => setLugarNacimiento(e.target.value)}
            >
              <option value="Ecuador">Ecuador</option>
              <option value="Colombia">Colombia</option>
              {/* Añade más opciones */}
            </Select>
          </div>
          <div>
            <Label htmlFor="fecha_nacimiento" value="Fecha de Nacimiento" />
            <TextInput
              id="fecha_nacimiento"
              type="date"
              required
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>
        </div>

        {/* Sexo y Estado Civil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="sexo" value="Sexo" />
            <Select
              id="sexo"
              required
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
            >
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="estado_civil" value="Estado Civil" />
            <Select
              id="estado_civil"
              required
              value={estadoCivil}
              onChange={(e) => setEstadoCivil(e.target.value)}
            >
              <option value="Soltero">Soltero</option>
              <option value="Casado">Casado</option>
              <option value="Divorciado">Divorciado</option>
              <option value="Viudo">Viudo</option>
              <option value="Union Libre">Unión Libre</option>
            </Select>
          </div>
        </div>

        {/* Estatura y Peso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="estatura" value="Estatura (en cm)" />
            <TextInput
              id="estatura"
              type="number"
              step="0.1"
              required
              value={estatura}
              onChange={(e) => setEstatura(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="peso" value="Peso (en kg)" />
            <TextInput
              id="peso"
              type="number"
              step="0.1"
              required
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>
        </div>


        {/* Mostrar mensajes de error o éxito */}
        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-500 text-sm mb-4">
            {success}
          </div>
        )}

        <Button color={'primary'} type="submit" className="w-full">Registrarse</Button>

      </form>
    </div>
  )
}

export default AuthRegister;