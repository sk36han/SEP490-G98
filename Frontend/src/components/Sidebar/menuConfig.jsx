import {
    LayoutDashboard,
    Box as BoxIcon,
    Users,
    Settings,
    User,
    FileText,
    Truck,
    ShoppingCart,
} from 'lucide-react';

const commonItems = [
    { path: '/profile', icon: <User size={22} />, label: 'Hồ sơ cá nhân' },
];

const adminItems = [
    { path: '/admin/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/admin/users', icon: <Users size={22} />, label: 'Quản lý người dùng' },
    { path: '/inventory', icon: <BoxIcon size={22} />, label: 'Quản lý kho' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
    { path: '/reports', icon: <FileText size={22} />, label: 'Báo cáo' },
    { path: '/settings', icon: <Settings size={22} />, label: 'Cài đặt' },
];

const managerItems = [
    { path: '/manager/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/inventory', icon: <BoxIcon size={22} />, label: 'Quản lý kho' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
    { path: '/reports', icon: <FileText size={22} />, label: 'Báo cáo' },
];

const staffItems = [
    { path: '/staff/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
];

// Thủ kho - Home = Quản lý sản phẩm
const warehouseKeeperItems = [
    { path: '/products', icon: <BoxIcon size={22} />, label: 'Quản lý sản phẩm' },
    { path: '/orders', icon: <ShoppingCart size={22} />, label: 'Đơn hàng' },
];

/**
 * Get menu items based on user permission role
 * @param {string} role - 'ADMIN' | 'MANAGER' | 'WAREHOUSE_KEEPER' | 'STAFF'
 * @returns {Array} Menu items with path, icon, label
 */
export const getMenuItems = (role) => {
    if (role === 'ADMIN') {
        return [...commonItems, ...adminItems];
    }
    if (role === 'WAREHOUSE_KEEPER') {
        return [...commonItems, ...warehouseKeeperItems];
    }
    if (role === 'MANAGER' || role === 'Warehouse Manager') {
        return [...commonItems, ...managerItems];
    }
    return [...commonItems, ...staffItems];
};
