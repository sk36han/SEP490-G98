/**
 * Cấu hình polling cho từng entity.
 *
 * - pageKey: key định danh trang (dùng trong pollingManager)
 * - fetchKey: key để trigger refresh khi có mutation liên quan
 * - paths: mảng route paths mà trang này quản lý
 * - interval: khoảng thời gian giữa 2 lần poll (ms), default 30000
 */

export const POLLING_INTERVAL_MS = 30_000;

export const pollingConfig = {
    // ── Product / Warehouse ──────────────────────────────────────
    items: {
        pageKey: 'items',
        fetchKey: 'Item',
        paths: ['/products', '/items', '/items/create', '/items/edit'],
        interval: 30_000,
    },
    categories: {
        pageKey: 'categories',
        fetchKey: 'Category',
        paths: ['/categories', '/categories/create', '/categories/edit'],
        interval: 30_000,
    },
    packagingSpecs: {
        pageKey: 'packagingSpecs',
        fetchKey: 'PackagingSpec',
        paths: ['/packaging-spec'],
        interval: 30_000,
    },
    specs: {
        pageKey: 'specs',
        fetchKey: 'Spec',
        paths: ['/specs'],
        interval: 30_000,
    },
    brands: {
        pageKey: 'brands',
        fetchKey: 'Brand',
        paths: ['/brands'],
        interval: 30_000,
    },
    uom: {
        pageKey: 'uom',
        fetchKey: 'Uom',
        paths: ['/uom'],
        interval: 30_000,
    },
    warehouses: {
        pageKey: 'warehouses',
        fetchKey: 'Warehouse',
        paths: ['/inventory', '/inventory/create', '/inventory/:id'],
        interval: 30_000,
    },

    // ── Inventory ───────────────────────────────────────────────
    stocktakes: {
        pageKey: 'stocktakes',
        fetchKey: 'Stocktake',
        paths: ['/inventory/stocktakes', '/inventory/stocktakes/:id'],
        interval: 30_000,
    },
    inventoryAdjustments: {
        pageKey: 'inventoryAdjustments',
        fetchKey: 'InventoryAdjustment',
        paths: ['/inventory/adjustments'],
        interval: 30_000,
    },

    // ── Purchase ────────────────────────────────────────────────
    purchaseOrders: {
        pageKey: 'purchaseOrders',
        fetchKey: 'PurchaseOrder',
        paths: ['/purchase-orders', '/purchase-orders/create', '/purchase-orders/:id'],
        interval: 30_000,
    },
    purchaseReturns: {
        pageKey: 'purchaseReturns',
        fetchKey: 'PurchaseReturn',
        paths: ['/purchase-returns', '/purchase-returns/create', '/purchase-returns/:id'],
        interval: 30_000,
    },

    // ── Release / Delivery ──────────────────────────────────────
    releaseRequests: {
        pageKey: 'releaseRequests',
        fetchKey: 'ReleaseRequest',
        paths: ['/release-request', '/release-request/create', '/release-request/:id'],
        interval: 30_000,
    },
    goodDeliveryNotes: {
        pageKey: 'goodDeliveryNotes',
        fetchKey: 'GoodsDeliveryNote',
        paths: ['/good-delivery-notes', '/good-delivery-notes/create', '/good-delivery-notes/detail'],
        interval: 30_000,
    },

    // ── Receipt ─────────────────────────────────────────────────
    goodReceiptNotes: {
        pageKey: 'goodReceiptNotes',
        fetchKey: 'GoodReceiptNote',
        paths: ['/good-receipt-notes', '/good-receipt-notes/create', '/good-receipt-notes/:id'],
        interval: 30_000,
    },

    // ── Master data ─────────────────────────────────────────────
    suppliers: {
        pageKey: 'suppliers',
        fetchKey: 'Supplier',
        paths: ['/suppliers', '/suppliers/create', '/suppliers/:id'],
        interval: 30_000,
    },
    receivers: {
        pageKey: 'receivers',
        fetchKey: 'Receiver',
        paths: ['/receivers', '/receivers/create', '/receivers/:id'],
        interval: 30_000,
    },
    // ── Admin ───────────────────────────────────────────────────
    users: {
        pageKey: 'users',
        fetchKey: 'User',
        paths: ['/admin/users', '/admin/users/deactivated'],
        interval: 30_000,
    },
    auditLog: {
        pageKey: 'auditLog',
        fetchKey: 'AuditLog',
        paths: ['/admin/audit-log'],
        interval: 30_000,
    },
};

/**
 * Map từ fetchKey → pageKey(s) cần refresh.
 * Một mutation key có thể affect nhiều list page.
 */
export function getAffectedPageKeys(fetchKey) {
    return Object.values(pollingConfig)
        .filter((cfg) => cfg.fetchKey === fetchKey)
        .map((cfg) => cfg.pageKey);
}

/**
 * Tìm pageKey từ pathname hiện tại.
 */
export function findPageKeyByPath(pathname) {
    for (const cfg of Object.values(pollingConfig)) {
        if (cfg.paths.some((p) => matchesPath(pathname, p))) {
            return cfg.pageKey;
        }
    }
    return null;
}

function matchesPath(pathname, pattern) {
    if (!pathname || !pattern) return false;
    // Xử lý pattern có :param
    const regex = new RegExp(
        '^' + pattern.replace(/:[^/]+/g, '[^/]+') + '(/.*)?$'
    );
    return regex.test(pathname);
}