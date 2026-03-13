export const VALID_PERMISSION_ROLES = ['ADMIN', 'DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'];

export const getRawRoleFromUser = (userInfo) => {
    if (!userInfo) return '';
    const textRole = userInfo.roleCode || userInfo.RoleCode || userInfo.rolename || userInfo.RoleName || userInfo.role || userInfo.Role || '';
    if (String(textRole).trim() !== '') return String(textRole).trim();
    if (userInfo.roleId != null) return String(userInfo.roleId);
    if (userInfo.RoleId != null) return String(userInfo.RoleId);
    return '';
};

export const isAccountantView = (permissionRole) => permissionRole === 'ACCOUNTANTS';

export const isPermissionRoleValid = (role) => {
    return !!role && VALID_PERMISSION_ROLES.includes(role);
};

export const getPermissionRole = (originalRole) => {
    if (originalRole == null || String(originalRole).trim() === '') return null;
    const str = String(originalRole).trim();
    const numeric = Number(str);
    if (!Number.isNaN(numeric)) {
        if (numeric === 6) return 'ADMIN';
        if (numeric === 1) return 'DIRECTOR';
        if (numeric === 7) return 'WAREHOUSE_KEEPER';
        if (numeric === 4) return 'SALE_SUPPORT';
        if (numeric === 2) return 'SALE_ENGINEER';
        if (numeric === 3) return 'ACCOUNTANTS';
    }
    const upper = str.toUpperCase();
    if (upper === 'ADMIN') return 'ADMIN';
    if (upper === 'GD') return 'DIRECTOR';
    if (upper === 'TK') return 'WAREHOUSE_KEEPER';
    if (upper === 'SP') return 'SALE_SUPPORT';
    if (upper === 'SE') return 'SALE_ENGINEER';
    if (upper === 'KT') return 'ACCOUNTANTS';
    return null;
};

export const PERMISSION_ROLE_LABELS = {
    ADMIN: 'Admin',
    DIRECTOR: 'Director',
    WAREHOUSE_KEEPER: 'Warehouse Keeper',
    SALE_SUPPORT: 'Sale Support',
    SALE_ENGINEER: 'Sale Engineer',
    ACCOUNTANTS: 'Accountants',
};

export const getPermissionRoleLabel = (permissionRole) => {
    return PERMISSION_ROLE_LABELS[permissionRole] ?? (permissionRole || 'Loi vai tro');
};

export const getRoleFromToken = (token) => {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        const payload = JSON.parse(jsonPayload);
        return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
               payload.role || payload.Role || payload.roles?.[0] || null;
    } catch (error) {
        return null;
    }
};
