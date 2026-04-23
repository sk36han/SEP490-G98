import apiClient from './axios';

const unwrapData = (response) => {
    const body = response?.data ?? {};
    return body?.data ?? body?.Data ?? body;
};

const mapStorageLocation = (row) => ({
    locationId: row?.locationId ?? row?.LocationId,
    warehouseId: row?.warehouseId ?? row?.WarehouseId,
    warehouseName: row?.warehouseName ?? row?.WarehouseName ?? '',
    locationCode: row?.locationCode ?? row?.LocationCode ?? '',
    locationName: row?.locationName ?? row?.LocationName ?? '',
    isActive: row?.isActive ?? row?.IsActive ?? false,
    currentQty: row?.currentQty ?? row?.CurrentQty ?? 0,
    currentItemsSummary: row?.currentItemsSummary ?? row?.CurrentItemsSummary ?? '',
});

export async function getStorageLocationList(params = {}) {
    const {
        page = 1,
        pageSize = 20,
        warehouseId,
        keyword,
        isActive,
        hasStock,
        itemCode,
        minQty,
        maxQty,
    } = params;

    const response = await apiClient.get('/StorageLocation/list-all-storage-location', {
        params: { page, pageSize, warehouseId, keyword, isActive, hasStock, itemCode, minQty, maxQty },
    });

    const data = unwrapData(response) ?? {};
    const rawItems = data?.items ?? data?.Items ?? [];
    const items = Array.isArray(rawItems) ? rawItems.map(mapStorageLocation) : [];

    return {
        items,
        totalItems: data?.totalItems ?? data?.TotalItems ?? items.length,
        page: data?.page ?? data?.Page ?? page,
        pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    };
}

export async function getStorageLocationLedger(locationId, params = {}) {
    const { page = 1, pageSize = 20 } = params;
    const response = await apiClient.get(`/StorageLocation/${locationId}/ledger`, {
        params: { page, pageSize },
    });
    const data = unwrapData(response) ?? {};
    return {
        items: data?.items ?? data?.Items ?? [],
        totalItems: data?.totalItems ?? data?.TotalItems ?? 0,
        page: data?.page ?? data?.Page ?? page,
        pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    };
}

export async function createStorageLocation(payload) {
    const response = await apiClient.post('/StorageLocation/create-storage-location', payload);
    return unwrapData(response);
}

export async function updateStorageLocation(id, payload) {
    const response = await apiClient.put(`/StorageLocation/update-storage-location/${id}`, payload);
    return unwrapData(response);
}

export async function changeStorageLocationStatus(id, isActive) {
    const response = await apiClient.patch(`/StorageLocation/change-status-storage-location/${id}`, null, {
        params: { isActive },
    });
    return unwrapData(response);
}
