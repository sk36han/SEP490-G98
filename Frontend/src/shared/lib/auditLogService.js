import apiClient from './axios';

/**
 * Service gọi API Audit Log (backend: GET /api/audit-log, GET /api/audit-log/{id})
 * Dùng cho trang Audit Log của Admin.
 */
const auditLogService = {
    /**
     * Lấy danh sách audit log có filter + phân trang
     * @param {Object} filter - { action, entityType, actorUserId, fromDate, toDate, keyword, pageNumber, pageSize }
     * @returns {Promise<{ items, page, pageSize, totalItems }>}
     */
    getAuditLogs: async (filter = {}) => {
        const params = {
            pageNumber: filter.pageNumber ?? 1,
            pageSize: Math.min(100, Math.max(1, filter.pageSize ?? 20)),
        };
        if (filter.action) params.action = filter.action;
        if (filter.entityType) params.entityType = filter.entityType;
        if (filter.actorUserId != null) params.actorUserId = filter.actorUserId;
        if (filter.fromDate) params.fromDate = filter.fromDate;
        if (filter.toDate) params.toDate = filter.toDate;
        if (filter.keyword) params.keyword = filter.keyword;

        const response = await apiClient.get('/audit-log', { params });
        const body = response.data;
        const data = body?.data ?? body;
        const items = data?.items ?? data?.Items ?? [];
        return {
            items,
            page: data?.page ?? data?.Page ?? 1,
            pageSize: data?.pageSize ?? data?.PageSize ?? params.pageSize,
            totalItems: data?.totalItems ?? data?.TotalItems ?? items.length,
        };
    },

    /**
     * Lấy chi tiết một bản ghi audit log
     * @param {number} id - AuditLogId
     * @returns {Promise<Object>} AuditLogResponse
     */
    getAuditLogById: async (id) => {
        const response = await apiClient.get(`/audit-log/${id}`);
        const body = response.data;
        return body?.data ?? body;
    },
};

export default auditLogService;
