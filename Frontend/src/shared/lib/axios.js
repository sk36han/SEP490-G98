import axios from 'axios';
import { handleSessionExpired } from './sessionLifecycle';
import { normalizeApiError } from './apiErrorNormalizer';

/**
 * Base URL cho API:
 * - Nếu có VITE_API_BASE_URL → dùng (production / tùy chỉnh).
 * - Dev (không set env): dùng `/api` + proxy trong vite.config → cùng origin với Vite, tránh lỗi cross-origin.
 * - Fallback build: trực tiếp localhost.
 */
const getApiBaseURL = () => {
    const env = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : '';
    if (env && String(env).trim() !== '') {
        return String(env).trim().replace(/\/$/, '');
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        return '/api';
    }
    return 'http://localhost:5141/api';
};

const apiBaseURL = getApiBaseURL();

const apiClient = axios.create({
    baseURL: apiBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 seconds timeout
});

/** Các endpoint đăng nhập / OTP không được gửi kèm Bearer (token cũ có thể làm backend trả lỗi). */
const isPublicAuthRequest = (config) => {
    const path = String(config.url || '').split('?')[0].toLowerCase();
    return (
        path.includes('/auth/login') ||
        path.includes('/auth/verify-otp') ||
        path.includes('/auth/forgot-password') ||
        path.includes('/auth/reset-password')
    );
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && !isPublicAuthRequest(config)) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (isPublicAuthRequest(config)) {
            delete config.headers.Authorization;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const requestConfig = error?.config ?? {};
        // Handle 401 Unauthorized - token expired or invalid
        // Skip auth endpoints (login/otp/forgot/reset) to avoid showing session-expired toast on login failures.
        if (error.response?.status === 401 && !isPublicAuthRequest(requestConfig)) {
            handleSessionExpired({
                redirectToLogin: true,
                skipIfOtpPending: true,
            });
        }

        return Promise.reject(normalizeApiError(error));
    }
);

export default apiClient;

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const extractBody = (response) => {
    if (!response) return null;
    // Axios wraps data in .data; API standard wraps in .data.data
    const d = response?.data;
    return d?.data ?? d ?? null;
};