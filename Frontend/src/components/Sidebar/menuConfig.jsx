import {
    LayoutDashboard,
    Box as BoxIcon,
    Users,
    FileText,
    Truck,
    ShoppingCart,
    Bell,
    ClipboardList,
    Warehouse,
    RotateCcw,
} from 'lucide-react';

const commonItems = [];

const FULL_PRODUCT_MATCH_PATHS = ['/products', '/categories', '/uom', '/packaging-spec', '/specs', '/brands'];
const BASIC_PRODUCT_MATCH_PATHS = ['/products', '/uom', '/brands'];

const matchesPath = (pathname, targetPath) => {
    if (!pathname || !targetPath) return false;
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

export const isSidebarItemMatched = (item, pathname) => {
    if (!item) return false;

    if (Array.isArray(item.matchPaths) && item.matchPaths.some((path) => matchesPath(pathname, path))) {
        return true;
    }

    if (Array.isArray(item.children) && item.children.some((child) => matchesPath(pathname, child.path))) {
        return true;
    }

    return matchesPath(pathname, item.path);
};

const directorItems = [
    { path: '/home', icon: <LayoutDashboard size={22} />, label: 'Trang chủ' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
];

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

const warehouseKeeperItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        matchPaths: FULL_PRODUCT_MATCH_PATHS,
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
            { path: '/categories', label: 'Danh mục' },
            { path: '/uom', label: 'Đơn vị tính' },
            { path: '/packaging-spec', label: 'Quy cách đóng gói' },
            { path: '/specs', label: 'Thông số' },
            { path: '/brands', label: 'Thương hiệu' },
        ],
    },
    { path: '/inventory', icon: <Warehouse size={22} />, label: 'Quản lý kho' },
    { path: '/suppliers', icon: <Truck size={22} />, label: 'Nhà cung cấp' },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
    {
        id: 'good-receipt-notes-mgmt',
        path: '/good-receipt-notes',
        icon: <FileText size={22} />,
        label: 'Phiếu nhập kho',
        children: [
            { path: '/good-receipt-notes', label: 'Danh sách phiếu nhập kho' },
            { path: '/good-receipt-notes/create', label: 'Tạo phiếu nhập kho' },
        ],
    },
    { path: '/good-delivery-notes', icon: <FileText size={22} />, label: 'Yêu cầu xuất hàng' },
];

const saleSupportItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        matchPaths: BASIC_PRODUCT_MATCH_PATHS,
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
            { path: '/uom', label: 'Đơn vị tính' },
            { path: '/brands', label: 'Thương hiệu' },
        ],
    },
    {
        id: 'suppliers-mgmt',
        path: '/suppliers',
        icon: <Truck size={22} />,
        label: 'Nhà cung cấp',
        children: [
            { path: '/suppliers', label: 'Danh sách nhà cung cấp' },
            { path: '/suppliers/create', label: 'Tạo nhà cung cấp' },
        ],
    },
    {
        id: 'purchase-orders-mgmt',
        path: '/purchase-orders',
        icon: <ShoppingCart size={22} />,
        label: 'Đơn mua',
        sublabel: 'Purchase Order',
        children: [
            { path: '/purchase-orders', label: 'Danh sách đơn mua hàng' },
            { path: '/purchase-orders/create', label: 'Tạo đơn mua hàng' },
        ],
    },
];

const saleEngineerItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        matchPaths: BASIC_PRODUCT_MATCH_PATHS,
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
            { path: '/uom', label: 'Đơn vị tính' },
            { path: '/brands', label: 'Thương hiệu' },
        ],
    },
    { path: '/receivers', icon: <Users size={22} />, label: 'Người nhận' },
];

const accountantItems = [
    {
        id: 'products-mgmt',
        path: '/products',
        icon: <BoxIcon size={22} />,
        label: 'Vật tư',
        matchPaths: BASIC_PRODUCT_MATCH_PATHS,
        children: [
            { path: '/products', label: 'Danh sách vật tư' },
            { path: '/uom', label: 'Đơn vị tính' },
            { path: '/brands', label: 'Thương hiệu' },
        ],
    },
    {
        id: 'purchase-orders-mgmt',
        path: '/purchase-orders',
        icon: <ShoppingCart size={22} />,
        label: 'Đơn mua',
        children: [{ path: '/purchase-orders', label: 'Danh sách đơn mua' }],
    },
    {
        id: 'good-receipt-notes-mgmt',
        path: '/good-receipt-notes',
        icon: <FileText size={22} />,
        label: 'Phiếu nhập kho',
        children: [
            { path: '/good-receipt-notes', label: 'Danh sách phiếu nhập kho' },
            { path: '/good-receipt-notes/create', label: 'Tạo phiếu nhập kho' },
        ],
    },
    {
        id: 'purchase-returns-mgmt',
        path: '/purchase-returns',
        icon: <RotateCcw size={22} />,
        label: 'Trả hàng',
        children: [
            { path: '/purchase-returns', label: 'Danh sách phiếu trả hàng' },
        ],
    },
    { path: '/good-delivery-notes', icon: <FileText size={22} />, label: 'Yêu cầu xuất hàng' },
    { path: '/reports', icon: <FileText size={22} />, label: 'Báo cáo' },
];

export const getMenuItems = (role) => {
    if (role === 'ADMIN') return adminItems;
    if (role === 'DIRECTOR') return [...directorItems, ...commonItems];
    if (role === 'WAREHOUSE_KEEPER') return [...commonItems, ...warehouseKeeperItems];
    if (role === 'SALE_SUPPORT') return [...commonItems, ...saleSupportItems];
    if (role === 'SALE_ENGINEER') return [...commonItems, ...saleEngineerItems];
    if (role === 'ACCOUNTANTS') return [...commonItems, ...accountantItems];
    return [...commonItems];
};