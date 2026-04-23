import apiClient from './axios';

const normalizeNotification = (item) => ({
    notificationId: item.notificationId ?? item.NotificationId ?? 0,
    title: item.title ?? item.Title ?? '',
    message: item.message ?? item.Message ?? '',
    refType: item.refType ?? item.RefType ?? null,
    refId: item.refId ?? item.RefId ?? null,
    isRead: item.isRead ?? item.IsRead ?? false,
    createdAt: item.createdAt ?? item.CreatedAt ?? null,
    type: item.type ?? item.Type ?? null,
    severity: item.severity ?? item.Severity ?? 0,
    expiresAt: item.expiresAt ?? item.ExpiresAt ?? null,
});

const readEnvelope = (response) => response?.data?.data ?? response?.data ?? {};

const notificationService = {
    async getMyNotifications({
        type,
        severity,
        isRead,
        fromDate,
        toDate,
        pageNumber = 1,
        pageSize = 20,
    } = {}) {
        const params = { pageNumber, pageSize };
        if (type) params.type = type;
        if (severity != null) params.severity = severity;
        if (isRead != null) params.isRead = isRead;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const response = await apiClient.get('/Notification/my-notification', { params });
        const body = readEnvelope(response);

        const items = Array.isArray(body.items ?? body.Items)
            ? (body.items ?? body.Items).map(normalizeNotification)
            : [];
        const totalItems = body.totalItems ?? body.TotalItems ?? 0;
        const page = body.page ?? body.Page ?? pageNumber;
        const size = body.pageSize ?? body.PageSize ?? pageSize;
        const totalPages = body.totalPages ?? body.TotalPages ?? Math.ceil(totalItems / Math.max(size, 1));

        return { items, totalItems, page, pageSize: size, totalPages };
    },

    async getUnreadCount() {
        const response = await apiClient.get('/Notification/unread-count');
        const body = readEnvelope(response);
        return Number(body ?? 0) || 0;
    },

    async markAsRead(notificationId) {
        await apiClient.put(`/Notification/${notificationId}/read`);
        return true;
    },

    async markAllAsRead() {
        await apiClient.put('/Notification/read-all');
        return true;
    },
};

export default notificationService;
