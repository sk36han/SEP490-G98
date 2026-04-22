import apiClient, { extractBody } from './axios';
import { invalidate } from './pollingManager';

function getPayload(data) {
    return data?.data ?? data?.Data ?? data ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LIST
// GET /api/GoodsDeliveryNote?page&pageSize&searchTerm&status&...
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách phiếu xuất kho (phân trang + lọc).
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.searchTerm]
 * @param {string} [params.status]
 * @param {string} [params.fromDate]
 * @param {string} [params.toDate]
 */
export async function getGoodsDeliveryNotes(params = {}) {
    const { page = 1, pageSize = 20, searchTerm = '', status, fromDate, toDate } = params;
    const query = new URLSearchParams();
    query.append('page', page);
    query.append('pageSize', pageSize);
    if (searchTerm) query.append('searchTerm', searchTerm);
    if (status) query.append('status', status);
    if (fromDate) query.append('fromDate', fromDate);
    if (toDate) query.append('toDate', toDate);

    const response = await apiClient.get(`/GoodsDeliveryNote?${query.toString()}`);
    const body = response?.data ?? {};
    const paged = body.data ?? body.Data ?? body;
    const rawItems = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    return {
        items: rawItems.map(mapGDNRow),
        totalItems: paged?.totalItems ?? paged?.totalCount ?? rawItems.length,
        page: paged?.page ?? page,
        pageSize: paged?.pageSize ?? pageSize,
        totalPages: paged?.totalPages ?? 1,
    };
}

function mapGDNRow(row) {
    if (!row) return null;
    const transport = row.transportInfo ?? row.TransportInfo ?? {};
    return {
        // ── Main fields ──────────────────────────────────────────────
        gdnId: row.gdnId ?? row.GdnId ?? row.id ?? row.Id ?? null,
        gdnCode: row.gdnCode ?? row.GdnCode ?? row.code ?? row.Code ?? '',
        releaseRequestId: row.releaseRequestId ?? row.ReleaseRequestId ?? null,
        releaseRequestCode: row.releaseRequestCode ?? row.ReleaseRequestCode ?? '',
        warehouseId: row.warehouseId ?? row.WarehouseId ?? null,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        issueDate: row.issueDate ?? row.IssueDate ?? null,
        status: row.status ?? row.Status ?? '',
        pickingStrategy: row.pickingStrategy ?? row.PickingStrategy ?? null,
        note: row.note ?? row.Note ?? '',
        createdByName: row.createdByName ?? row.CreatedByName ?? '',
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
        submittedAt: row.submittedAt ?? row.SubmittedAt ?? null,
        approvedAt: row.approvedAt ?? row.ApprovedAt ?? null,
        approvedByName: row.approvedByName ?? row.ApprovedByName ?? null,
        // ── Financial ─────────────────────────────────────────────────
        shippingFee: row.shippingFee ?? row.ShippingFee ?? 0,
        isPaid: row.isPaid ?? row.IsPaid ?? false,
        paymentMethod: row.paymentMethod ?? row.PaymentMethod ?? '',
        totalDeliveredQty: row.totalDeliveredQty ?? row.TotalDeliveredQty ?? 0,
        totalDeliveredAmount: row.totalDeliveredAmount ?? row.TotalDeliveredAmount ?? 0,
        // ── Receiver ──────────────────────────────────────────────────
        receiverId: row.receiverId ?? row.ReceiverId ?? null,
        receiverName: row.receiverName ?? row.ReceiverName ?? '',
        receiverPhone: row.receiverPhone ?? row.ReceiverPhone ?? '',
        receiverEmail: row.receiverEmail ?? row.ReceiverEmail ?? '',
        receiverCompanyName: row.receiverCompanyName ?? row.ReceiverCompanyName ?? '',
        receiverAddress: row.receiverAddress ?? row.ReceiverAddress ?? '',
        // ── Transport Info (nested) ───────────────────────────────────
        transportInfo: {
            carrierName: transport.carrierName ?? transport.CarrierName ?? null,
            driverName: transport.driverName ?? transport.DriverName ?? null,
            driverPhone: transport.driverPhone ?? transport.DriverPhone ?? null,
            licensePlate: transport.licensePlate ?? transport.LicensePlate ?? null,
            note: transport.note ?? transport.Note ?? null,
        },
        // ── Lines ─────────────────────────────────────────────────────
        lines: Array.isArray(row.lines ?? row.Lines ?? row.items ?? row.Items)
            ? (row.lines ?? row.Lines ?? row.items ?? row.Items).map(mapGDNLine)
            : [],
        // ── Passthrough raw ───────────────────────────────────────────
        ...row,
    };
}

function mapGDNLine(line) {
    if (!line) return null;
    return {
        /** Khớp GDNLineDetailResponse / issue API */
        gdnLineId: line.gdnLineId ?? line.GdnLineId ?? line.lineId ?? line.LineId ?? line.id ?? line.Id ?? null,
        lineId: line.lineId ?? line.LineId ?? line.id ?? line.Id ?? null,
        itemId: line.itemId ?? line.ItemId ?? null,
        itemCode: line.itemCode ?? line.ItemCode ?? '',
        itemName: line.itemName ?? line.ItemName ?? '',
        uomId: line.uomId ?? line.UomId ?? null,
        uomName: line.uomName ?? line.UomName ?? '',
        requestedQty: line.requestedQty ?? line.RequestedQty ?? 0,
        approvedQty: line.approvedQty ?? line.ApprovedQty ?? 0,
        allocatedQty: line.allocatedQty ?? line.AllocatedQty ?? 0,
        issuedQty: line.issuedQty ?? line.IssuedQty ?? 0,
        remainingQty: line.remainingQty ?? line.RemainingQty ?? 0,
        actualQty: line.actualQty ?? line.ActualQty ?? 0,
        availableQty: line.availableQty ?? line.AvailableQty ?? 0,
        unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
        lineTotal: line.lineTotal ?? line.LineTotal ?? 0,
        requiresCertificateCopy: line.requiresCertificateCopy ?? line.RequiresCertificateCopy ?? false,
        note: line.note ?? line.Note ?? '',
        releaseRequestLineId: line.releaseRequestLineId ?? line.ReleaseRequestLineId ?? null,
        ...line,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DETAIL
// GET /api/GoodsDeliveryNote/{id}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy chi tiết phiếu xuất kho.
 * @param {number|string} id
 */
export async function getGoodsDeliveryNoteDetail(id) {
    const response = await apiClient.get(`/GoodsDeliveryNote/${id}`);
    return getPayload(response?.data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CREATE
// POST /api/GoodsDeliveryNote
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tạo phiếu xuất kho mới.
 * Payload shape phải khớp với backend CreateGDNRequest.
 */
export async function createGoodsDeliveryNote(payload) {
    try {
        const response = await apiClient.post('/GoodsDeliveryNote', payload);
        invalidate('good-delivery-note');
        return getPayload(response?.data);
    } catch (error) {
        if (error?.response?.status === 404) {
            throw new Error('Backend chưa hỗ trợ API tạo phiếu xuất hàng.');
        }
        if (error?.response?.data?.errors) {
            const msgs = Object.values(error.response.data.errors).flat();
            throw new Error(msgs.join('; '));
        }
        throw new Error(
            error?.response?.data?.message
            || error?.response?.data?.detail
            || 'Không thể tạo phiếu xuất hàng.'
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TRANSPORT INFO
// POST /api/TransportInfo
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTransportInfo(payload) {
    try {
        const response = await apiClient.post('/TransportInfo', payload);
        return getPayload(response?.data);
    } catch (error) {
        throw new Error(
            error?.response?.data?.message
            || error?.response?.data?.detail
            || 'Không thể tạo thông tin vận chuyển.'
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. APPROVE
// PUT /api/GoodsDeliveryNote/{id}/approve
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Duyệt hoặc từ chối phiếu xuất kho.
 * Luồng tùy chọn: Stage 1 (PENDING_ACC) → Kế toán duyệt → PENDING_DIR
 * Stage 2 (PENDING_DIR) → Giám đốc duyệt → PENDING_ISSUE
 * Tạo mới từ UI: thường gửi thẳng PENDING_ISSUE (chuẩn bị hàng), bỏ qua hai bước duyệt trên.
 * @param {number} gdnId
 * @param {{ isApproved: boolean, reason?: string }} data
 */
export async function approveGoodsDeliveryNote(gdnId, data) {
    try {
        // Hỗ trợ cả camelCase (isApproved) lẫn PascalCase (IsApproved) từ caller
        const isApproved = data.isApproved ?? data.IsApproved ?? false;
        const response = await apiClient.put(`/GoodsDeliveryNote/${gdnId}/approve`, {
            IsApproved: Boolean(isApproved),
            Reason: data.reason ?? data.Reason ?? null,
        });
        return extractBody(response);
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function issueGoodsDeliveryNote(gdnId, data) {
    try {
        /** Backend WarehouseIssueLineRequest: GdnLineId + ActualQty (camelCase JSON) */
        let linesPayload = null;
        if (Array.isArray(data.lines) && data.lines.length > 0) {
            linesPayload = data.lines
                .map((l) => {
                    const gid = l.gdnLineId ?? l.GdnLineId ?? l.lineId ?? l.LineId ?? l.id ?? l.Id;
                    const n = gid != null && gid !== '' ? Number(gid) : NaN;
                    return {
                        gdnLineId: Number.isFinite(n) && n > 0 ? n : null,
                        actualQty: Number(l.actualQty ?? l.ActualQty ?? 0),
                    };
                })
                .filter((x) => x.gdnLineId != null);
            if (linesPayload.length === 0) linesPayload = null;
        }
        const response = await apiClient.put(`/GoodsDeliveryNote/${gdnId}/issue`, {
            isAllItemsFulfilled: data.isAllItemsFulfilled ?? true,
            lines: linesPayload,
            note: data.note ?? null,
        });
        return extractBody(response);
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CONFIRM DELIVERY
// POST /api/GoodsDeliveryNote/{id}/confirm-delivery
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Xác nhận giao hàng thành công — hoàn thành phiếu xuất kho.
 * Status chuyển: ISSUED → POSTED.
 * @param {number} gdnId
 * @param {{ evidenceFile: File, note?: string }} data
 */
export async function confirmDeliveryGoodsDeliveryNote(gdnId, data) {
    try {
        const formData = new FormData();
        if (data.evidenceFile) {
            formData.append('evidenceFile', data.evidenceFile);
        }
        if (data.note) {
            formData.append('note', data.note);
        }
        const response = await apiClient.post(`/GoodsDeliveryNote/${gdnId}/confirm-delivery`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractBody(response);
    } catch (error) {
        throw error?.response?.data || error;
    }
}
