import React, { useState } from "react";
import FullLogo from "src/layouts/full/shared/logo/FullLogo";
import { Link, useNavigate } from "react-router-dom"; // Usar react-router-dom-dom y useNavigate
import { supabase } from "../../../supabase/client.ts"; // Importar el cliente de Supabase
import { Label, TextInput, Button } from "flowbite-react"; // Importar componentes de flowbite-react

const gradientStyle = {
  background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  height: "100vh",
};

const Login = () => {
  const navigate = useNavigate(); // Usar useNavigate
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); // Estado para mensajes de error
  const [loading, setLoading] = useState(false); // Estado para indicar si está cargando

  const handleSubmit = async (e: React.FormEvent) => { // Hacer la función async
    e.preventDefault();

    setError(null); // Limpiar errores anteriores
    setLoading(true); // Indicar que está cargando

    const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false); // Finalizar carga

    if (supabaseError) {
      console.error("Error al iniciar sesión:", supabaseError.message);
      setError(`Error al iniciar sesión: ${supabaseError.message}`); // Mostrar error de Supabase
    } else {
      console.log("Inicio de sesión exitoso:", data);
      setError(null); // Limpiar errores si tuvo éxito
      navigate("/"); // Redirigir al usuario a la página principal
    }
  };

  return (
    <div style={gradientStyle} className="bg-white relative overflow-hidden h-screen py-40">
        <div className="flex flex-col gap-2 p-0 w-full ">
          <div className="mx-auto">
                  <FullLogo />
                  <p className="text-black block text-sm font-medium text-center my-3">Nombre Aseguradora</p>
        </div>
      </div>
      <div className="flex h-full justify-center items-center px-4">
        {/* Aplicando estilos de BasicForm.tsx */}
        <div className="rounded-xl dark:shadow-dark-md shadow-md bg-white dark:bg-darkgray p-10 md:w-96 border-none">
          <div className="flex flex-col gap-2 p-0 w-full">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="mb-2 block"> {/* Añadido div para mb-2 block */}
                  <Label htmlFor="email" value="Correo" className="text-black block text-sm font-medium" /> {/* Usar componente Label */}
                </div>
                <TextInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-control form-rounded-xl" // Aplicar clases de estilo
                />
              </div>

              <div>
                <div className="mb-2 block"> {/* Añadido div para mb-2 block */}
                  <Label htmlFor="password" value="Contraseña" className="text-black block text-sm font-medium" /> {/* Usar componente Label */}
                </div>
                <TextInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-control form-rounded-xl" // Aplicar clases de estilo
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button type="submit" color="primary" className="w-full" disabled={loading}> {/* Usar componente Button y aplicar estilo */}
                {loading ? 'Cargando...' : 'Ingresar'} {/* Cambiar texto del botón */}
              </Button>
            </form>

            <div className="text-sm text-left mt-3 ">
              <a href="#" className="text-link">¿Ha olvidado su contraseña?</a>
            </div>

            <div className="flex gap-2 text-sm text-black text-ld font-medium mt-3 items-center justify-left">
              <p><b>¿No tiene una cuenta?</b></p>
              <Link to="/auth/register" className="text-link font-medium">
                Crear una cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
};

export default Login;
