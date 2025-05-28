import { Button, Checkbox, Label, TextInput } from "flowbite-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/client.ts"; // Ruta de importación corregida

const AuthLogin = () => {
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const emailInput = form.elements.namedItem('Username') as HTMLInputElement;
    const passwordInput = form.elements.namedItem('userpwd') as HTMLInputElement;

    const email = emailInput.value;
    const password = passwordInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error al iniciar sesión:", error.message);
      // Aquí podrías mostrar un mensaje de error al usuario
    } else {
      console.log("Inicio de sesión exitoso:", data);
      navigate("/"); // Redirigir al usuario a la página principal
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} >
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="Username" value="Username" />
          </div>
          <TextInput
            id="Username"
            type="text"
            sizing="md"
            required
            className="form-control form-rounded-xl"
          />
        </div>
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="userpwd" value="Password" />
          </div>
          <TextInput
            id="userpwd"
            type="password"
            sizing="md"
            required
            className="form-control form-rounded-xl"
          />
        </div>
        <div className="flex justify-between my-5">
          <div className="flex items-center gap-2">
            <Checkbox id="accept" className="checkbox" />
            <Label
              htmlFor="accept"
              className="opacity-90 font-normal cursor-pointer"
            >
              Recordar este dispositivo
            </Label>
          </div>
          <Link to={"/"} className="text-primary text-sm font-medium">
            ¿Olvido su contraseña?
          </Link>
        </div>
        <Button type="submit" color={"primary"}  className="w-full bg-primary text-white rounded-xl">
          Ingresar
        </Button>
      </form>
    </>
  );
};

export default AuthLogin;
