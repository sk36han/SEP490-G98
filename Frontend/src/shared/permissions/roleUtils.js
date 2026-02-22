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
    const upper = str.toUpperCase();
    const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (upper.includes('ADMIN')) return 'ADMIN';
    if (upper.includes('GIÁM ĐỐC') || upper.includes('DIRECTOR') || noDiacritics.includes('GIAM DOC')) return 'DIRECTOR';
    if (upper.includes('THỦ KHO') || noDiacritics.includes('THU KHO') || noDiacritics.includes('THUKHO') || upper.includes('WAREHOUSE_KEEPER') || upper.includes('WAREHOUSE KEEPER') || upper === 'WK' || upper === 'WHK' || upper === 'THU_KHO') return 'WAREHOUSE_KEEPER';
    if (upper.includes('SALE SUPPORT') || upper.includes('SALE_SUPPORT') || noDiacritics.includes('SALE SUPPORT')) return 'SALE_SUPPORT';
    if (upper.includes('SALE ENGINEER') || upper.includes('SALE_ENGINEER') || noDiacritics.includes('SALE ENGINEER')) return 'SALE_ENGINEER';
    if (upper === 'ACCOUNTANTS' || upper.includes('KẾ TOÁN') || noDiacritics.includes('KE TOAN') || upper.includes('ACCOUNTANT')) return 'ACCOUNTANTS';
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
