import React, { useState } from "react";
import FullLogo from "src/layouts/full/shared/logo/FullLogo";
import { Link } from "react-router"; // ¡Corrige este import si usas react-router-dom!

const gradientStyle = {
  background: "linear-gradient(to right,rgba(255, 255, 255, 0.87),rgba(255, 255, 255, 0.19))",
  height: "100vh",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación simple
    if (email === "admin@example.com" && password === "123456") {
      alert("Inicio de sesión exitoso");
      setError("");
    } else {
      setError("Credenciales inválidas");
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
        <div className="rounded-xl shadow-lg bg-white dark:bg-darkgray p-10 md:w-96 border-none">
          <div className="flex flex-col gap-2 p-0 w-full"> 
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="text-black block text-sm font-medium"><b>Correo</b></label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-black block text-sm font-medium"><b>Contraseña</b></label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button type="submit" className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md">
                Sign in
              </button>
            </form>

            <div className="text-sm text-left mt-3 ">
              <a href="#" className="text-link">Has olvidado tu contraseña?</a>
            </div>

            <div className="flex gap-2 text-sm text-black text-ld font-medium mt-3 items-center justify-left">
              <p><b>No tienes una cuenta?</b></p>
              <Link to="/auth/register" className="text-link font-medium">
                Crea una cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
