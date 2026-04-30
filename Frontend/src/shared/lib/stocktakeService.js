import apiClient from './axios';
import authService from './authService';

/**
 * Stocktake API – kết nối StocktakeController / StocktakePlanController / StocktakeExecutionController.
 *
 * Backend endpoints:
 *   GET  /Stocktake/list-all
 *   GET  /Stocktake/get-by-id/{id}
 *   POST /StocktakePlan/CreateStocktakePlan
 *   POST /StocktakePlan/{id}/SubmitStocktakePlan
 *   POST /StocktakePlan/{id}/ApproveStocktakePlan
 *   POST /StocktakePlan/{id}/CancelStocktake
 *   GET  /StocktakePlan/ListAllStocktakePlans
 *   POST /StocktakeExecution/{id}/StartStocktakeExecution
 *   GET  /StocktakeExecution/{id}/Lines
 *   PATCH /StocktakeExecution/UpdateActualCountedQty/{lineId}
 *   POST /StocktakeExecution/{id}/BulkMatchSystemQty
 *   POST /StocktakeExecution/{id}/SubmitStocktakeResults
 *   GET  /StocktakeExecution/{id}/GetAdjustmentPreview
 *   POST /StocktakeExecution/{id}/ApproveAndFinalizeResults   ← giai đoạn 2 (sau khi có chênh lệch, PENDING_RESULTADJ)
 *   POST /StocktakeExecution/{id}/CancelStocktake
 *   GET  /StocktakeExecution/{id}/GetApprovalHistory
 *   GET  /StocktakeExecution/ListAllCompletedStocktakes
 *   GET  /StocktakeExecution/{id}/ExportStocktakeSheetPdf
 */

// ─── Row mappers ───────────────────────────────────────────────────────────────

function mapStocktakeRow(row) {
    if (row == null || typeof row !== 'object') return null;
    const plannedAt = row.plannedAt ?? row.PlannedAt ?? null;
    const createdAtRaw = row.createdAt ?? row.CreatedAt ?? null;
    return {
        id: row.id ?? row.Id ?? row.stocktakeId ?? row.StocktakeId,
        stocktakeId: row.stocktakeId ?? row.StocktakeId,
        code: row.code ?? row.Code ?? row.stocktakeCode ?? row.StocktakeCode ?? '',
        stocktakeCode: row.stocktakeCode ?? row.StocktakeCode ?? '',
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        status: row.status ?? row.Status ?? '',
        mode: row.mode ?? row.Mode ?? '',
        plannedAt,
        startedAt: row.startedAt ?? row.StartedAt ?? null,
        endedAt: row.endedAt ?? row.EndedAt ?? null,
        createdBy: row.createdBy ?? row.CreatedBy,
        createdById: row.createdBy ?? row.CreatedBy ?? null,
        createdByName: row.createdByName ?? row.CreatedByName ?? '',
        // Một số endpoint Stocktake chưa trả CreatedAt, fallback sang PlannedAt để cột "Ngày tạo" không trống.
        createdAt: createdAtRaw ?? plannedAt,
        note: row.note ?? row.Note ?? null,
        // Progress fields
        totalLines: row.totalLines ?? row.TotalLines ?? 0,
        countedLines: row.countedLines ?? row.CountedLines ?? 0,
        varianceLines: row.varianceLines ?? row.VarianceLines ?? 0,
        progressPercent: row.progressPercent ?? row.ProgressPercent ?? 0,
    };
}

function mapStocktakeLineRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        id: row.stocktakeLineId ?? row.StocktakeLineId,
        stocktakeLineId: row.stocktakeLineId ?? row.StocktakeLineId,
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        itemImage: row.itemImage ?? row.ItemImage ?? null,
        uom: row.uomName ?? row.UomName ?? '',
        uomName: row.uomName ?? row.UomName ?? '',
        systemQtySnapshot: row.onHandQty ?? row.OnHandQty ?? row.systemQtySnapshot ?? row.SystemQtySnapshot ?? 0,
        countedQty: row.countedQty ?? row.CountedQty ?? null,
        varianceQty: row.varianceQty ?? row.VarianceQty ?? null,
        note: row.note ?? row.Note ?? null,
    };
}

function mapAdjustmentPreviewRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        stocktakeLineId: row.stocktakeLineId ?? row.StocktakeLineId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        uomName: row.uomName ?? row.UomName ?? '',
        systemQtySnapshot: row.systemQtySnapshot ?? row.SystemQtySnapshot ?? 0,
        countedQty: row.countedQty ?? row.CountedQty ?? 0,
        varianceQty: row.varianceQty ?? row.VarianceQty ?? 0,
    };
}

function mapApprovalHistoryRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        approvalId: row.approvalId ?? row.ApprovalId,
        stageNo: row.stageNo ?? row.StageNo,
        decision: row.decision ?? row.Decision ?? '',
        reason: row.reason ?? row.Reason ?? '',
        actionByName: row.actionByName ?? row.ActionByName ?? '',
        actionAt: row.actionAt ?? row.ActionAt ?? null,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentUserId() {
    const user = authService.getUser();
    return user?.userId ?? user?.UserId ?? null;
}

function extractBody(response) {
    const body = response?.data ?? {};
    // Backend trả: ApiResponse<...> hoặc trực tiếp PagedResponse / object
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LIST / SEARCH  (StocktakeController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách phiên kiểm kê có phân trang và filter.
 * GET /Stocktake/list-all
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.stocktakeCode]  – tìm chứa
 * @param {string} [params.warehouseName]   – tìm chứa
 * @param {string} [params.status]          – DRAFT | IN_PROGRESS | PENDING_APPROVAL | COMPLETED | CANCELLED
 * @param {string} [params.mode]            – PERIODIC | ADHOC
 * @param {string} [params.createdByName]   – tìm chứa
 * @param {string} [params.plannedFrom]     – ISO date
 * @param {string} [params.plannedTo]       – ISO date
 * @param {string} [params.startedFrom]     – ISO date
 * @param {string} [params.startedTo]       – ISO date
 * @param {string} [params.endedFrom]       – ISO date
 * @param {string} [params.endedTo]         – ISO date
 * @returns {Promise<{ items, totalItems, page, pageSize }>}
 */
export async function getStocktakeList(params = {}) {
    const {
        page = 1,
        pageSize = 20,
        stocktakeCode = null,
        warehouseName = null,
        status = null,
        mode = null,
        createdByName = null,
        plannedFrom = null,
        plannedTo = null,
        startedFrom = null,
        startedTo = null,
        endedFrom = null,
        endedTo = null,
    } = params;

    const query = {};
    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (stocktakeCode) query.stocktakeCode = stocktakeCode;
    if (warehouseName) query.warehouseName = warehouseName;
    if (status) query.status = status;
    if (mode) query.mode = mode;
    if (createdByName) query.createdByName = createdByName;
    if (plannedFrom) query.plannedFrom = plannedFrom;
    if (plannedTo) query.plannedTo = plannedTo;
    if (startedFrom) query.startedFrom = startedFrom;
    if (startedTo) query.startedTo = startedTo;
    if (endedFrom) query.endedFrom = endedFrom;
    if (endedTo) query.endedTo = endedTo;

    try {
        const response = await apiClient.get('/Stocktake/list-all', { params: query });
        const { items: rawItems, totalItems, page: pg, pageSize: ps } = extractPaged(response);
        const items = (Array.isArray(rawItems) ? rawItems : []).map(mapStocktakeRow).filter(Boolean);
        return { items, totalItems, page: pg, pageSize: ps };
    } catch (error) {
        console.error('[stocktakeService] getStocktakeList failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DETAIL  (StocktakeController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy chi tiết một phiên kiểm kê.
 * GET /Stocktake/get-by-id/{id}
 *
 * @param {number|string} id – StocktakeId
 * @returns {Promise<Object>}
 */
export async function getStocktakeDetail(id) {
    try {
        const response = await apiClient.get(`/Stocktake/get-by-id/${id}`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CREATE DRAFT  (StocktakePlanController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tạo phiên kiểm kê mới (DRAFT).
 * POST /StocktakePlan/CreateStocktakePlan
 *
 * Backend nhận: CreateStocktakeDraftRequest
 *   { warehouseId, mode, plannedAt?, note? }
 *
 * @param {{ warehouseId: number, mode: string, plannedAt?: string, note?: string }} data
 * @returns {Promise<Object>} – StocktakeDetailResponse
 */
export async function createStocktakeDraft(data) {
    try {
        const response = await apiClient.post('/StocktakePlan/CreateStocktakePlan', {
            warehouseId: data.warehouseId,
            mode: data.mode?.toUpperCase(),
            plannedAt: data.plannedAt ?? null,
            note: data.note ?? null,
            status: data.status ?? null,
        });
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] createStocktakeDraft failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SUBMIT PLAN  (StocktakePlanController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gửi kế hoạch kiểm kê (chuyển DRAFT → IN_PROGRESS).
 * POST /StocktakePlan/{id}/SubmitStocktakePlan
 *
 * @param {number|string} id – StocktakeId
 * @returns {Promise<Object>}
 */
export async function submitStocktakePlan(id) {
    try {
        const response = await apiClient.post(`/StocktakePlan/${id}/SubmitStocktakePlan`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] submitStocktakePlan failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. APPROVE PLAN  (StocktakePlanController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phê duyệt kế hoạch kiểm kê (chuyển PENDING_APPROVAL → APPROVED/REJECTED).
 * POST /StocktakePlan/{id}/ApproveStocktakePlan
 *
 * Backend nhận: StocktakeApprovalRequest
 *   { decision: 'APPROVE' | 'RECOUNT' | 'REJECT', reason? }
 *
 * @param {number|string} id – StocktakeId
 * @param {{ decision: string, reason?: string }} data
 * @returns {Promise<Object>}
 */
export async function approveStocktakePlan(id, data) {
    try {
        const response = await apiClient.post(`/StocktakePlan/${id}/ApproveStocktakePlan`, {
            decision: data.decision?.toUpperCase(),
            reason: data.reason ?? null,
        });
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] approveStocktakePlan failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CANCEL STOCKTAKE PLAN  (StocktakePlanController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hủy phiên kiểm kê.
 * POST /StocktakePlan/{id}/CancelStocktake
 *
 * @param {number|string} id – StocktakeId
 * @param {string} [reason]
 * @returns {Promise<Object>}
 */
export async function cancelStocktakePlan(id, reason = '') {
    try {
        const response = await apiClient.post(`/StocktakePlan/${id}/CancelStocktake`, {
            reason: reason || null,
        });
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] cancelStocktakePlan failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LIST PLANS  (StocktakePlanController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách kế hoạch kiểm kê.
 * GET /StocktakePlan/ListAllStocktakePlans
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @returns {Promise<{ items, totalItems, page, pageSize }>}
 */
export async function getStocktakePlanList(params = {}) {
    const { page = 1, pageSize = 20 } = params;
    try {
        const response = await apiClient.get('/StocktakePlan/ListAllStocktakePlans', {
            params: { page, pageSize },
        });
        const { items: rawItems, totalItems, page: pg, pageSize: ps } = extractPaged(response);
        const items = (Array.isArray(rawItems) ? rawItems : []).map(mapStocktakeRow).filter(Boolean);
        return { items, totalItems, page: pg, pageSize: ps };
    } catch (error) {
        console.error('[stocktakeService] getStocktakePlanList failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. START EXECUTION  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bắt đầu thực thi kiểm kê (tạo snapshot tồn kho, khóa kho).
 * POST /StocktakeExecution/{id}/StartStocktakeExecution
 *
 * @param {number|string} id – StocktakeId
 * @returns {Promise<Object>}
 */
export async function startStocktakeExecution(id) {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${id}/StartStocktakeExecution`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] startStocktakeExecution failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. GET LINES  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách dòng hàng kiểm kê.
 * GET /StocktakeExecution/{id}/Lines
 *
 * @param {number|string} stocktakeId
 * @param {Object} params
 * @param {number} [params.pageNumber=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.searchQuery]    – tìm SKU / tên
 * @param {string} [params.filterType]     – UNCOUNTED | DISCREPANCY
 * @returns {Promise<{ items, totalItems, page, pageSize }>}
 */
export async function getStocktakeLines(stocktakeId, params = {}) {
    const {
        pageNumber = 1,
        pageSize = 20,
        searchQuery = null,
        filterType = null,
    } = params;

    try {
        const response = await apiClient.get(`/StocktakeExecution/${stocktakeId}/Lines`, {
            params: { pageNumber, pageSize, searchQuery, filterType },
        });
        const { items: rawItems, totalItems, page: pg, pageSize: ps } = extractPaged(response);
        const items = (Array.isArray(rawItems) ? rawItems : []).map(mapStocktakeLineRow).filter(Boolean);
        return { items, totalItems, page: pg, pageSize: ps };
    } catch (error) {
        console.error('[stocktakeService] getStocktakeLines failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. UPDATE COUNTED QTY  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cập nhật số lượng đếm thực tế của một dòng kiểm kê.
 * PATCH /StocktakeExecution/UpdateActualCountedQty/{lineId}
 *
 * Backend nhận: UpdateCountedQtyRequest
 *   { countedQty: decimal, note?: string }
 *
 * @param {number|string} lineId
 * @param {{ countedQty: number, note?: string }} data
 * @returns {Promise<Object>}
 */
export async function updateCountedQty(lineId, data) {
    try {
        const response = await apiClient.patch(
            `/StocktakeExecution/UpdateActualCountedQty/${lineId}`,
            { countedQty: data.countedQty, note: data.note ?? null }
        );
        return mapStocktakeLineRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] updateCountedQty failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. BULK MATCH SYSTEM QTY  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Đánh dấu tất cả dòng chưa đếm = số hệ thống (khớp).
 * POST /StocktakeExecution/{id}/BulkMatchSystemQty
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Object>}
 */
export async function bulkMatchSystemQty(stocktakeId) {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${stocktakeId}/BulkMatchSystemQty`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] bulkMatchSystemQty failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SUBMIT RESULTS  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gửi kết quả kiểm kê sau khi đếm xong (execution IN_PROGRESS).
 * POST /StocktakeExecution/{id}/SubmitStocktakeResults
 * Mặc định gửi `{ status: 'COMPLETED' }` — backend chốt phiếu COMPLETED.
 * Truyền `{ status: 'PENDING_APPROVAL' }` nếu cần luồng chờ duyệt kết quả (hiếm).
 *
 * @param {number|string} stocktakeId
 * @param {{ status?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function submitStocktakeResults(stocktakeId, options = {}) {
    try {
        const status = options.status ?? 'COMPLETED';
        const response = await apiClient.post(
            `/StocktakeExecution/${stocktakeId}/SubmitStocktakeResults`,
            { status },
            { params: { status } },
        );
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. GET ADJUSTMENT PREVIEW  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách chênh lệch (VarianceQty != 0) để xem trước điều chỉnh.
 * GET /StocktakeExecution/{id}/GetAdjustmentPreview
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Array>}
 */
export async function getAdjustmentPreview(stocktakeId) {
    try {
        const response = await apiClient.get(`/StocktakeExecution/${stocktakeId}/GetAdjustmentPreview`);
        const raw = extractBody(response);
        const list = Array.isArray(raw) ? raw : [];
        return list.map(mapAdjustmentPreviewRow).filter(Boolean);
    } catch (error) {
        console.error('[stocktakeService] getAdjustmentPreview failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. APPROVE & FINALIZE  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Giai đoạn 2 — Phê duyệt / chốt kết quả kiểm kê (sau khi gửi kết quả, có chênh lệch → PENDING_RESULTADJ).
 * POST /StocktakeExecution/{id}/ApproveAndFinalizeResults
 *
 * Backend nhận: StocktakeApprovalRequest
 *   { decision: 'APPROVE' | 'RECOUNT' | 'REJECT', reason? }
 *
 * @param {number|string} stocktakeId
 * @param {{ decision: string, reason?: string }} data
 * @returns {Promise<Object>}
 */
export async function approveAndFinalizeStocktakeResults(stocktakeId, data) {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${stocktakeId}/ApproveAndFinalizeResults`, {
            decision: data.decision?.toUpperCase(),
            reason: data.reason ?? null,
        });
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] approveAndFinalizeStocktakeResults failed:', error);
        throw error.response?.data || error;
    }
}

/** @deprecated Dùng {@link approveAndFinalizeStocktakeResults} */
export async function approveStocktakeStep1(stocktakeId, data) {
    return approveAndFinalizeStocktakeResults(stocktakeId, data);
}

/** @deprecated Dùng {@link approveAndFinalizeStocktakeResults} */
export async function approveStocktakeStep2(stocktakeId, data) {
    return approveAndFinalizeStocktakeResults(stocktakeId, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. POST ADJUSTMENT  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ghi sổ điều chỉnh tồn kho (tạo InventoryAdjustmentRequest tự động).
 * POST /StocktakeExecution/{id}/PostAdjustment
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Object>}
 */
export async function postAdjustment(stocktakeId) {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${stocktakeId}/PostAdjustment`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] postAdjustment failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16. COMPLETE STOCKTAKE  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hoàn tất phiên kiểm kê (không có chênh lệch, đã duyệt đủ).
 * POST /StocktakeExecution/{id}/CompleteStocktake
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Object>}
 */
export async function completeStocktake(stocktakeId) {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${stocktakeId}/CompleteStocktake`);
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] completeStocktake failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 17. CANCEL EXECUTION  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hủy phiên kiểm kê.
 * POST /StocktakeExecution/{id}/CancelStocktake
 *
 * @param {number|string} stocktakeId
 * @param {string} [reason]
 * @returns {Promise<Object>}
 */
export async function cancelStocktakeExecution(stocktakeId, reason = '') {
    try {
        const response = await apiClient.post(`/StocktakeExecution/${stocktakeId}/CancelStocktake`, {
            reason: reason || null,
        });
        return mapStocktakeRow(extractBody(response));
    } catch (error) {
        console.error('[stocktakeService] cancelStocktakeExecution failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 18. GET APPROVAL HISTORY  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy lịch sử phê duyệt của một phiên kiểm kê.
 * GET /StocktakeExecution/{id}/GetApprovalHistory
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Array>}
 */
export async function getApprovalHistory(stocktakeId) {
    try {
        const response = await apiClient.get(`/StocktakeExecution/${stocktakeId}/GetApprovalHistory`);
        const raw = extractBody(response);
        const list = Array.isArray(raw) ? raw : [];
        return list.map(mapApprovalHistoryRow).filter(Boolean);
    } catch (error) {
        console.error('[stocktakeService] getApprovalHistory failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 19. LIST COMPLETED  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách phiên kiểm kê đã hoàn thành.
 * GET /StocktakeExecution/ListAllCompletedStocktakes
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @returns {Promise<{ items, totalItems, page, pageSize }>}
 */
export async function getCompletedStocktakes(params = {}) {
    const { page = 1, pageSize = 20 } = params;
    try {
        const response = await apiClient.get('/StocktakeExecution/ListAllCompletedStocktakes', {
            params: { page, pageSize },
        });
        const { items: rawItems, totalItems, page: pg, pageSize: ps } = extractPaged(response);
        const items = (Array.isArray(rawItems) ? rawItems : []).map(mapStocktakeRow).filter(Boolean);
        return { items, totalItems, page: pg, pageSize: ps };
    } catch (error) {
        console.error('[stocktakeService] getCompletedStocktakes failed:', error);
        throw error.response?.data || error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 20. EXPORT PDF  (StocktakeExecutionController)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Xuất phiếu kiểm kê thành file PDF.
 * GET /StocktakeExecution/{id}/ExportStocktakeSheetPdf
 *
 * @param {number|string} stocktakeId
 * @returns {Promise<Blob>} – PDF file blob
 */
export async function exportStocktakePdf(stocktakeId) {
    try {
        const response = await apiClient.get(`/StocktakeExecution/${stocktakeId}/ExportStocktakeSheetPdf`, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        console.error('[stocktakeService] exportStocktakePdf failed:', error);
        throw error.response?.data || error;
    }
}
