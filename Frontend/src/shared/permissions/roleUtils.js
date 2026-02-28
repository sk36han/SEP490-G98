/** Các role hợp lệ – không có default, role không map được = không cho đăng nhập */
export const VALID_PERMISSION_ROLES = ['ADMIN', 'DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'];

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
    const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    // ADMIN: RoleCode thường là "ADMIN" hoặc "Admin"
    if (upper === 'ADMIN' || upper.includes('ADMIN')) return 'ADMIN';

    // DIRECTOR: "DIRECTOR", "Giám đốc", "GD"
    if (upper === 'GD' || upper.includes('GIÁM ĐỐC') || upper.includes('DIRECTOR') || noDiacritics.includes('GIAM DOC')) return 'DIRECTOR';

    // WAREHOUSE_KEEPER: "TK", "WH", "WHK", "WK", "WAREHOUSE"...
    if (
        upper === 'TK' ||
        upper === 'WH' ||
        upper === 'WHK' ||
        upper === 'WK' ||
        upper === 'THU_KHO' ||
        upper.includes('WAREHOUSE_KEEPER') ||
        upper.includes('WAREHOUSE KEEPER') ||
        upper.includes('WAREHOUSE') ||
        noDiacritics.includes('THU KHO') ||
        noDiacritics.includes('THUKHO')
    ) return 'WAREHOUSE_KEEPER';

    // SALE_SUPPORT: kiểm tra trước SALE_ENGINEER vì "SALE" chung
    if (
        upper === 'SS' ||
        upper.includes('SALE SUPPORT') ||
        upper.includes('SALE_SUPPORT') ||
        noDiacritics.includes('SALE SUPPORT')
    ) return 'SALE_SUPPORT';

    // SALE_ENGINEER: "SALE", "SALES", "SALE_ENGINEER"...
    if (
        upper === 'SALE' ||
        upper === 'SALES' ||
        upper === 'SALEENGINEER' ||
        upper.includes('SALE ENGINEER') ||
        upper.includes('SALE_ENGINEER') ||
        noDiacritics.includes('SALE ENGINEER')
    ) return 'SALE_ENGINEER';

    // ACCOUNTANTS: "KT" (Kế toán), "ACCOUNTANTS", "ACCOUNTANT"
    if (
        upper === 'KT' ||
        upper === 'ACCOUNTANTS' ||
        upper.includes('ACCOUNTANT') ||
        upper.includes('KẾ TOÁN') ||
        noDiacritics.includes('KE TOAN')
    ) return 'ACCOUNTANTS';
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
