import {
    LayoutDashboard,
    Box as BoxIcon,
    Users,
    User,
    FileText,
    Truck,
    ShoppingCart,
    Bell,
    ClipboardList,
    Warehouse,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSuitcase } from '@fortawesome/free-solid-svg-icons';

const brandIcon = <FontAwesomeIcon icon={faSuitcase} style={{ fontSize: 22 }} />;

// Hồ sơ cá nhân không hiển thị trong sidebar — mở từ dropdown avatar trên header
const commonItems = [];

// Giám đốc: Home Dashboard + Supplier + Receiver
const directorItems = [
    { path: '/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
];

// Admin: Quản lý người dùng (mục cha có dropdown con), Hồ sơ cá nhân, Cài đặt thông báo, Audit Log
const adminItems = [
    {
        id: 'user-mgmt',
        path: '/admin/users',
        icon: <Users size={22} />,
        label: 'Người dùng',
        children: [
            { path: '/admin/users', label: 'Danh sách người dùng' },
            { path: '/admin/users', label: 'Thêm người dùng', state: { openCreate: true } },
            { path: '/admin/users/deactivated', label: 'Người dùng đã vô hiệu hóa' },
        ],
    },
    { path: '/admin/notifications', icon: <Bell size={22} />, label: 'Cài đặt thông báo' },
    { path: '/admin/audit-log', icon: <ClipboardList size={22} />, label: 'Audit Log hệ thống' },
];

// Thủ kho: Vật tư (mục cha), Quản lý kho, Nhà cung cấp, Người nhận, Yêu cầu nhập/xuất hàng
const warehouseKeeperItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
            { path: '/categories', label: 'Danh mục sản phẩm' },
            { path: '/packaging-spec', label: 'Quy cách' },
            { path: '/specs', label: 'Thông số' },
        ],
    },
    { path: '/brands', icon: brandIcon, label: 'Thương hiệu' },
    { path: '/inventory', icon: <Warehouse size={22} />, label: 'Quản lý kho' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
    { path: '/good-receipt-notes', icon: <FileText size={22} />, label: 'Yêu cầu nhập hàng' },
    { path: '/good-delivery-notes', icon: <FileText size={22} />, label: 'Yêu cầu xuất hàng' },
];

// Sale Support: Vật tư (mục cha), Brand, Nhà cung cấp, Đơn mua (PO)
const saleSupportItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
        ],
    },
    { path: '/brands', icon: brandIcon, label: 'Thương hiệu' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Quản lý nhà cung cấp' },
    {
        id: 'purchase-orders-mgmt',
        path: '/purchase-orders',
        icon: <ShoppingCart size={22} />,
        label: 'Quản lý đơn mua',
        sublabel: 'Purchase Order',
        children: [
            { path: '/purchase-orders', label: 'Danh sách đơn mua hàng' },
            { path: '/purchase-orders/create', label: 'Tạo đơn mua hàng' },
        ],
    },
];

// Sale Engineer: Vật tư (mục cha), Brand, Người nhận hàng
const saleEngineerItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
        ],
    },
    { path: '/brands', icon: brandIcon, label: 'Thương hiệu' },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
];

// Kế toán: Vật tư (mục cha), Yêu cầu nhập/xuất hàng, Báo cáo
const accountantItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
        ],
    },
    { path: '/brands', icon: brandIcon, label: 'Thương hiệu' },
    { path: '/good-receipt-notes', icon: <FileText size={22} />, label: 'Yêu cầu nhập hàng' },
    { path: '/good-delivery-notes', icon: <FileText size={22} />, label: 'Yêu cầu xuất hàng' },
    { path: '/reports', icon: <FileText size={22} />, label: 'Báo cáo' },
];

/**
 * Get menu items based on user permission role.
 * Roles: ADMIN, DIRECTOR, WAREHOUSE_KEEPER, ACCOUNTANTS, SALE_SUPPORT, SALE_ENGINEER
 */
export const getMenuItems = (role) => {
    if (role === 'ADMIN') {
        return adminItems;
    }
    if (role === 'DIRECTOR') {
        return [...directorItems, ...commonItems];
    }
    if (role === 'WAREHOUSE_KEEPER') {
        return [...commonItems, ...warehouseKeeperItems];
    }
    if (role === 'SALE_SUPPORT') {
        return [...commonItems, ...saleSupportItems];
    }
    if (role === 'SALE_ENGINEER') {
        return [...commonItems, ...saleEngineerItems];
    }
    if (role === 'ACCOUNTANTS') {
        return [...commonItems, ...accountantItems];
    }
    return [...commonItems];
};
