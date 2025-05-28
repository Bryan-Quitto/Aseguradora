import { lazy } from 'react';
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import FullLayout from 'src/layouts/full/FullLayout';

// Landing Page
const LandingPage = Loadable(lazy(() => import('./pages/LandingPage')));

const LandingRoutes = {
  path: '/',
  element: <FullLayout />,
  children: [
    { path: '/', exact: true, element: <LandingPage /> },
  ],
};

export default LandingRoutes;