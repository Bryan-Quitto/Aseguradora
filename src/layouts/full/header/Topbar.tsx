import { useState } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.png";
import { Avatar, Button, Dropdown, Spinner } from "flowbite-react";
import { Icon } from "@iconify/react";
import { useAuth } from 'src/contexts/useAuth';
import { supabase } from 'src/supabase/client';

const Topbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, userRole, loading } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error al cerrar sesión:", error.message);
            }
            navigate("/auth/login");
        } catch (error) {
            console.error("Error inesperado al cerrar sesión:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.primer_nombre || 'Usuario';
    const initials = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

    const getDashboardPath = () => {
        switch (userRole) {
            case 'admin':
            case 'superadministrator':
                return '/admin/dashboard';
            case 'agent':
                return '/agent/dashboard';
            case 'client':
                return '/client/dashboard';
            default:
                return null;
        }
    };

    const dashboardPath = getDashboardPath();
    const isInDashboard = location.pathname.includes('/dashboard');

    if (loading) {
        return <div className="h-[68px] bg-white"></div>;
    }

    return (
        <div className="py-3 px-4 bg-white z-40 sticky top-0 border-b border-gray-200">
            <div className="flex items-center justify-between">
                <Link to="/">
                    <img src={wrappixel_logo} alt="Savalta Seguros Logo" className="h-10" />
                </Link>

                <div className="flex items-center gap-2">
                    {user ? (
                        <Dropdown
                            arrowIcon={false}
                            inline
                            label={<Avatar alt="User settings" placeholderInitials={initials} rounded size="sm" />}
                        >
                            <Dropdown.Header>
                                <span className="block text-sm font-medium">{fullName}</span>
                                <span className="block truncate text-sm font-light text-gray-500">{user.email}</span>
                            </Dropdown.Header>
                            {dashboardPath && !isInDashboard && (
                                <Dropdown.Item as={Link} to={dashboardPath} icon={() => <Icon icon="solar:widget-add-line-duotone" className="h-5 w-5" />}>
                                    Panel de Control
                                </Dropdown.Item>
                            )}
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={handleLogout} disabled={isLoggingOut} icon={() => isLoggingOut ? <Spinner size="sm" /> : <Icon icon="solar:logout-2-line-duotone" className="h-5 w-5" />}>
                                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                            </Dropdown.Item>
                        </Dropdown>
                    ) : (
                        <Button
                            color="primary"
                            size="sm"
                            as={Link}
                            to="/auth/login"
                        >
                            <div className="flex items-center gap-1.5">
                                <Icon icon="solar:login-3-line-duotone" className="h-5 w-5" />
                                <span className="text-[15px]">Iniciar Sesión</span>
                            </div>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;