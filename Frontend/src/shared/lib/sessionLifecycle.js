import { emitGlobalToast } from './toastBridge';

const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
const DEFAULT_REDIRECT_DELAY_MS = 1000;

let sessionExpiryHandling = false;

const clearAuthStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('pendingUserId');
    localStorage.removeItem('pendingEmail');
    try {
        sessionStorage.removeItem('otpGatePending');
    } catch {
        /* ignore */
    }
};

export const isSessionExpiryBeingHandled = () => sessionExpiryHandling;

export const handleSessionExpired = ({
    message = SESSION_EXPIRED_MESSAGE,
    toastType = 'warning',
    redirectToLogin = false,
    redirectDelayMs = DEFAULT_REDIRECT_DELAY_MS,
    skipIfOtpPending = true,
} = {}) => {
    if (skipIfOtpPending && localStorage.getItem('pendingUserId')) {
        return false;
    }

    if (sessionExpiryHandling) {
        return false;
    }

    sessionExpiryHandling = true;
    clearAuthStorage();
    emitGlobalToast(message, toastType);

    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && redirectToLogin) {
        window.setTimeout(() => {
            window.location.assign('/login');
        }, redirectDelayMs);
    }

    const releaseDelay = Math.max(3000, redirectDelayMs + 1200);
    window.setTimeout(() => {
        sessionExpiryHandling = false;
    }, releaseDelay);

    return true;
};
