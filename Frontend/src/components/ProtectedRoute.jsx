import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../shared/lib/authService';
import { getPermissionRole } from '../shared/permissions/roleUtils';

/**
 * ProtectedRoute component - Protects routes that require authentication and authorization
 * Redirects to login page if user is not authenticated
 * Redirects to appropriate home if user doesn't have permission for the route
 *
 * @param {object} props - Component props
 * @param {React.ReactElement} props.children - Child component to render if authenticated
 * @param {string[]} props.allowedRoles - Array of permission roles: ADMIN, MANAGER, WAREHOUSE_KEEPER, SALE_SUPPORT, STAFF
 * @returns {React.ReactElement} - Child component or redirect
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const location = useLocation();
    const isAuthenticated = authService.isAuthenticated();
    const userInfo = authService.getUser();
    const rawRole = userInfo?.roleCode || userInfo?.roleName || '';
    const permissionRole = getPermissionRole(rawRole);

    // Check authentication first
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check authorization if allowedRoles is specified
    if (allowedRoles && allowedRoles.length > 0) {
        if (!permissionRole || !allowedRoles.includes(permissionRole)) {
            console.warn(`User with role ${permissionRole} tried to access ${location.pathname} but doesn't have permission`);

            if (permissionRole === 'ADMIN') return <Navigate to="/admin/home" replace />;
            if (permissionRole === 'WAREHOUSE_KEEPER') return <Navigate to="/products" replace />;
            if (permissionRole === 'MANAGER') return <Navigate to="/manager/home" replace />;
            if (permissionRole === 'SALE_SUPPORT') return <Navigate to="/sale-support/home" replace />;
            if (permissionRole === 'STAFF') return <Navigate to="/staff/home" replace />;
            return <Navigate to="/home" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
