/**
 * Normalize backend role to permission role (ADMIN, MANAGER, WAREHOUSE_KEEPER, SALE_SUPPORT, STAFF)
 * @param {string} originalRole - Role from backend (roleCode or roleName)
 * @returns {string} 'ADMIN' | 'MANAGER' | 'WAREHOUSE_KEEPER' | 'SALE_SUPPORT' | 'STAFF'
 */
export const getPermissionRole = (originalRole) => {
    if (!originalRole) return 'STAFF';
    const str = String(originalRole).trim();
    const upper = str.toUpperCase();
    const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (upper.includes('ADMIN')) return 'ADMIN';
    if (upper.includes('GIÁM ĐỐC') || upper.includes('DIRECTOR')) return 'ADMIN';
    // Thủ kho = Warehouse Keeper - home là trang quản lý sản phẩm
    if (upper.includes('THỦ KHO') || noDiacritics.includes('THU KHO') || upper.includes('WAREHOUSE_KEEPER')) return 'WAREHOUSE_KEEPER';
    if (upper.includes('MANAGER') || upper.includes('QUẢN LÝ')) return 'MANAGER';
    // Sale Support - hỗ trợ bán hàng: xem đơn hàng, xem sản phẩm, hồ sơ
    if (upper.includes('SALE SUPPORT') || upper.includes('SALE_SUPPORT') || noDiacritics.includes('SALE SUPPORT')) return 'SALE_SUPPORT';
    return 'STAFF';
};

/** Nhãn hiển thị cho permission role (dùng trong Sidebar, badge) */
export const PERMISSION_ROLE_LABELS = {
    ADMIN: 'Admin',
    MANAGER: 'Quản lý',
    WAREHOUSE_KEEPER: 'Thủ kho',
    SALE_SUPPORT: 'Sale Support',
    STAFF: 'Nhân viên',
};

export const getPermissionRoleLabel = (permissionRole) => {
    return PERMISSION_ROLE_LABELS[permissionRole] || permissionRole || 'Nhân viên';
};
