import React, { useState } from "react";
import FullLogo from "src/layouts/full/shared/logo/FullLogo";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client.ts";
import { Label, TextInput, Button } from "flowbite-react";

const gradientStyle = {
  background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  height: "100vh",
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (supabaseError) {
      console.error("Error al iniciar sesión:", supabaseError.message);
      setError(`Error al iniciar sesión: ${supabaseError.message}`);
    } else {
      console.log("Inicio de sesión exitoso:", data);

      // --- Lógica de redirección basada en el rol del usuario ---
      if (data.user) {
        // Accede a los metadatos del usuario para obtener el rol
        const userRole = data.user.app_metadata?.role; // Changed from user_metadata to app_metadata

        if (userRole === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }
      } else {
        navigate("/");
      }
      // --- Fin de la lógica de redirección ---

      setError(null); // Limpiar errores si tuvo éxito
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
        <div className="rounded-xl dark:shadow-dark-md shadow-md bg-white dark:bg-darkgray p-10 md:w-96 border-none">
          <div className="flex flex-col gap-2 p-0 w-full">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="email" value="Correo" className="text-black block text-sm font-medium" />
                </div>
                <TextInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-control form-rounded-xl"
                />
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="password" value="Contraseña" className="text-black block text-sm font-medium" />
                </div>
                <TextInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-control form-rounded-xl"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button type="submit" color="primary" className="w-full" disabled={loading}>
                {loading ? 'Cargando...' : 'Ingresar'}
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