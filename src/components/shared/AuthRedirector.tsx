import React from 'react';

import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/useAuth';



const AuthRedirector: React.FC = () => {

  const { user, loading, userRole } = useAuth();



  if (loading) {

    return <div>Cargando...</div>; // Or a loading spinner

  }



  if (!user) {

    // If not authenticated, redirect to the landing page

    return <Navigate to="/landing" replace />;

  }



  // If authenticated, redirect based on role

  if (userRole === 'admin') {

    return <Navigate to="/admin/dashboard" replace />;

  } else if (userRole === 'client') {

    return <Navigate to="/client/dashboard" replace />; // Assuming a client dashboard exists

  } else if (userRole === 'agent') {

    return <Navigate to="/agent/dashboard" replace />; // Assuming an agent dashboard exists

  } else {

    // Default redirect for authenticated users without a specific role dashboard

    return <Navigate to="/landing" replace />;

  }

};



export default AuthRedirector;