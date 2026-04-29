import {
    Box as BoxIcon,
    Users,
    FileText,
    Truck,
    ShoppingCart,
    Bell,
    ClipboardList,
    Warehouse,
    RotateCcw,
    BarChart3,
    DollarSign,
} from 'lucide-react';

const icon = (Icon) => <Icon size={22} />;

const COMMON_ITEMS = [];

const PRODUCT_MATCH_PATHS = {
    FULL: ['/products', '/categories', '/uom', '/packaging-spec', '/specs', '/brands'],
    BASIC: ['/products', '/uom', '/brands'],
    SALE_SUPPORT: ['/products', '/categories', '/brands'],
};

const createItem = ({ id, path, icon: itemIcon, label, children, matchPaths }) => {
    const item = { label };

    if (id) item.id = id;
    if (path) item.path = path;
    if (itemIcon) item.icon = itemIcon;
    if (Array.isArray(children) && children.length > 0) item.children = children;
    if (Array.isArray(matchPaths) && matchPaths.length > 0) item.matchPaths = matchPaths;

    return item;
};

const createChild = (path, label, extra = {}) => ({
    path,
    label,
    ...extra,
});

const matchesPath = (pathname, targetPath) => {
    if (!pathname || !targetPath) return false;
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

const getItemMatchPaths = (item) => {
    if (!item) return [];

    return [
        item.path,
        ...(Array.isArray(item.matchPaths) ? item.matchPaths : []),
        ...(Array.isArray(item.children) ? item.children.map((child) => child.path) : []),
    ].filter(Boolean);
};

export const isSidebarItemMatched = (item, pathname) => {
    return getItemMatchPaths(item).some((path) => matchesPath(pathname, path));
};

const dedupeMenuItems = (items) => {
    const map = new Map();

    items.forEach((item) => {
        const key = item.id || item.path || item.label;
        if (!map.has(key)) {
            map.set(key, item);
        }
    });

    return Array.from(map.values());
};

const menuCatalog = {
    adminUsers: createItem({
        id: 'user-mgmt',
        path: '/admin/users',
        icon: icon(Users),
        label: 'Người dùng',
        children: [
            createChild('/admin/users', 'Danh sách người dùng'),
            createChild('/admin/users', 'Thêm người dùng', { state: { openCreate: true } }),
            createChild('/admin/users/deactivated', 'Người dùng đã vô hiệu hóa'),
        ],
    }),
    adminAuditLog: createItem({
        path: '/admin/audit-log',
        icon: icon(ClipboardList),
        label: 'Audit Log hệ thống',
    }),

    warehouseProducts: createItem({
        id: 'products-mgmt',
        path: '/products',
        icon: icon(BoxIcon),
        label: 'Vật tư',
        matchPaths: PRODUCT_MATCH_PATHS.FULL,
        children: [
            createChild('/products', 'Danh sách vật tư'),
            createChild('/categories', 'Danh mục'),
            createChild('/uom', 'Đơn vị tính'),
            createChild('/packaging-spec', 'Quy cách đóng gói'),
            createChild('/specs', 'Thông số'),
            createChild('/brands', 'Thương hiệu'),
        ],
    }),
    saleSupportProducts: createItem({
        id: 'products-mgmt',
        path: '/products',
        icon: icon(BoxIcon),
        label: 'Vật tư',
        matchPaths: PRODUCT_MATCH_PATHS.SALE_SUPPORT,
        children: [
            createChild('/products', 'Danh sách vật tư'),
            createChild('/categories', 'Danh mục'),
            createChild('/brands', 'Thương hiệu'),
        ],
    }),
    saleEngineerProducts: createItem({
        id: 'products-mgmt',
        path: '/products',
        icon: icon(BoxIcon),
        label: 'Vật tư',
        matchPaths: PRODUCT_MATCH_PATHS.BASIC,
        children: [
            createChild('/products', 'Danh sách vật tư'),
            createChild('/uom', 'Đơn vị tính'),
            createChild('/brands', 'Thương hiệu'),
        ],
    }),

    warehouseInventory: createItem({
        id: 'inventory-mgmt',
        path: '/inventory',
        icon: icon(Warehouse),
        label: 'Quản lý kho',
        children: [
            createChild('/inventory', 'Danh sách kho'),
            createChild('/inventory/storage-locations', 'Vị trí lưu trữ'),
            createChild('/inventory/stocktakes', 'Kiểm kê kho'),
            createChild('/inventory/adjustments', 'Điều chỉnh tồn kho'),
        ],
    }),
    simpleInventory: createItem({
        id: 'inventory-mgmt',
        path: '/inventory',
        icon: icon(Warehouse),
        label: 'Quản lý kho',
        children: [
            createChild('/inventory', 'Danh sách kho'),
            createChild('/inventory/storage-locations', 'Vị trí lưu trữ'),
        ],
    }),

    inventoryAlert: createItem({
        path: '/mockup/inventory-alert',
        icon: icon(Bell),
        label: 'Cảnh báo tồn kho',
    }),

    suppliersSimple: createItem({
        path: '/suppliers',
        icon: icon(Truck),
        label: 'Nhà cung cấp',
    }),
    suppliersManage: createItem({
        id: 'suppliers-mgmt',
        path: '/suppliers',
        icon: icon(Truck),
        label: 'Nhà cung cấp',
        children: [
            createChild('/suppliers', 'Danh sách nhà cung cấp'),
        ],
    }),

    receiversSimple: createItem({
        path: '/receivers',
        icon: icon(Users),
        label: 'Người nhận',
    }),
    receiversManage: createItem({
        id: 'receivers-mgmt',
        path: '/receivers',
        icon: icon(Users),
        label: 'Người nhận',
        children: [
            createChild('/receivers', 'Danh sách người nhận'),
        ],
    }),

    purchaseOrdersList: createItem({
        id: 'purchase-orders-mgmt',
        path: '/purchase-orders',
        icon: icon(ShoppingCart),
        label: 'Đơn mua',
        children: [
            createChild('/purchase-orders', 'Danh sách đơn mua'),
        ],
    }),
    purchaseOrdersManage: createItem({
        id: 'purchase-orders-mgmt',
        path: '/purchase-orders',
        icon: icon(ShoppingCart),
        label: 'Đơn mua',
        children: [
            createChild('/purchase-orders', 'Danh sách đơn mua'),
        ],
    }),

    goodReceiptNotesList: createItem({
        id: 'good-receipt-notes-mgmt',
        path: '/good-receipt-notes',
        icon: icon(FileText),
        label: 'Phiếu nhập kho',
        children: [
            createChild('/good-receipt-notes', 'Danh sách phiếu nhập kho'),
        ],
    }),
    goodReceiptNotesManage: createItem({
        id: 'good-receipt-notes-mgmt',
        path: '/good-receipt-notes',
        icon: icon(FileText),
        label: 'Phiếu nhập kho',
        children: [
            createChild('/good-receipt-notes', 'Danh sách phiếu nhập kho'),
        ],
    }),

    releaseRequestsList: createItem({
        id: 'release-request-mgmt',
        path: '/release-request',
        icon: icon(FileText),
        label: 'Yêu cầu xuất hàng',
        children: [
            createChild('/release-request', 'Danh sách yêu cầu xuất hàng'),
        ],
    }),
    releaseRequestsManage: createItem({
        id: 'release-request-mgmt',
        path: '/release-request',
        icon: icon(FileText),
        label: 'Yêu cầu xuất hàng',
        children: [
            createChild('/release-request', 'Danh sách yêu cầu xuất hàng'),
        ],
    }),

    goodsDeliveryNotesManage: createItem({
        id: 'good-delivery-notes-mgmt',
        path: '/good-delivery-notes',
        icon: icon(FileText),
        label: 'Phiếu xuất hàng',
        children: [
            createChild('/good-delivery-notes', 'Danh sách phiếu xuất hàng'),
        ],
    }),

    purchaseReturnsList: createItem({
        id: 'purchase-returns-mgmt',
        path: '/purchase-returns',
        icon: icon(RotateCcw),
        label: 'Trả hàng',
        children: [
            createChild('/purchase-returns', 'Danh sách phiếu trả hàng'),
        ],
    }),

    /** Tạm ẩn — bật lại: thêm menuCatalog.deliveries vào roleMenus (WAREHOUSE_KEEPER, SALE_ENGINEER, …). */
    // deliveries: createItem({
    //     id: 'deliveries-mgmt',
    //     path: '/deliveries',
    //     icon: icon(MapPin),
    //     label: 'Giao hàng',
    //     children: [
    //         createChild('/deliveries', 'Danh sách giao hàng'),
    //     ],
    // }),

    itemPrices: createItem({
        path: '/item-prices',
        icon: icon(DollarSign),
        label: 'Giá vật tư',
    }),
    policy: createItem({
        id: 'policy-mgmt',
        icon: icon(Bell),
        label: 'Chính sách',
        children: [
            createChild('/mockup/inventory-alert', 'Chính sách tồn kho'),
        ],
    }),
    reports: createItem({
        id: 'reports-mgmt',
        path: '/reports',
        icon: icon(BarChart3),
        label: 'Báo cáo',
        children: [
            createChild('/reports/sales', 'Báo cáo tài chính'),
        ],
    }),
};

const roleMenus = {
    ADMIN: [
        menuCatalog.adminUsers,
        menuCatalog.adminAuditLog,
    ],
    WAREHOUSE_KEEPER: [
        ...COMMON_ITEMS,
        menuCatalog.warehouseProducts,
        menuCatalog.warehouseInventory,
        menuCatalog.inventoryAlert,
        menuCatalog.suppliersSimple,
        menuCatalog.receiversSimple,
        menuCatalog.purchaseOrdersList,
        menuCatalog.goodReceiptNotesManage,
        menuCatalog.releaseRequestsManage,
        menuCatalog.goodsDeliveryNotesManage,
        menuCatalog.purchaseReturnsList,
    ],
    SALE_SUPPORT: [
        ...COMMON_ITEMS,
        menuCatalog.saleSupportProducts,
        menuCatalog.simpleInventory,
        menuCatalog.inventoryAlert,
        menuCatalog.suppliersSimple,
        menuCatalog.purchaseOrdersManage,
        menuCatalog.goodReceiptNotesList,
    ],
    SALE_ENGINEER: [
        ...COMMON_ITEMS,
        menuCatalog.saleEngineerProducts,
        menuCatalog.receiversSimple,
        menuCatalog.releaseRequestsManage,
        menuCatalog.goodsDeliveryNotesManage,
    ],
    ACCOUNTANTS: [
        ...COMMON_ITEMS,
        menuCatalog.warehouseInventory,
        menuCatalog.suppliersManage,
        menuCatalog.receiversManage,
        menuCatalog.purchaseOrdersList,
        menuCatalog.goodReceiptNotesList,
        menuCatalog.purchaseReturnsList,
        menuCatalog.releaseRequestsList,
        menuCatalog.goodsDeliveryNotesManage,
        menuCatalog.itemPrices,
        menuCatalog.policy,
    ],
};

roleMenus.DIRECTOR = dedupeMenuItems([
    ...roleMenus.ADMIN,
    ...roleMenus.WAREHOUSE_KEEPER,
    ...roleMenus.SALE_SUPPORT,
    ...roleMenus.SALE_ENGINEER,
    ...roleMenus.ACCOUNTANTS,
    menuCatalog.reports,
    ...COMMON_ITEMS,
]);

export const getMenuItems = (role) => {
    return roleMenus[role] || [...COMMON_ITEMS];
};