import {
    LayoutDashboard,
    Box as BoxIcon,
    Users,
    User,
    FileText,
    Truck,
    Bell,
    ClipboardList,
    Warehouse,
} from 'lucide-react';

const commonItems = [
    { path: '/profile', icon: <User size={22} />, label: 'Hồ sơ cá nhân' },
];

// Admin: Quản lý người dùng, Hồ sơ cá nhân, Cài đặt thông báo, Audit Log hệ thống
const adminItems = [
    { path: '/admin/users', icon: <Users size={22} />, label: 'Quản lý người dùng' },
    { path: '/profile', icon: <User size={22} />, label: 'Hồ sơ cá nhân' },
    { path: '/admin/notifications', icon: <Bell size={22} />, label: 'Cài đặt thông báo' },
    { path: '/admin/audit-log', icon: <ClipboardList size={22} />, label: 'Audit Log hệ thống' },
];

// Director: cùng quyền menu như Admin
const directorItems = [
    { path: '/admin/users', icon: <Users size={22} />, label: 'Quản lý người dùng' },
    { path: '/profile', icon: <User size={22} />, label: 'Hồ sơ cá nhân' },
    { path: '/admin/notifications', icon: <Bell size={22} />, label: 'Cài đặt thông báo' },
    { path: '/admin/audit-log', icon: <ClipboardList size={22} />, label: 'Audit Log hệ thống' },
];

// Warehouse Keeper: Danh sách vật tư, Quản lý kho, Yêu cầu nhập/xuất hàng
const warehouseKeeperItems = [
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Danh sách vật tư' },
    { path: '/inventory', icon: <Warehouse size={22} />, label: 'Quản lý kho' },
    { path: '/good-receipt-notes', icon: <FileText size={22} />, label: 'Yêu cầu nhập hàng' },
    { path: '/good-delivery-notes', icon: <FileText size={22} />, label: 'Yêu cầu xuất hàng' },
];

// Sale Support: Quản lý nhà cung cấp, Quản lý đơn mua hàng, Vật tư
const saleSupportItems = [
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Quản lý nhà cung cấp' },
    { path: '/purchase-orders', icon: <FileText size={22} />, label: 'Quản lý đơn mua hàng' },
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Quản lý vật tư' },
];

// Sale Engineer: Danh sách vật tư, Nhà cung cấp
const saleEngineerItems = [
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Danh sách vật tư' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
];

// Accountants (Kế toán): Hồ sơ của tôi, Quản lý vật tư
const accountantsItems = [
    { path: '/profile', icon: <User size={22} />, label: 'Hồ sơ của tôi' },
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Quản lý vật tư' },
];

/**
 * Get menu items based on user permission role
 * @param {string} role - 'ADMIN' | 'DIRECTOR' | 'WAREHOUSE_KEEPER' | 'SALE_SUPPORT' | 'SALE_ENGINEER' | 'ACCOUNTANTS'
 * @returns {Array} Menu items with path, icon, label
 */
export const getMenuItems = (role) => {
    if (!role) return commonItems;
    if (role === 'ADMIN') return adminItems;
    if (role === 'DIRECTOR') return directorItems;
    if (role === 'WAREHOUSE_KEEPER') return [...commonItems, ...warehouseKeeperItems];
    if (role === 'SALE_SUPPORT') return [...commonItems, ...saleSupportItems];
    if (role === 'SALE_ENGINEER') return [...commonItems, ...saleEngineerItems];
    if (role === 'ACCOUNTANTS') return accountantsItems;
    return commonItems;
};
