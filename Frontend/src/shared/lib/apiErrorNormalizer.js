const STATUS_FALLBACK_MESSAGES = {
    400: 'Yêu cầu không hợp lệ.',
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu yêu cầu.',
    409: 'Dữ liệu đang xung đột, vui lòng thử lại.',
    422: 'Dữ liệu đầu vào chưa hợp lệ.',
    500: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
};

const toNonEmptyString = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};

const collectValidationMessages = (errors) => {
    if (!errors) return [];
    if (Array.isArray(errors)) {
        return errors
            .map((item) => toNonEmptyString(item))
            .filter(Boolean);
    }

    if (typeof errors === 'object') {
        return Object.values(errors)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .map((item) => toNonEmptyString(item))
            .filter(Boolean);
    }

    const single = toNonEmptyString(errors);
    return single ? [single] : [];
};

const inferTypeFromStatus = (status) => {
    if (status === 400 || status === 404 || status === 409 || status === 422) return 'warning';
    if (status >= 500) return 'error';
    if (status === 401 || status === 403) return 'error';
    return 'error';
};

export const getFallbackMessageByStatus = (status, defaultMessage) => {
    if (defaultMessage) return defaultMessage;
    return STATUS_FALLBACK_MESSAGES[status] || 'Khong the thuc hien thao tac luc nay.';
};

export const normalizeApiError = (error, options = {}) => {
    if (error?.isNormalizedApiError) return error;

    const responseData = error?.response?.data;
    const status = Number(error?.response?.status) || 0;

    const validationMessages = collectValidationMessages(
        responseData?.errors ?? responseData?.Errors
    );

    const candidates = [
        responseData,
        responseData?.message,
        responseData?.Message,
        responseData?.detail,
        responseData?.details,
        responseData?.title,
        error?.message,
        ...validationMessages,
    ];

    const message = candidates
        .map((value) => (typeof value === 'string' ? value : null))
        .map((value) => toNonEmptyString(value))
        .find(Boolean) || getFallbackMessageByStatus(status, options.defaultMessage);

    const normalized = new Error(message);
    normalized.name = 'ApiError';
    normalized.status = status;
    normalized.code = responseData?.code ?? responseData?.Code ?? null;
    normalized.type = inferTypeFromStatus(status);
    normalized.validationMessages = validationMessages;
    normalized.details = responseData?.detail ?? responseData?.details ?? null;
    normalized.raw = responseData ?? error;
    normalized.isNormalizedApiError = true;

    return normalized;
};
