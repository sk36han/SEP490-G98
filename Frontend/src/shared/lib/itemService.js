import apiClient from './axios';
import { invalidate } from './pollingManager';

/**
 * Item API – kết nối ItemController.
 * GET display-all → danh sách ItemDisplayResponse (dùng cho ViewItemList).
 * GET display/{id} → chi tiết (dùng cho ViewItemDetail).
 * PATCH {id}/status?isActive= → đổi trạng thái giao dịch.
 */

/**
 * Lấy chi tiết một vật tư theo ID.
 * GET /Item/detail/{id} → ItemDetailResponse.
 * Backend trả: { success, message, data: ItemDetailResponse } hoặc trả trực tiếp ItemDetailResponse.
 */
export async function getItemDetail(itemId, historyPage = 1, historyPageSize = 10) {
    const response = await apiClient.get(`/Item/detail/${itemId}?historyPage=${historyPage}&historyPageSize=${historyPageSize}`);
    const payload = response?.data?.data ?? response?.data ?? {};
    // Backend trả data lồng: { productInfo, variantsByWarehouse, inventoryHistory }
    const productInfo = payload.productInfo ?? payload ?? {};
    const rawHistory = payload.inventoryHistory ?? payload.InventoryHistory ?? [];
    const rawWarehouse = payload.variantsByWarehouse ?? payload.VariantsByWarehouse ?? [];
    return {
        ...mapItemDetailRow(productInfo),
        inventoryHistory: rawHistory.map(mapInventoryHistoryRow),
        inventoryByWarehouse: rawWarehouse.map(mapInventoryByWarehouseRow),
        historyTotalCount: payload.historyTotalCount ?? payload.HistoryTotalCount ?? 0,
    };
}

/** Chuẩn hóa danh sách thông số gắn vật tư (ProductInfo.parameterValues). */
function mapItemParameterValueBriefList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((pv) => ({
        itemParamValueId: pv.itemParamValueId ?? pv.ItemParamValueId,
        paramId: pv.paramId ?? pv.ParamId,
        paramName: pv.paramName ?? pv.ParamName ?? '',
        paramCode: pv.paramCode ?? pv.ParamCode ?? '',
        paramValue: pv.paramValue ?? pv.ParamValue ?? '',
    }));
}

/**
 * Chuẩn hóa dòng từ API /Item/detail/{id}.
 */
function mapItemDetailRow(row) {
    if (row == null || typeof row !== 'object') return null;
    // Spread row trước, rồi ghi đè chuẩn camelCase — tránh ...row sau cùng làm mất CategoryId/BrandId đã map.
    return {
        ...row,
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        itemImage: row.itemImage ?? row.ItemImage ?? null,
        itemType: row.itemType ?? row.ItemType ?? null,
        description: row.description ?? row.Description ?? null,
        categoryName: row.categoryName ?? row.CategoryName ?? null,
        categoryId: row.categoryId ?? row.CategoryId ?? null,
        brandName: row.brandName ?? row.BrandName ?? null,
        brandId: row.brandId ?? row.BrandId ?? null,
        baseUomName: row.baseUomName ?? row.BaseUomName ?? row.uomName ?? row.UomName ?? null,
        baseUomId: row.baseUomId ?? row.BaseUomId ?? row.uomId ?? row.UomId ?? null,
        packagingSpecName: row.packagingSpecName ?? row.PackagingSpecName ?? null,
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId ?? null,
        specName: row.specName ?? row.SpecName ?? null,
        specId: row.specId ?? row.SpecId ?? null,
        parameterValues: mapItemParameterValueBriefList(row.parameterValues ?? row.ParameterValues),
        specification: row.specification ?? row.Specification ?? null,
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
        defaultWarehouseId: row.defaultWarehouseId ?? row.DefaultWarehouseId ?? null,
        defaultWarehouseName: row.defaultWarehouseName ?? row.DefaultWarehouseName ?? null,
        purchasePriceAvg: row.purchasePriceAvg ?? row.PurchasePriceAvg ?? null,
    };
}

/**
 * Chuẩn hóa 1 dòng lịch sử tồn kho.
 */
function mapInventoryHistoryRow(h) {
    if (h == null) return null;
    return {
        docNo: h.docNo ?? h.DocNo ?? '',
        movementSign: h.movementSign ?? h.MovementSign ?? '+',
        qty: h.qty ?? h.Qty ?? 0,
        transactionAt: h.transactionAt ?? h.TransactionAt ?? null,
        actorName: h.actorName ?? h.ActorName ?? null,
        note: h.note ?? h.Note ?? null,
        sourceType: h.sourceType ?? h.SourceType ?? null,
        referenceId: h.referenceId ?? h.ReferenceId ?? 0,
    };
}

/**
 * Chuẩn hóa 1 dòng tồn kho theo kho.
 */
function mapInventoryByWarehouseRow(v) {
    if (v == null) return null;
    return {
        warehouseId: v.warehouseId ?? v.WarehouseId ?? null,
        warehouseName: v.warehouseName ?? v.WarehouseName ?? '',
        sku: v.sku ?? v.Sku ?? '',
        variantName: v.variantName ?? v.VariantName ?? '',
        onHandQty: v.onHandQty ?? v.OnHandQty ?? 0,
        reservedQty: v.reservedQty ?? v.ReservedQty ?? 0,
        availableQty: v.availableQty ?? v.AvailableQty ?? 0,
        preOrderQty: v.preOrderQty ?? v.PreOrderQty ?? 0,
        isDefaultWarehouse: v.isDefaultWarehouse ?? v.IsDefaultWarehouse ?? false,
    };
}


/**
 * Lấy danh sách vật tư theo kho.
 * GET /api/Item/warehouse/{warehouseId}/available
 * Backend trả: [{ itemId, itemCode, itemName, uomId, uomName, onHandQty, reservedQty, availableQty }]
 * @param {number|string} warehouseId
 * @returns {Promise<Array>}
 */
export async function getItemsByWarehouse(warehouseId) {
    const response = await apiClient.get(`/Item/warehouse/${warehouseId}/available`);
    const data = response?.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map(row => ({
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        uomId: row.uomId ?? row.UomId ?? null,
        uomName: row.uomName ?? row.UomName ?? '',
        onHandQty: row.onHandQty ?? row.OnHandQty ?? 0,
        reservedQty: row.reservedQty ?? row.ReservedQty ?? 0,
        availableQty: row.availableQty ?? row.AvailableQty ?? 0,
        unitPrice: row.unitPrice ?? row.UnitPrice ?? null,
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId ?? null,
        packagingSpecName: row.packagingSpecName ?? row.PackagingSpecName ?? '',
    }));
}

/**
 * Lấy chi tiết một vật tư theo ID (dùng cho trang EditItem).
 * GET /Item/display/{id} → ItemDisplayResponse.
 * Backend trả: { success, message, data: ItemDisplayResponse }.
 * @param {number|string} itemId
 * @returns {Promise<ItemDisplayResponse>}
 */
export async function getItemForDisplayById(itemId) {
    const response = await apiClient.get(`/Item/display/${itemId}`);
    const raw = response?.data?.data ?? response?.data ?? {};
    return mapItemDisplayRow(raw);
}

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
        categoryId: row.categoryId ?? row.CategoryId ?? null,
        brandName: row.brandName ?? row.BrandName ?? null,
        brandId: row.brandId ?? row.BrandId ?? null,
        baseUomName: row.baseUomName ?? row.BaseUomName ?? row.uomName ?? row.UomName ?? null,
        baseUomId: row.baseUomId ?? row.BaseUomId ?? row.uomId ?? row.UomId ?? null,
        packagingSpecName: row.packagingSpecName ?? row.PackagingSpecName ?? row.specName ?? row.SpecName ?? null,
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId ?? row.specId ?? row.SpecId ?? null,
        specName: row.specName ?? row.SpecName ?? null,
        specId: row.specId ?? row.SpecId ?? null,
        hasSpecifications: row.hasSpecifications ?? row.HasSpecifications ?? false,
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
    invalidate('item');
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
    invalidate('item');
    return response?.data;
}

/**
 * Cập nhật vật tư.
 * PUT /Item/{id} — khớp ItemController.UpdateItem ([HttpPut("{id:long}")])
 */
export async function updateItem(itemId, payload) {
    const response = await apiClient.put(`/Item/${itemId}`, payload);
    invalidate('item');
    return response?.data;
}

/**
 * Upload ảnh vật tư.
 * POST /Item/upload-image → multipart/form-data
 * @param {File} file
 * @returns {Promise<{ url: string }>}
 */
export async function uploadItemImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/Item/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response?.data?.data ?? response?.data ?? {};
    return { url: data.url ?? data.Url ?? '' };
}

/**
 * Xuất danh sách vật tư ra Excel.
 * GET /Item/export-excel
 * @returns {Promise<Blob>}
 */
export async function exportItemsExcel() {
    const response = await apiClient.get('/Item/export-excel', {
        responseType: 'blob',
    });
    return response?.data;
}