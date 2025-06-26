import { Link, useLocation, useNavigate } from "react-router-dom";
import wrappixel_logo from "/src/assets/images/logos/logo-wrappixel.png";
import { Button } from "flowbite-react";
import { Icon } from "@iconify/react";
import { useAuth } from 'src/contexts/AuthContext';
import { supabase } from 'src/supabase/client';

const Topbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, loading, userRole } = useAuth();

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error al cerrar sesión:", error.message);
        } else {
            navigate("/auth/login");
        }
    };

    const fullName = profile ? `${profile.primer_nombre || ''} ${profile.primer_apellido || ''}`.trim() : '';

    const isInDashboard = location.pathname.includes('/dashboard');

    let dashboardPath: string | null = null;
    switch (userRole) {
        case 'admin':
        case 'superadministrator':
            dashboardPath = '/admin/dashboard';
            break;
        case 'agent':
            dashboardPath = '/agent/dashboard';
            break;
        case 'client':
            dashboardPath = '/client/dashboard';
            break;
    }

    if (loading) {
        return null;
    }

    return (
        <div className="py-3 px-4 bg-white z-40 sticky top-0">
            <div className="flex items-center lg:justify-between flex-wrap justify-center">
                <div className="flex items-center gap-12">
                    <img src={wrappixel_logo} alt="logo" />
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center lg:mt-0 mt-2">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <span className="text-blue-900 text-[15px]">
                                {fullName || user.email}
                            </span>
                            {dashboardPath && !isInDashboard && (
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => navigate(dashboardPath)}
                                    className="py-2"
                                >
                                    Dashboard
                                </Button>
                            )}
                            <Button
                                color="primary"
                                size="sm"
                                onClick={handleLogout}
                                className="py-2"
                            >
                                Cerrar sesión
                            </Button>
                        </div>
                    ) : (
                        <Button
                            color="outlineprimary"
                            size="sm"
                            className="py-2"
                            as={Link}
                            to="/auth/login"
                        >
                            <div className="flex items-center gap-1">
                                <Icon icon="tabler:device-laptop" className="text-lg" />
                                <p className="text-[15px]">Iniciar sesión</p>
                            </div>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;