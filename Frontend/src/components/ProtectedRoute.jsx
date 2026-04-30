import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../shared/lib/authService';
import {
    getDefaultRouteByRole,
    isPermissionRoleValid,
} from '../shared/permissions/roleUtils';

/**
 * ProtectedRoute - Bảo vệ route theo authentication và authorization
 * Role không hợp lệ (null) → logout và chuyển về login kèm thông báo lỗi vai trò
 *
 * @param {string[]} props.allowedRoles - Mảng role được phép
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const location = useLocation();
    const isAuthenticated = authService.isAuthenticated();
    const permissionRole = authService.getPermissionRole();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isPermissionRoleValid(permissionRole)) {
        authService.logout();
        return <Navigate to="/login" replace state={{ roleError: true }} />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(permissionRole)) {
            console.warn(
                `User with role ${permissionRole} tried to access ${location.pathname} but doesn't have permission`
            );
            return <Navigate to={getDefaultRouteByRole(permissionRole)} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;