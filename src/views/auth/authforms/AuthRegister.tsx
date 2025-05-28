import { Button, Label, TextInput } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client.ts"; // Importar el cliente de Supabase
import { useState } from "react"; // Importar useState

const AuthRegister = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null); // Estado para mensajes de error
  const [success, setSuccess] = useState<string | null>(null); // Estado para mensajes de éxito

  // Estados para los nuevos campos
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Limpiar mensajes anteriores
    setError(null);
    setSuccess(null);

    // Validar campos en el frontend
    if (!nombres || !apellidos || !cedula || !email || !password || !confirmPassword) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Validación básica de cédula (solo números)
    if (!/^\d+$/.test(cedula)) {
        setError("La cédula solo debe contener números.");
        return;
    }

    // Validación básica de formato de correo (aunque el input type="email" ayuda)
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Por favor, ingresa un correo electrónico válido.");
        return;
    }

    // --- Inicio de la lógica para verificar si el correo ya existe ---
    // Intentar iniciar sesión con una contraseña ficticia para verificar si el correo existe
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: "dummy-password-para-verificar-existencia", // Contraseña ficticia
    });

    // Si el error indica credenciales inválidas, significa que el correo existe
    if (signInError && /Invalid login credentials/i.test(signInError.message)) {
      setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
      setSuccess(null); // Asegurarse de que el mensaje de éxito esté vacío
      return; // Detener el proceso si el correo ya existe
    }
    // --- Fin de la lógica para verificar si el correo ya existe ---


    // Si el correo no existe (o signInWithPassword falló por otra razón), proceder con el registro
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      // Nota: Los campos adicionales (nombres, apellidos, cedula) no se pasan directamente
      // en el método signUp con email/password. Deberás guardarlos en una tabla de perfiles
      // separada en Supabase después de que el usuario se registre y confirme su correo.
      // Puedes pasar datos adicionales en el objeto 'data', pero no se guardan por defecto
      // en la tabla auth.users. Se usan para el correo de confirmación.
      // data: { nombres: nombres, apellidos: apellidos, cedula: cedula } // Ejemplo de cómo pasar data, pero requiere lógica backend/DB para guardarlos
    });

    if (signUpError) {
      console.error("Error al registrar usuario:", signUpError.message);

      // Aunque ya hicimos una verificación previa, este bloque maneja cualquier otro error de signUp
      // incluyendo la posibilidad de que la verificación previa no haya sido 100% efectiva
      // o que haya un error diferente (ej: problemas de red, configuración de Supabase, etc.)
       if (signUpError.status === 400 &&
          /already registered|duplicate/i.test(signUpError.message)) {
        setError("Este correo ya está registrado. Por favor, inicia sesión o usa la opción de recuperar contraseña.");
      } else {
        setError(`Error al registrar usuario: ${signUpError.message}`);
      }
      setSuccess(null); // Asegurarse de que el mensaje de éxito esté vacío
    } else {
      console.log("Usuario registrado exitosamente:", data);
      setSuccess("¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta."); // Mostrar mensaje de éxito
      setError(null); // Asegurarse de que el mensaje de error esté vacío
      // Supabase enviará un correo de verificación.
      // El usuario deberá verificar su correo antes de poder iniciar sesión.
      // Considera mostrar un mensaje al usuario indicando que revise su correo.
      // navigate("/auth/login"); // Eliminada la redirección
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} >
        {/* Campo Nombres */}
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="nombres" value="Nombres" />
          </div>
          <TextInput
            id="nombres"
            type="text"
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
          />
        </div>

        {/* Campo Apellidos */}
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="apellidos" value="Apellidos" />
          </div>
          <TextInput
            id="apellidos"
            type="text"
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
        </div>

        {/* Campo Cédula */}
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="cedula" value="Cédula" />
          </div>
          <TextInput
            id="cedula"
            type="text" // Usamos text para permitir validación manual, o number si solo quieres teclado numérico
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            // pattern="\d*" // Opcional: usar pattern para validación HTML5 básica (solo números)
          />
        </div>

        {/* Campo Correo electrónico */}
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="emadd" value="Correo electrónico" />
          </div>
          <TextInput
            id="emadd"
            type="email"
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Campo Contraseña */}
        <div className="mb-6">
          <div className="mb-2 block">
            <Label htmlFor="userpwd" value="Contraseña" />
          </div>
          <TextInput
            id="userpwd"
            type="password"
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Campo Confirmar contraseña */}
        <div className="mb-6">
          <div className="mb-2 block">
            <Label htmlFor="confirmUserpwd" value="Confirmar contraseña" />
          </div>
          <TextInput
            id="confirmUserpwd"
            type="password"
            sizing="md"
            required
            className="form-control form-rounded-xl"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
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
    </>
  )
}

export default AuthRegister
