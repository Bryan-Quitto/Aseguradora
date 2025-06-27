import { Button, Dropdown } from "flowbite-react";
import user1 from "/src/assets/images/profile/user-1.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from 'src/contexts/useAuth'; // Importar useAuth
import { supabase } from 'src/supabase/client'; // Importar supabase

const Profile = () => {
  const { user } = useAuth(); // Obtener el usuario del contexto
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error.message);
    } else {
      navigate("/auth/login"); // Redirigir al login después de cerrar sesión
    }
  };

  return (
    <div className="relative group/menu">
      <Dropdown
        label=""
        className="rounded-sm w-44"
        dismissOnClick={false}
        renderTrigger={() => (
          <span className="h-10 w-10 hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary">
            <img
              src={user1}
              alt="logo"
              height="35"
              width="35"
              className="rounded-full"
            />
          </span>
        )}
      >
        {user && (
          <Dropdown.Header className="px-3 py-3">
            <span className="block text-sm font-medium truncate">
              {user.email} {/* Mostrar el correo del usuario */}
            </span>
          </Dropdown.Header>
        )}
        {/* Eliminamos los Dropdown.Item que no son necesarios */}
        {/* <Dropdown.Item
          as={Link}
          to="#"
          className="px-3 py-3 flex items-center bg-hover group/link w-full gap-3 text-dark"
        >
          <Icon icon="solar:user-circle-outline" height={20} />
          My Profile
        </Dropdown.Item>
        <Dropdown.Item
          as={Link}
          to="#"
          className="px-3 py-3 flex items-center bg-hover group/link w-full gap-3 text-dark"
        >
          <Icon icon="solar:letter-linear" height={20} />
          My Account
        </Dropdown.Item>
        <Dropdown.Item
          as={Link}
          to="#"
          className="px-3 py-3 flex items-center bg-hover group/link w-full gap-3 text-dark"
        >
          <Icon icon="solar:checklist-linear" height={20} />
          My Task
        </Dropdown.Item> */}
        <div className="p-3 pt-0">
          <Button
            size={'sm'}
            onClick={handleLogout}
            className="mt-2 border border-primary text-primary bg-transparent hover:bg-lightprimary outline-none focus:outline-none"
          >
            Salir
          </Button>
        </div>
      </Dropdown>
    </div>
  );
};

export default Profile;