import apiClient from './axios';
import authService from './authService';
import { invalidate } from './pollingManager';

/** Backend endpoints (ReleaseRequestController):
 *   POST /api/ReleaseRequest/create
 *   POST /api/ReleaseRequest/{id}/attachments
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
        note: row.note ?? row.Note ?? null,
        isPartialDeliveryAllowed: row.isPartialDeliveryAllowed ?? row.IsPartialDeliveryAllowed ?? false,
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        receiverId: row.receiverId ?? row.ReceiverId,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        receiverPhone: row.receiverPhone ?? row.ReceiverPhone ?? '',
        receiverEmail: row.receiverEmail ?? row.ReceiverEmail ?? '',
        receiverPosition: row.receiverPosition ?? row.ReceiverPosition ?? '',
        companyId: row.companyId ?? row.CompanyId ?? null,
        companyName: row.companyName ?? row.CompanyName ?? '',
        addressId: row.addressId ?? row.AddressId ?? null,
        address: row.address ?? row.Address ?? row.receiverAddress ?? row.ReceiverAddress ?? '',
        city: row.city ?? row.City ?? '',
        district: row.district ?? row.District ?? '',
        ward: row.ward ?? row.Ward ?? '',
        requestedBy: row.requestedBy ?? row.RequestedBy,
        requestedByName: row.requestedByName ?? row.RequestedByName ?? '',
        totalItems: row.totalItems ?? row.TotalItems ?? 0,
        totalRequestedQty: row.totalRequestedQty ?? row.TotalRequestedQty ?? 0,
        totalAmount: row.totalAmount ?? row.TotalAmount ?? 0,
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
        submittedAt: row.submittedAt ?? row.SubmittedAt ?? null,
        approvedAt: row.approvedAt ?? row.ApprovedAt ?? null,
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
        stockQty: row.stockQty ?? row.StockQty ?? 0,
        costPrice: row.costPrice ?? row.CostPrice ?? 0,
        unitPrice: row.unitPrice ?? row.UnitPrice ?? 0,
        lineTotal: row.lineTotal ?? row.LineTotal ?? 0,
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId ?? null,
        packagingSpecName: row.packagingSpecName ?? row.PackagingSpecName ?? '',
    };
}

function mapAttachmentRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        attachmentId: row.attachmentId ?? row.AttachmentId,
        fileName: row.fileName ?? row.FileName ?? '',
        fileUrl: row.fileUrl ?? row.FileUrl ?? '',
        attachmentType: row.attachmentType ?? row.AttachmentType ?? '',
        uploadedAt: row.uploadedAt ?? row.UploadedAt ?? null,
    };
}

function mapApprovalRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        approvalId: row.approvalId ?? row.ApprovalId,
        stageNo: row.stageNo ?? row.StageNo ?? 0,
        decision: row.decision ?? row.Decision ?? '',
        reason: row.reason ?? row.Reason ?? null,
        actionBy: row.actionBy ?? row.ActionBy,
        actionByName: row.actionByName ?? row.ActionByName ?? '',
        actionAt: row.actionAt ?? row.ActionAt ?? null,
    };
}

function mapReceiverRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        receiverId: row.receiverId ?? row.ReceiverId,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        phone: row.phone ?? row.Phone ?? '',
        email: row.email ?? row.Email ?? '',
        companyId: row.companyId ?? row.CompanyId ?? null,
        companyName: row.companyName ?? row.CompanyName ?? '',
        notes: row.notes ?? row.Notes ?? null,
        address: row.address ?? row.Address ?? '',
        city: row.city ?? row.City ?? '',
        district: row.district ?? row.District ?? '',
        ward: row.ward ?? row.Ward ?? '',
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
 * Backend trả: ReleaseRequestDetailResponse (kèm Lines, Receiver, Approvals)
 * @param {number|string} id
 */
export async function getReleaseRequestDetail(id) {
    try {
        const response = await apiClient.get(`/ReleaseRequest/detail/${id}`);
        const body = extractBody(response);
        if (!body || typeof body !== 'object') return null;

        return {
            ...mapReleaseRequestRow(body),
            // Receiver embed (flatten lên top-level để UI đọc trực tiếp)
            receiver: body.receiver ? mapReceiverRow(body.receiver) : null,
            receiverName: body.receiver?.receiverName ?? body.receiver?.ReceiverName ?? '',
            receiverPhone: body.receiver?.phone ?? body.receiver?.Phone ?? '',
            receiverEmail: body.receiver?.email ?? body.receiver?.Email ?? '',
            receiverPosition: body.receiver?.position ?? body.receiver?.Position ?? '',
            companyId: body.receiver?.companyId ?? body.receiver?.CompanyId ?? body.companyId ?? body.CompanyId ?? null,
            companyName: body.receiver?.companyName ?? body.receiver?.CompanyName ?? body.companyName ?? body.CompanyName ?? '',
            addressId: body.receiver?.addressId ?? body.receiver?.AddressId ?? null,
            address: body.receiver?.address ?? body.receiver?.Address ?? '',
            city: body.receiver?.city ?? body.receiver?.City ?? '',
            district: body.receiver?.district ?? body.receiver?.District ?? '',
            ward: body.receiver?.ward ?? body.receiver?.Ward ?? '',
            // Lines
            lines: (body.Lines ?? body.lines ?? []).map(mapReleaseRequestLineRow),
            // Attachments
            attachments: (body.Attachments ?? body.attachments ?? []).map(mapAttachmentRow),
            // Approvals
            approvals: (body.Approvals ?? body.approvals ?? []).map(mapApprovalRow),
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
/**
 * Tao yeu cau xuat kho moi.
 * @param {Object} data
 * @param {number} data.warehouseId
 * @param {number} data.receiverId
 * @param {number} [data.companyId]
 * @param {string} [data.expectedDate]
 * @param {string} [data.purpose]
 * @param {string} [data.note]
 * @param {number|null} [data.addressId]
 * @param {string|null} [data.address]
 * @param {string|null} [data.city]
 * @param {string|null} [data.district]
 * @param {string|null} [data.ward]
 * @param {Array} data.lines
 */
export async function createReleaseRequest(data) {
    try {
        const payload = {
            warehouseId: Number(data.warehouseId) || null,
            receiverId: Number(data.receiverId) || null,
            companyId: Number(data.companyId) || null,
            expectedDate: data.expectedDate || null,
            purpose: data.purpose?.trim() || null,
            note: data.note?.trim() || null,
            status: data.status || null,
            isPartialDeliveryAllowed: Boolean(data.isPartialDeliveryAllowed),
            // Address
            addressId: data.addressId != null ? Number(data.addressId) : null,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            district: data.district?.trim() || null,
            ward: data.ward?.trim() || null,
            lines: (data.lines ?? []).map(l => ({
                itemId: Number(l.itemId),
                requestedQty: Number(l.requestedQty),
                uomId: l.uomId != null ? Number(l.uomId) : null,
                note: l.note?.trim() || null,
                unitPrice: l.unitPrice != null && l.unitPrice !== '' ? Number(l.unitPrice) : null,
                packagingSpecId: l.packagingSpecId != null && l.packagingSpecId !== ''
                    ? Number(l.packagingSpecId)
                    : null,
            })),
        };
        console.log('[createReleaseRequest] payload:', JSON.stringify(payload, null, 2));
        const response = await apiClient.post('/ReleaseRequest/create', payload);
        invalidate('releaseRequest');
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] createReleaseRequest failed:', error);
        const errData = error.response?.data;
        // Parse backend validation errors
        if (errData?.errors) {
            const msgs = Object.values(errData.errors).flat();
            const err = new Error(msgs.join('; '));
            err._raw = errData;
            throw err;
        }
        throw errData || error;
    }
}

/**
 * Upload báo giá, hợp đồng và phụ lục (tùy chọn) cho yêu cầu xuất kho.
 * @param {number|string} releaseRequestId
 * @param {{ quotationFile?: File|null, contractFile?: File|null, appendixFile?: File|null }} files
 */
export async function uploadReleaseRequestAttachments(releaseRequestId, { quotationFile, contractFile, appendixFile } = {}) {
    const formData = new FormData();
    if (quotationFile) formData.append('quotationFile', quotationFile);
    if (contractFile) formData.append('contractFile', contractFile);
    if (appendixFile) formData.append('appendixFile', appendixFile);

    if (!quotationFile && !contractFile && !appendixFile) {
        return null;
    }

    try {
        // apiClient mặc định Content-Type: application/json — với FormData phải bỏ header
        // để axios/browser tự gắn multipart/form-data kèm boundary; nếu không, backend không nhận IFormFile.
        const response = await apiClient.post(
            `/ReleaseRequest/${releaseRequestId}/attachments`,
            formData,
            {
                transformRequest: [
                    (data, headers) => {
                        if (typeof FormData !== 'undefined' && data instanceof FormData) {
                            if (headers && typeof headers.delete === 'function') {
                                headers.delete('Content-Type');
                            } else if (headers && typeof headers === 'object') {
                                delete headers['Content-Type'];
                            }
                        }
                        return data;
                    },
                ],
            },
        );
        invalidate('releaseRequest');
        return response?.data;
    } catch (error) {
        const d = error?.response?.data;
        const msg =
            d?.detail
            || d?.Detail
            || d?.message
            || d?.Message
            || error?.message
            || 'Không thể tải tệp đính kèm.';
        const err = new Error(msg);
        err.response = error.response;
        throw err;
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
        invalidate('releaseRequest');
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
// ═══════════════════════════════════════════════════════════════════════════════
// 5. APPROVE / REJECT
// PUT /api/ReleaseRequest/approve/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Duyệt hoặc từ chối yêu cầu xuất kho.
 * @param {number|string} id
 * @param {{ isApproved: boolean, reason?: string, lines?: Array }} data
 */
export async function approveReleaseRequest(id, data) {
    try {
        const payload = {
            isApproved: data.isApproved,
            reason: data.reason?.trim() || null,
            lines: data.lines ?? null,
        };
        const response = await apiClient.put(`/ReleaseRequest/approve/${id}`, payload);
        invalidate('releaseRequest');
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] approveReleaseRequest failed:', error);
        const errData = error.response?.data;
        if (errData?.errors) {
            const msgs = Object.values(errData.errors).flat();
            const err = new Error(msgs.join('; '));
            err._raw = errData;
            throw err;
        }
        throw errData || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SUBMIT
// PUT /api/ReleaseRequest/submit/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gửi yêu cầu xuất kho (chốt AllocatedQty = RequestedQty).
 * @param {number|string} id
 */
export async function submitReleaseRequest(id) {
    try {
        const response = await apiClient.put(`/ReleaseRequest/submit/${id}`);
        invalidate('releaseRequest');
        return extractBody(response);
    } catch (error) {
        console.error('[releaseRequestService] submitReleaseRequest failed:', error);
        throw error.response?.data || error;
    }
}
