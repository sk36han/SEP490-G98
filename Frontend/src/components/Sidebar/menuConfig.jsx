import {
    LayoutDashboard,
    Box as BoxIcon,
    Users,
    Settings,
    User,
    FileText,
    Truck,
    ShoppingCart,
    Bell,
    ClipboardList,
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

// Manager: có Danh sách vật tư, không có Đơn mua hàng
const managerItems = [
    { path: '/manager/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Danh sách vật tư' },
    { path: '/inventory', icon: <BoxIcon size={22} />, label: 'Quản lý kho' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
    { path: '/reports', icon: <FileText size={22} />, label: 'Báo cáo' },
];

// Staff: có Danh sách vật tư (public trừ Admin)
const staffItems = [
    { path: '/staff/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Danh sách vật tư' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
];

// Thủ kho: có Danh sách vật tư, không có Đơn mua hàng
const warehouseKeeperItems = [
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Danh sách vật tư' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
];

// Sale Support: Quản lý nhà cung cấp, Quản lý đơn mua hàng, Xem vật tư
const saleSupportItems = [
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Quản lý nhà cung cấp' },
    { path: '/purchase-orders', icon: <FileText size={22} />, label: 'Quản lý đơn mua hàng' },
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Xem vật tư' },
];

/**
 * Get menu items based on user permission role
 * @param {string} role - 'ADMIN' | 'MANAGER' | 'WAREHOUSE_KEEPER' | 'SALE_SUPPORT' | 'STAFF'
 * @returns {Array} Menu items with path, icon, label
 */
export const getMenuItems = (role) => {
    if (role === 'ADMIN') {
        return adminItems;
    }
    if (role === 'WAREHOUSE_KEEPER') {
        return [...commonItems, ...warehouseKeeperItems];
    }
    if (role === 'SALE_SUPPORT') {
        return [...commonItems, ...saleSupportItems];
    }
    if (role === 'MANAGER' || role === 'Warehouse Manager') {
        return [...commonItems, ...managerItems];
    }
    return [...commonItems, ...staffItems];
};
