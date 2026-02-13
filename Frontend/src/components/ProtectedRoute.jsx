import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../shared/lib/authService';

/**
 * ProtectedRoute component - Protects routes that require authentication
 * Redirects to login page if user is not authenticated
 * 
 * @param {object} props - Component props
 * @param {React.ReactElement} props.children - Child component to render if authenticated
 * @returns {React.ReactElement} - Child component or redirect to login
 */
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" replace />;
    }

    // Render the protected component if authenticated
    return children;
};

export default ProtectedRoute;
