/** Các role hợp lệ – không có default, role không map được = không cho đăng nhập */
export const VALID_PERMISSION_ROLES = ['ADMIN', 'DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'];

/**
 * Lấy chuỗi role thô từ userInfo (để đưa vào getPermissionRole)
 * @param {object|null} userInfo - object từ authService.getUser()
 * @returns {string}
 */
export const getRawRoleFromUser = (userInfo) => {
    if (!userInfo) return '';
    return (
        (userInfo.roleId != null ? String(userInfo.roleId) : '') ||
        (userInfo.RoleId != null ? String(userInfo.RoleId) : '') ||
        userInfo.roleCode ||
        userInfo.roleName ||
        userInfo.role ||
        userInfo.RoleCode ||
        userInfo.RoleName ||
        userInfo.Role ||
        ''
    );
};

/**
 * Kiểm tra có phải view dành cho Kế toán (ACCOUNTANTS) không
 * @param {string|null} permissionRole
 * @returns {boolean}
 */
export const isAccountantView = (permissionRole) => permissionRole === 'ACCOUNTANTS';

/**
 * Kiểm tra role có phải là permission role hợp lệ không
 * @param {string|null} role
 * @returns {boolean}
 */
export const isPermissionRoleValid = (role) => {
    return !!role && VALID_PERMISSION_ROLES.includes(role);
};

/**
 * Chuẩn hóa role từ backend sang permission role. Không trả default.
 * @param {string} originalRole - Role từ backend (roleCode hoặc roleName)
 * @returns {string|null} Một trong 6 role hợp lệ hoặc null nếu không nhận dạng được
 */
export const getPermissionRole = (originalRole) => {
    if (originalRole == null || String(originalRole).trim() === '') return null;
    const str = String(originalRole).trim();

    // Trường hợp backend trả roleId dạng số (1,2,3,...)
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

    // ADMIN: RoleCode thường là "ADMIN" hoặc "Admin"
    if (upper === 'ADMIN' || upper.includes('ADMIN')) return 'ADMIN';

    // DIRECTOR: "DIRECTOR", "Giám đốc", "GD"
    if (upper === 'GD') return 'DIRECTOR';

    // WAREHOUSE_KEEPER: "TK", "WH", "WHK", "WK", "WAREHOUSE"...
    if (upper === 'TK') return 'WAREHOUSE_KEEPER';

    // SALE_SUPPORT: kiểm tra trước SALE_ENGINEER vì "SALE" chung
    if (upper === 'SP') return 'SALE_SUPPORT';

    // SALE_ENGINEER: "SALE", "SALES", "SALE_ENGINEER"...
    if (upper === 'SE') return 'SALE_ENGINEER';

    // ACCOUNTANTS: "KT" (Kế toán), "ACCOUNTANTS", "ACCOUNTANT"
    if (upper === 'KT') return 'ACCOUNTANTS';
    return null;
};

/** Nhãn hiển thị cho permission role (dùng trong Sidebar, badge) */
export const PERMISSION_ROLE_LABELS = {
    ADMIN: 'Admin',
    DIRECTOR: 'Director',
    WAREHOUSE_KEEPER: 'Warehouse Keeper',
    SALE_SUPPORT: 'Sale Support',
    SALE_ENGINEER: 'Sale Engineer',
    ACCOUNTANTS: 'Accountants',
};

export const getPermissionRoleLabel = (permissionRole) => {
    return PERMISSION_ROLE_LABELS[permissionRole] ?? (permissionRole || 'Lỗi vai trò');
};
