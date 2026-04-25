import { normalizeApiError } from './apiErrorNormalizer';

export const mapErrorToToastType = (error) => {
    if (error?.type) return error.type;
    const status = Number(error?.status) || 0;
    if (status === 400 || status === 404 || status === 409 || status === 422) return 'warning';
    if (status === 401 || status === 403) return 'error';
    if (status >= 500) return 'error';
    return 'error';
};

export const notifyApiError = (showToast, error, fallbackMessage) => {
    const normalized = normalizeApiError(error, { defaultMessage: fallbackMessage });
    showToast(normalized.message, mapErrorToToastType(normalized));
    return normalized;
};

export const notifyApiSuccess = (showToast, message, type = 'success') => {
    if (!message) return;
    showToast(message, type);
};
