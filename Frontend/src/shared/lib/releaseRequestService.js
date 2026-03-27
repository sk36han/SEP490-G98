import apiClient from './axios';
import authService from './authService';

/** Backend endpoints (ReleaseRequestController):
 *   POST /api/ReleaseRequest/create
 *   GET  /api/ReleaseRequest/list
 *   GET  /api/ReleaseRequest/detail/{id}
 *   PUT  /api/ReleaseRequest/update/{id}
 *   PUT  /api/ReleaseRequest/submit/{id}
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractBody(response) {
    const body = response?.data ?? {};
    return body.data ?? body.Data ?? body;
}

function extractPaged(response) {
    const body = response?.data ?? {};
    const paged = body.data ?? body.Data ?? body;
    const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    const list = Array.isArray(rawList) ? rawList : [];
    return {
        items: list,
        totalItems: paged?.totalItems ?? paged?.TotalItems ?? paged?.totalCount ?? list.length,
        page: paged?.page ?? paged?.Page ?? 1,
        pageSize: paged?.pageSize ?? paged?.PageSize ?? 20,
    };
}

function getCurrentUserId() {
    const user = authService.getUser();
    return user?.userId ?? user?.UserId ?? null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────

function mapReleaseRequestRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        releaseRequestId: row.releaseRequestId ?? row.ReleaseRequestId,
        releaseRequestCode: row.releaseRequestCode ?? row.ReleaseRequestCode ?? '',
        status: row.status ?? row.Status ?? '',
        lifecycleStatus: row.lifecycleStatus ?? row.LifecycleStatus ?? '',
        requestedDate: row.requestedDate ?? row.RequestedDate ?? null,
        expectedDate: row.expectedDate ?? row.ExpectedDate ?? null,
        purpose: row.purpose ?? row.Purpose ?? null,
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        receiverId: row.receiverId ?? row.ReceiverId,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        companyName: row.companyName ?? row.CompanyName ?? '',
        requestedBy: row.requestedBy ?? row.RequestedBy,
        requestedByName: row.requestedByName ?? row.RequestedByName ?? '',
        totalItems: row.totalItems ?? row.TotalItems ?? 0,
        totalRequestedQty: row.totalRequestedQty ?? row.TotalRequestedQty ?? 0,
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
        submittedAt: row.submittedAt ?? row.SubmittedAt ?? null,
    };
}

function mapReleaseRequestLineRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        releaseRequestLineId: row.releaseRequestLineId ?? row.ReleaseRequestLineId,
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        requestedQty: row.requestedQty ?? row.RequestedQty ?? 0,
        uomId: row.uomId ?? row.UomId,
        uomName: row.uomName ?? row.UomName ?? '',
        approvedQty: row.approvedQty ?? row.ApprovedQty ?? 0,
        allocatedQty: row.allocatedQty ?? row.AllocatedQty ?? 0,
        issuedQty: row.issuedQty ?? row.IssuedQty ?? 0,
        lineStatus: row.lineStatus ?? row.LineStatus ?? '',
        note: row.note ?? row.Note ?? null,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LIST
// GET /api/ReleaseRequest/list
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách yêu cầu xuất kho có phân trang.
 * @param {{ page?: number, pageSize?: number }} params
 */
export async function getReleaseRequests(params = {}) {
    const { page = 1, pageSize = 20 } = params;
    try {
        const response = await apiClient.get('/ReleaseRequest/list', {
            params: { page, pageSize },
        });
        const { items: rawItems, totalItems, page: pg, pageSize: ps } = extractPaged(response);
        const items = (Array.isArray(rawItems) ? rawItems : []).map(mapReleaseRequestRow).filter(Boolean);
        return { items, totalItems, page: pg, pageSize: ps };
    } catch (error) {
        console.error('[releaseRequestService] getReleaseRequests failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DETAIL
// GET /api/ReleaseRequest/detail/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy chi tiết yêu cầu xuất kho.
 * @param {number|string} id
 */
export async function getReleaseRequestDetail(id) {
    try {
        const response = await apiClient.get(`/ReleaseRequest/detail/${id}`);
        const body = extractBody(response);
        if (!body || typeof body !== 'object') return null;
        return {
            ...mapReleaseRequestRow(body),
            receiver: body.receiver ?? null,
            lines: (body.lines ?? body.Lines ?? []).map(mapReleaseRequestLineRow),
        };
    } catch (error) {
        console.error('[releaseRequestService] getReleaseRequestDetail failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CREATE
// POST /api/ReleaseRequest/create
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tạo yêu cầu xuất kho mới.
 * Backend nhận: CreateReleaseRequestRequest
 *   { warehouseId, receiverId, expectedDate, purpose, lines: [{ itemId, requestedQty, uomId, note? }] }
 * @param {Object} data
 */
export async function createReleaseRequest(data) {
    try {
        const response = await apiClient.post('/ReleaseRequest/create', {
            warehouseId: Number(data.warehouseId),
            receiverId: Number(data.receiverId),
            expectedDate: data.expectedDate || null,
            purpose: data.purpose || null,
            lines: (data.lines ?? []).map(l => ({
                itemId: Number(l.itemId),
                requestedQty: Number(l.requestedQty),
                uomId: Number(l.uomId),
                note: l.note || null,
            })),
        });
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] createReleaseRequest failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. UPDATE
// PUT /api/ReleaseRequest/update/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cập nhật yêu cầu xuất kho.
 * Backend nhận: UpdateReleaseRequestRequest
 *   { warehouseId?, receiverId?, expectedDate?, purpose?, lines?: [...] }
 * @param {number|string} id
 * @param {Object} data
 */
export async function updateReleaseRequest(id, data) {
    try {
        const payload = {};
        if (data.warehouseId != null) payload.warehouseId = Number(data.warehouseId);
        if (data.receiverId != null) payload.receiverId = Number(data.receiverId);
        if (data.expectedDate != null) payload.expectedDate = data.expectedDate;
        if (data.purpose != null) payload.purpose = data.purpose;
        if (data.lines != null) {
            payload.lines = data.lines.map(l => ({
                releaseRequestLineId: l.releaseRequestLineId || null,
                itemId: Number(l.itemId),
                requestedQty: Number(l.requestedQty),
                uomId: Number(l.uomId),
                note: l.note || null,
            }));
        }
        const response = await apiClient.put(`/ReleaseRequest/update/${id}`, payload);
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] updateReleaseRequest failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SUBMIT
// PUT /api/ReleaseRequest/submit/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gửi yêu cầu xuất kho (chốt AllocatedQty = RequestedQty).
 * @param {number|string} id
 */
export async function submitReleaseRequest(id) {
    try {
        const response = await apiClient.put(`/ReleaseRequest/submit/${id}`);
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] submitReleaseRequest failed:', error);
        throw error.response?.data || error;
    }
}
