import apiClient from './axios';

/**
 * Item API – kết nối ItemController.
 * GET display-all → danh sách ItemDisplayResponse (dùng cho ViewItemList).
 * GET display/{id} → chi tiết (dùng cho ViewItemDetail).
 * PATCH {id}/status?isActive= → đổi trạng thái giao dịch.
 */

/**
 * Lấy toàn bộ danh sách vật tư để hiển thị (list).
 * Backend trả: { success, message, data: ItemDisplayResponse[] }
 * @returns {Promise<{ itemId, itemCode, itemName, ... }[]>}
 */
export async function getItemsForDisplay() {
    const response = await apiClient.get('/Item/display-all');
    const data = response?.data;
    const rawList = data?.data ?? data?.Data ?? (Array.isArray(data) ? data : []);
    const list = Array.isArray(rawList) ? rawList : [];
    return list.map((row) => mapItemDisplayRow(row));
}

/**
 * Chuẩn hóa một dòng từ API (PascalCase hoặc camelCase) sang camelCase cho frontend.
 */
function mapItemDisplayRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        itemType: row.itemType ?? row.ItemType ?? null,
        description: row.description ?? row.Description ?? null,
        categoryName: row.categoryName ?? row.CategoryName ?? null,
        requiresCO: row.requiresCo ?? row.RequiresCo ?? false,
        requiresCQ: row.requiresCq ?? row.RequiresCq ?? false,
        isActive: row.isActive ?? row.IsActive ?? true,
        inventoryAccount: row.inventoryAccount ?? row.InventoryAccount ?? null,
        revenueAccount: row.revenueAccount ?? row.RevenueAccount ?? null,
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
        updatedAt: row.updatedAt ?? row.UpdatedAt ?? null,
        purchasePrice: row.purchasePrice ?? row.PurchasePrice ?? null,
        salePrice: row.salePrice ?? row.SalePrice ?? null,
        onHandQty: row.onHandQty ?? row.OnHandQty ?? 0,
        reservedQty: row.reservedQty ?? row.ReservedQty ?? 0,
        availableQty: row.availableQty ?? row.AvailableQty ?? 0,
    };
}

/**
 * Tạo vật tư mới.
 * POST /Item/create-item – body CreateItemRequest (camelCase).
 * @param {Object} payload - itemCode, itemName, itemType?, description?, categoryId, brandId?, baseUomId, packagingSpecId?, requiresCo, requiresCq, isActive, defaultWarehouseId?, inventoryAccount?, revenueAccount?, initialPurchasePrice?, priceEffectiveFrom?
 * @returns {Promise<{ success, message, data: { itemId, itemCode, itemName, isActive } }>}
 */
export async function createItem(payload) {
    const response = await apiClient.post('/Item/create-item', payload);
    return response?.data;
}

/**
 * Cập nhật trạng thái giao dịch (bật/tắt) của vật tư.
 * PATCH /Item/{id}/status?isActive=true|false
 * @param {number|string} itemId
 * @param {boolean} isActive
 */
export async function updateItemStatus(itemId, isActive) {
    const response = await apiClient.patch(`/Item/${itemId}/status`, null, {
        params: { isActive: !!isActive },
    });
    return response?.data;
}
