import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import BlankLayout from 'src/layouts/blank/BlankLayout';

// authentication
const Login = Loadable(lazy(() => import('./pages/Login')));
const Register = Loadable(lazy(() => import('src/features/auth/pages/Register')));
const AuthDashboard = Loadable(lazy(() => import('src/views/auth/Dashboard')));
const Error = Loadable(lazy(() => import('src/views/auth/error/Error')));
const AuthCallback = Loadable(lazy(() => import('./hooks/AuthCallback')));

const AuthRoutes = {
  path: '/auth',
  element: <BlankLayout />,
  children: [
    { path: 'dashboard', element: <AuthDashboard /> },
    { path: 'login', element: <Login /> },
    { path: 'register', element: <Register /> },
    { path: 'callback', element: <AuthCallback /> },
    { path: '404', element: <Error /> },
    { path: '*', element: <Navigate to="/auth/404" /> },
  ],
};

export default AuthRoutes;