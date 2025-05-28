// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import  { lazy } from 'react';
import { Navigate, createBrowserRouter } from "react-router-dom";
import Loadable from 'src/layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

// Landing Page
// const LandingPage = Loadable(lazy(() => import('../features/landing/pages/LandingPage'))); // Ya no es necesario aquí

// Dashboard
const Dashboard = Loadable(lazy(() => import('../views/dashboards/Dashboard')));
// const AuthDashboard = Loadable(lazy(() => import('../views/auth/Dashboard'))); // Ya no es necesario aquí

// utilities
const Typography = Loadable(lazy(() => import("../views/typography/Typography")));
const Table = Loadable(lazy(() => import("../views/tables/Table")));
const Form = Loadable(lazy(() => import("../views/forms/Form")));
const Alert = Loadable(lazy(() => import("../views/alerts/Alerts")));

// icons
const Solar = Loadable(lazy(() => import("../views/icons/Solar")));

// authentication
// const Login = Loadable(lazy(() => import('../features/auth/pages/Login'))); // Ya no es necesario aquí
// const Register = Loadable(lazy(() => import('../views/auth/register/Register'))); // Ya no es necesario aquí
const SamplePage = Loadable(lazy(() => import('../views/sample-page/SamplePage')));
// const Error = Loadable(lazy(() => import('../views/auth/error/Error'))); // Ya no es necesario aquí

// Importa las rutas de autenticación y de la landing page desde sus nuevos archivos
import AuthRoutes from '../features/auth/auth.routes';
import LandingRoutes from '../features/landing/landing.routes';

const Router = [
  LandingRoutes, // Incluye las rutas de la landing page aquí
  {
    path: '/',
    element: <FullLayout />,
    children: [
      // { path: '/', exact: true, element: <LandingPage /> }, // Ya no es necesario aquí
      { path: '/dashboard', exact: true, element: <Dashboard /> }, // Opcional: si quieres mantener el Dashboard en otra ruta
      { path: '/ui/typography', exact: true, element: <Typography/> },
      { path: '/ui/table', exact: true, element: <Table/> },
      { path: '/ui/form', exact: true, element: <Form/> },
      { path: '/ui/alert', exact: true, element: <Alert/> },
      { path: '/icons/solar', exact: true, element: <Solar /> },
      { path: '/sample-page', exact: true, element: <SamplePage /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  AuthRoutes, // Incluye las rutas de autenticación aquí
];

const router = createBrowserRouter(Router)

export default router;
