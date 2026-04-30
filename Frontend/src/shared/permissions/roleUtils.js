export const VALID_PERMISSION_ROLES = ['ADMIN', 'DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'];
export const ROLE = {
    ADMIN: 'ADMIN',
    DIRECTOR: 'DIRECTOR',
    WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
    SALE_SUPPORT: 'SALE_SUPPORT',
    SALE_ENGINEER: 'SALE_ENGINEER',
    ACCOUNTANTS: 'ACCOUNTANTS',
};

export const ROLE_GROUPS = {
    ALL_BUSINESS: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.SALE_SUPPORT, ROLE.SALE_ENGINEER, ROLE.ACCOUNTANTS],
    ITEM_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.SALE_SUPPORT, ROLE.SALE_ENGINEER, ROLE.ACCOUNTANTS],
    ITEM_MANAGE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    WAREHOUSE_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.SALE_SUPPORT, ROLE.SALE_ENGINEER, ROLE.ACCOUNTANTS],
    WAREHOUSE_MANAGE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    STOCKTAKE_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.ACCOUNTANTS],
    STOCKTAKE_CREATE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    INVENTORY_ADJUSTMENT_CREATE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    SUPPLIER_VIEW: [ROLE.DIRECTOR, ROLE.SALE_SUPPORT, ROLE.ACCOUNTANTS],
    SUPPLIER_MANAGE: [ROLE.DIRECTOR, ROLE.SALE_SUPPORT],
    RECEIVER_VIEW: [ROLE.DIRECTOR, ROLE.SALE_ENGINEER, ROLE.ACCOUNTANTS],
    RECEIVER_MANAGE: [ROLE.DIRECTOR, ROLE.SALE_ENGINEER],
    PURCHASE_ORDER_VIEW: [ROLE.SALE_SUPPORT, ROLE.ACCOUNTANTS, ROLE.WAREHOUSE_KEEPER, ROLE.DIRECTOR],
    PURCHASE_ORDER_MANAGE: [ROLE.SALE_SUPPORT, ROLE.DIRECTOR],
    GRN_VIEW: [ROLE.ACCOUNTANTS, ROLE.WAREHOUSE_KEEPER, ROLE.DIRECTOR],
    GRN_MANAGE: [ROLE.WAREHOUSE_KEEPER, ROLE.DIRECTOR],
    PRN_VIEW: [ROLE.WAREHOUSE_KEEPER, ROLE.ACCOUNTANTS, ROLE.DIRECTOR],
    PRN_MANAGE: [ROLE.WAREHOUSE_KEEPER, ROLE.DIRECTOR],
    RELEASE_REQUEST_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.SALE_ENGINEER, ROLE.ACCOUNTANTS],
    RELEASE_REQUEST_MANAGE: [ROLE.DIRECTOR, ROLE.SALE_ENGINEER],
    GDN_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.ACCOUNTANTS],
    GDN_MANAGE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    DELIVERY_VIEW: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER, ROLE.ACCOUNTANTS],
    DELIVERY_MANAGE: [ROLE.DIRECTOR, ROLE.WAREHOUSE_KEEPER],
    REPORT_VIEW: [ROLE.DIRECTOR],
    ADMIN_ONLY: [ROLE.ADMIN],
};

export const getRawRoleFromUser = (userInfo) => {
    if (!userInfo) return '';
    const textRole = userInfo.roleCode || userInfo.RoleCode || userInfo.rolename || userInfo.RoleName || userInfo.role || userInfo.Role || '';
    if (String(textRole).trim() !== '') return String(textRole).trim();
    if (userInfo.roleId != null) return String(userInfo.roleId);
    if (userInfo.RoleId != null) return String(userInfo.RoleId);
    return '';
};

export const isAccountantView = (permissionRole) => permissionRole === 'ACCOUNTANTS';
export const isDirector = (permissionRole) => permissionRole === 'DIRECTOR';
export const isWarehouseKeeper = (permissionRole) => permissionRole === 'WAREHOUSE_KEEPER';
export const isAccountant = (permissionRole) => permissionRole === 'ACCOUNTANTS';

/** Chỉ Thủ kho + Giám đốc được chỉnh sửa nghiệp vụ kho. */
export const canEditWarehouse = (permissionRole) =>
    hasAnyRole(permissionRole, ROLE_GROUPS.WAREHOUSE_MANAGE);

export const isPermissionRoleValid = (role) => {
    return !!role && VALID_PERMISSION_ROLES.includes(role);
};

export const hasAnyRole = (permissionRole, allowedRoles = []) => {
    if (!permissionRole) return false;
    return Array.isArray(allowedRoles) && allowedRoles.includes(permissionRole);
};

export const canManageItems = (permissionRole) => hasAnyRole(permissionRole, ROLE_GROUPS.ITEM_MANAGE);
export const canManageWarehouses = (permissionRole) => hasAnyRole(permissionRole, ROLE_GROUPS.WAREHOUSE_MANAGE);
export const canCreateStocktake = (permissionRole) => hasAnyRole(permissionRole, ROLE_GROUPS.STOCKTAKE_CREATE);
export const canCreateReleaseRequest = (permissionRole) => hasAnyRole(permissionRole, ROLE_GROUPS.RELEASE_REQUEST_MANAGE);
export const canApproveReleaseRequest = (permissionRole) => permissionRole === ROLE.ACCOUNTANTS || permissionRole === ROLE.DIRECTOR;

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
    const upper = str.toUpperCase().replace(/[-\s]/g, '_');
    // Viết tắt tiếng Việt
    if (upper === 'GD') return 'DIRECTOR';
    if (upper === 'TK') return 'WAREHOUSE_KEEPER';
    if (upper === 'SP') return 'SALE_SUPPORT';
    if (upper === 'SE') return 'SALE_ENGINEER';
    if (upper === 'KT') return 'ACCOUNTANTS';
    // Tên tiếng Anh đầy đủ (trực tiếp từ JWT / backend)
    if (upper === 'ADMIN') return 'ADMIN';
    if (upper === 'DIRECTOR') return 'DIRECTOR';
    if (upper === 'WAREHOUSE_KEEPER' || upper === 'WAREHOUSEKEEPER') return 'WAREHOUSE_KEEPER';
    if (upper === 'SALE_SUPPORT' || upper === 'SALESUPPORT') return 'SALE_SUPPORT';
    if (upper === 'SALE_ENGINEER' || upper === 'SALESENGINEER') return 'SALE_ENGINEER';
    if (upper === 'ACCOUNTANTS' || upper === 'ACCOUNTANT') return 'ACCOUNTANTS';
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

export const DEFAULT_ROUTE_BY_ROLE = {
    [ROLE.ADMIN]: '/admin/users',
    [ROLE.DIRECTOR]: '/home',
    [ROLE.WAREHOUSE_KEEPER]: '/products',
    [ROLE.SALE_SUPPORT]: '/products',
    [ROLE.SALE_ENGINEER]: '/products',
    [ROLE.ACCOUNTANTS]: '/products',
};

export const getDefaultRouteByRole = (permissionRole) => {
    return DEFAULT_ROUTE_BY_ROLE[permissionRole] || '/products';
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
    } catch {
        return null;
    }
};
