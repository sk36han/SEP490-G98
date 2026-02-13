import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../shared/lib/authService';

/**
 * ProtectedRoute component - Protects routes that require authentication and authorization
 * Redirects to login page if user is not authenticated
 * Redirects to appropriate home if user doesn't have permission for the route
 * 
 * @param {object} props - Component props
 * @param {React.ReactElement} props.children - Child component to render if authenticated
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route (optional)
 * @returns {React.ReactElement} - Child component or redirect
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const location = useLocation();
    const isAuthenticated = authService.isAuthenticated();
    const userInfo = authService.getUser();
    // Try roleCode first (what backend uses), fallback to roleName
    const userRole = (userInfo?.roleCode || userInfo?.roleName || '').toUpperCase();

    // Check authentication first
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" replace />;
    }

    // Check authorization if allowedRoles is specified
    if (allowedRoles && allowedRoles.length > 0) {
        if (!userRole || !allowedRoles.includes(userRole)) {
            // User doesn't have required role, redirect to their appropriate home
            console.warn(`User with role ${userRole} tried to access ${location.pathname} but doesn't have permission`);

            // Redirect to role-specific home
            if (userRole === 'ADMIN') {
                return <Navigate to="/admin/home" replace />;
            } else if (userRole === 'MANAGER') {
                return <Navigate to="/manager/home" replace />;
            } else if (userRole === 'STAFF') {
                return <Navigate to="/staff/home" replace />;
            } else {
                // Fallback
                return <Navigate to="/home" replace />;
            }
        }
    }

    // Render the protected component if authenticated and authorized
    return children;
};

export default ProtectedRoute;
