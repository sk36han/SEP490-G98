import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../shared/lib/authService';
import { getPermissionRole, isPermissionRoleValid } from '../shared/permissions/roleUtils';

/**
 * ProtectedRoute - Bảo vệ route theo authentication và authorization
 * Role không hợp lệ (null) → logout và chuyển về login kèm thông báo lỗi vai trò
 *
 * @param {string[]} props.allowedRoles - Mảng role được phép
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const location = useLocation();
    const isAuthenticated = authService.isAuthenticated();
    const userInfo = authService.getUser();
    const rawRole = userInfo?.roleCode || userInfo?.roleName || '';
    const permissionRole = getPermissionRole(rawRole);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isPermissionRoleValid(permissionRole)) {
        authService.logout();
        return <Navigate to="/login" replace state={{ roleError: true }} />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(permissionRole)) {
            console.warn(`User with role ${permissionRole} tried to access ${location.pathname} but doesn't have permission`);

            if (permissionRole === 'ADMIN') return <Navigate to="/admin/home" replace />;
            if (permissionRole === 'DIRECTOR') return <Navigate to="/director/home" replace />;
            if (permissionRole === 'WAREHOUSE_KEEPER') return <Navigate to="/products" replace />;
            if (permissionRole === 'SALE_SUPPORT') return <Navigate to="/sale-support/home" replace />;
            if (permissionRole === 'SALE_ENGINEER') return <Navigate to="/sale-engineer/home" replace />;
            if (permissionRole === 'ACCOUNTANTS') return <Navigate to="/products" replace />;
            return <Navigate to="/home" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
