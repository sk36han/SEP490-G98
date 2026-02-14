/**
 * Normalize backend role to permission role (ADMIN, MANAGER, WAREHOUSE_KEEPER, STAFF)
 * @param {string} originalRole - Role from backend (roleCode or roleName)
 * @returns {string} 'ADMIN' | 'MANAGER' | 'WAREHOUSE_KEEPER' | 'STAFF'
 */
export const getPermissionRole = (originalRole) => {
    if (!originalRole) return 'STAFF';
    const str = String(originalRole);
    const upper = str.toUpperCase();
    const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (upper.includes('ADMIN')) return 'ADMIN';
    if (upper.includes('GIÁM ĐỐC') || upper.includes('DIRECTOR')) return 'ADMIN';
    // Thủ kho = Warehouse Keeper - home là trang quản lý sản phẩm
    if (upper.includes('THỦ KHO') || noDiacritics.includes('THU KHO') || upper.includes('WAREHOUSE')) return 'WAREHOUSE_KEEPER';
    if (upper.includes('MANAGER') || upper.includes('QUẢN LÝ')) return 'MANAGER';
    return 'STAFF';
};
