import { Button, Label, TextInput, Select } from "flowbite-react";
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

    // Validación de campos
    if (!primerApellido || !segundoApellido || !nombres || !email || !password || !confirmPassword ||
        !nacionalidad || !tipoIdentificacion || !numeroIdentificacion || !lugarNacimiento ||
        !fechaNacimiento || !sexo || !estadoCivil || !estatura || !peso) {
      setError("Por favor, completa todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!/^\d+$/.test(numeroIdentificacion)) {
      setError("El número de identificación solo debe contener números.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
      setError("Por favor, ingresa una fecha de nacimiento válida en formato YYYY-MM-DD.");
      return;
    }
    if (isNaN(parseFloat(estatura)) || isNaN(parseFloat(peso))) {
      setError("Estatura y Peso deben ser números válidos.");
      return;
    }

    // Verificación de perfil existente
    try {
      const { data: existingProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${email},numero_identificacion.eq.${numeroIdentificacion}`);
      if (fetchError) {
        setError("Ocurrió un error al verificar el perfil. Intenta de nuevo.");
        return;
      }
      if (existingProfiles && existingProfiles.length > 0) {
        setError("Este correo o número de identificación ya está registrado. Por favor, inicia sesión.");
        return;
      }
    } catch (e) {
      setError("Ocurrió una excepción al verificar el perfil. Intenta de nuevo.");
      return;
    }

    // Registro en Auth
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        setError(`Error al registrar usuario: ${signUpError.message}`);
        return;
      }
      if (data.user) {
        const userId = data.user.id;
        const userEmail = data.user.email!;
        const fullName = `${nombres} ${primerApellido} ${segundoApellido}`;

        // Inserción en profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: userId,
              primer_apellido: primerApellido,
              segundo_apellido: segundoApellido,
              nombres,
              full_name: fullName,
              email: userEmail,
              nacionalidad,
              tipo_identificacion: tipoIdentificacion,
              numero_identificacion: numeroIdentificacion,
              lugar_nacimiento: lugarNacimiento,
              fecha_nacimiento: fechaNacimiento,
              sexo,
              estado_civil: estadoCivil,
              estatura: parseFloat(estatura),
              peso: parseFloat(peso),
              role: 'user'
            }
          ]);

        if (profileError) {
          console.error("Error al guardar perfil:", profileError);
          setError("Usuario registrado, pero hubo un error al guardar los datos del perfil.");
        } else {
          setSuccess("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
        }
      }
    } catch (e) {
      console.error("Excepción inesperada durante signUp:", e);
      setError("Ocurrió una excepción inesperada durante el registro.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 overflow-x-auto">
      <form onSubmit={handleSubmit} className="min-w-[700px] md:min-w-full">
        {/* Formulario (sin cambios en HTML) */}
        <Button color={'primary'} type="submit" className="w-full">Registrarse</Button>
      </form>
    </div>
  );
};

export default AuthRegister;
