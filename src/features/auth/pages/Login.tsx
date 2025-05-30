import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client";
import { Label, TextInput, Button } from "flowbite-react";
import logo from 'src/assets/images/logos/logo-wrappixel.png'; // Asegúrate de que la ruta sea correcta

const gradientStyle = {
  background: "linear-gradient(-45deg, #4A90E2, #333333, #A2D5C6, #FFFFFF)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  minHeight: "100vh",
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

    // 1. Iniciar sesión
    const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (supabaseError || !data.session) {
      console.error("Error al iniciar sesión:", supabaseError?.message);
      setError(`Correo o contraseña incorrectos`);
      return;
    }

    // 2. Obtener perfil y rol desde tabla 'profiles'
    const userId = data.session.user.id;
    console.log('↪ Buscando perfil para userId:', userId);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    console.log('↪ profileError:', profileError);
    console.log('↪ profile data:', profile);

    // 3. Redirección según rol
    if (profileError) {
      console.warn(`Error al obtener perfil para ${userId}:`, profileError.message);
      if (profileError.code === 'PGRST116') {
        console.warn(`Perfil no encontrado para el usuario ${userId}. Redirigiendo a landing.`);
      }
      return navigate('/'); // Redirigir a landing si hay un error al obtener el perfil
    } else if (!profile) {
      console.warn(`Perfil nulo para el usuario ${userId}. Redirigiendo a landing.`);
      return navigate('/'); // Redirigir a landing si el perfil es nulo (aunque PGRST116 ya lo cubre)
    }

    if (profile.role === 'admin') {
      console.log('Usuario es admin, redirigiendo a /admin/dashboard');
      navigate('/admin/dashboard');
    } else {
      console.log('Usuario NO es admin, redirigiendo a /dashboard');
      navigate('/dashboard');
    }
  };

  return (
    <div style={gradientStyle} className="overflow-hidden h-screen py-40">
      <div className="flex flex-col gap-2 w-full">
        <div className="mx-auto text-center">
          <img src={logo} alt="Logo Savalta" className="h-25 mx-auto mb-2" />
        </div>
        <div className="flex h-full justify-center items-center px-4">
          <div className="rounded-xl shadow-md bg-white p-10 md:w-96">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email" value="Correo" className="text-black text-sm font-medium" />
                <TextInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" value="Contraseña" className="text-black text-sm font-medium" />
                <TextInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button type="submit" color="primary" disabled={loading} className="w-full">
                {loading ? 'Cargando...' : 'Ingresar'}
              </Button>
            </form>
            <div className="flex gap-2 text-sm font-medium mt-3">
              <p>¿No tiene una cuenta?</p>
              <Link to="/auth/register" className="text-link">Crear una cuenta</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;