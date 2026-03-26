import apiClient from './axios';

const RELEASE_REQUEST_API = '/ReleaseRequest';

function getPayload(data) {
    return data?.data ?? data?.Data ?? data ?? null;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function mapReceiver(row) {
    if (row == null || typeof row !== 'object') return null;

    return {
        receiverId: row.receiverId ?? row.ReceiverId ?? null,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        phone: row.phone ?? row.Phone ?? '',
        email: row.email ?? row.Email ?? '',
        companyId: row.companyId ?? row.CompanyId ?? null,
        companyName: row.companyName ?? row.CompanyName ?? '',
        notes: row.notes ?? row.Notes ?? '',
        address: row.address ?? row.Address ?? '',
        city: row.city ?? row.City ?? '',
        district: row.district ?? row.District ?? '',
        ward: row.ward ?? row.Ward ?? '',
    };
}

function mapReleaseRequestLine(row) {
    if (row == null || typeof row !== 'object') return null;

    return {
        releaseRequestLineId: row.releaseRequestLineId ?? row.ReleaseRequestLineId ?? null,
        itemId: row.itemId ?? row.ItemId ?? null,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        requestedQty: toNumber(row.requestedQty ?? row.RequestedQty),
        uomId: row.uomId ?? row.UomId ?? null,
        uomName: row.uomName ?? row.UomName ?? '',
        note: row.note ?? row.Note ?? '',
        approvedQty: toNumber(row.approvedQty ?? row.ApprovedQty),
        allocatedQty: toNumber(row.allocatedQty ?? row.AllocatedQty),
        issuedQty: toNumber(row.issuedQty ?? row.IssuedQty),
        lineStatus: row.lineStatus ?? row.LineStatus ?? '',
        stockQty: toNumber(row.stockQty ?? row.StockQty),
    };
}

function mapReleaseRequestSummary(row) {
    if (row == null || typeof row !== 'object') return null;

    return {
        releaseRequestId: row.releaseRequestId ?? row.ReleaseRequestId ?? null,
        releaseRequestCode: row.releaseRequestCode ?? row.ReleaseRequestCode ?? '',
        status: row.status ?? row.Status ?? '',
        lifecycleStatus: row.lifecycleStatus ?? row.LifecycleStatus ?? '',
        requestedDate: row.requestedDate ?? row.RequestedDate ?? '',
        expectedDate: row.expectedDate ?? row.ExpectedDate ?? '',
        purpose: row.purpose ?? row.Purpose ?? '',
        warehouseId: row.warehouseId ?? row.WarehouseId ?? null,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        receiverId: row.receiverId ?? row.ReceiverId ?? null,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        companyId: row.companyId ?? row.CompanyId ?? null,
        companyName: row.companyName ?? row.CompanyName ?? '',
        receiverAddress: row.receiverAddress ?? row.ReceiverAddress ?? '',
        requestedBy: row.requestedBy ?? row.RequestedBy ?? null,
        requestedByName: row.requestedByName ?? row.RequestedByName ?? '',
        totalItems: toNumber(row.totalItems ?? row.TotalItems),
        totalRequestedQty: toNumber(row.totalRequestedQty ?? row.TotalRequestedQty),
        createdAt: row.createdAt ?? row.CreatedAt ?? '',
    };
}

function mapReleaseRequestDetail(row) {
    if (row == null || typeof row !== 'object') return null;

    const rawLines = Array.isArray(row.lines)
        ? row.lines
        : Array.isArray(row.Lines)
            ? row.Lines
            : [];

    return {
        releaseRequestId: row.releaseRequestId ?? row.ReleaseRequestId ?? null,
        releaseRequestCode: row.releaseRequestCode ?? row.ReleaseRequestCode ?? '',
        status: row.status ?? row.Status ?? '',
        lifecycleStatus: row.lifecycleStatus ?? row.LifecycleStatus ?? '',
        requestedDate: row.requestedDate ?? row.RequestedDate ?? '',
        expectedDate: row.expectedDate ?? row.ExpectedDate ?? '',
        purpose: row.purpose ?? row.Purpose ?? '',
        warehouseId: row.warehouseId ?? row.WarehouseId ?? null,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        requestedBy: row.requestedBy ?? row.RequestedBy ?? null,
        requestedByName: row.requestedByName ?? row.RequestedByName ?? '',
        receiver: mapReceiver(row.receiver ?? row.Receiver),
        totalItems: toNumber(row.totalItems ?? row.TotalItems),
        totalRequestedQty: toNumber(row.totalRequestedQty ?? row.TotalRequestedQty),
        createdAt: row.createdAt ?? row.CreatedAt ?? '',
        submittedAt: row.submittedAt ?? row.SubmittedAt ?? '',
        lines: rawLines.map(mapReleaseRequestLine).filter(Boolean),
    };
}

export async function createReleaseRequest(payload) {
    const response = await apiClient.post(`${RELEASE_REQUEST_API}/create`, payload);
    return mapReleaseRequestDetail(getPayload(response?.data));
}

export async function getReleaseRequests(params = {}) {
    const { page = 1, pageSize = 20 } = params;
    const response = await apiClient.get(`${RELEASE_REQUEST_API}/list`, {
        params: { page, pageSize },
    });

    const paged = getPayload(response?.data) ?? {};
    const rawItems = Array.isArray(paged.items)
        ? paged.items
        : Array.isArray(paged.Items)
            ? paged.Items
            : [];

    return {
        page: paged.page ?? paged.Page ?? page,
        pageSize: paged.pageSize ?? paged.PageSize ?? pageSize,
        totalItems: paged.totalItems ?? paged.TotalItems ?? rawItems.length,
        items: rawItems.map(mapReleaseRequestSummary).filter(Boolean),
    };
}

export async function getReleaseRequestById(id) {
    const response = await apiClient.get(`${RELEASE_REQUEST_API}/detail/${id}`);
    return mapReleaseRequestDetail(getPayload(response?.data));
}

export async function updateReleaseRequest(id, payload) {
    const response = await apiClient.put(`${RELEASE_REQUEST_API}/update/${id}`, payload);
    return mapReleaseRequestDetail(getPayload(response?.data));
}

export async function submitReleaseRequest(id) {
    const response = await apiClient.put(`${RELEASE_REQUEST_API}/submit/${id}`);
    return mapReleaseRequestDetail(getPayload(response?.data));
}
