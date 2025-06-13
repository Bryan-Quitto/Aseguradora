import { useEffect, useState, FC, FormEvent } from "react"; // Usamos FC y FormEvent para un tipado más explícito
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client";
import logo from 'src/assets/images/logos/logo-wrappixel.png';

const gradientStyle = {
  background: "linear-gradient(-45deg, #4A90E2, #333333, #A2D5C6, #FFFFFF)",
  backgroundSize: "400% 400%",
  animation: "gradient 15s ease infinite",
  minHeight: "100vh",
};

const AuthCallback: FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // 3. CORRECCIÓN: Eliminamos el estado 'session' que no se utilizaba
  // const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      // Simplemente verificamos si existe una sesión
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setError(`Error al obtener sesión: ${error.message}`);
        setLoading(false);
        return;
      }

      // Si no hay sesión, es un error en este contexto
      if (!data.session) {
        setError("No hay sesión activa. Por favor, inicia sesión de nuevo.");
        setLoading(false);
        // Opcional: Redirigir al login
        // navigate('/auth/login');
        return;
      }

      // No es necesario guardar la sesión si no la vamos a usar.
      // setSession(data.session); 
      setLoading(false);
    };

    checkSession();
  }, []); // El array de dependencias vacío es correcto

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
  
    // 4. CORRECCIÓN: No necesitamos 'data', solo nos interesa el 'error'.
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
  
    if (error) {
      setError("Error al actualizar la contraseña: " + error.message);
      setSaving(false);
      return;
    }
  
    setSaving(false);
    // Redirigir a la página principal o al dashboard después de actualizar la contraseña
    navigate("/"); 
  };

  if (loading) {
    return (
      <div style={gradientStyle} className="min-h-screen flex items-center justify-center py-8">
        <div className="text-center text-gray-600">Procesando autenticación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={gradientStyle} className="min-h-screen flex items-center justify-center py-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div style={gradientStyle} className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="h-40" />
        </div>
        <div className="bg-white rounded-2xl shadow-lg px-6 py-10 md:px-8 md:py-12">
          <h2 className="text-2xl font-bold text-center mb-6 border-b border-gray-200 pb-3">
            Ingresa tu nueva contraseña
          </h2>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 mb-4 border rounded"
              minLength={6}
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
            >
              {saving ? "Guardando..." : "Guardar y continuar"}
            </button>
          </form>
          {error && <p className="text-red-600 mt-3 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;