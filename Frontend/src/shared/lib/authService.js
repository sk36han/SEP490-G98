import apiClient from './axios';
import {
    getPermissionRole as normalizePermissionRole,
    getRawRoleFromUser,
    getRoleFromToken,
} from '../permissions/roleUtils';

const toNonEmptyString = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const extractErrorMessage = (error) => {
    const raw = error?.raw;
    const responseData = error?.response?.data;
    const candidates = [
        responseData?.message,
        responseData?.Message,
        responseData?.error,
        responseData?.Error,
        raw?.message,
        raw?.Message,
        raw?.error,
        raw?.Error,
        error?.message,
    ];
    return candidates.map(toNonEmptyString).find(Boolean) || null;
};

const isRawHttpStatusMessage = (message) => /^\d{3}$/.test(String(message || '').trim());

const authService = {
    async login(identifier, password, rememberMe = false) {
        try {
            const response = await apiClient.post('/Auth/login', {
                identifier,
                password,
                rememberMe,
            });

            const data = response.data ?? {};
            // Backend (ASP.NET) có thể trả PascalCase hoặc camelCase tùy cấu hình JSON
            const requiresOtp =
                data.requiresOtp === true ||
                data.RequiresOtp === true;
            const rawUserId = data.userId ?? data.UserId;
            const accessToken = data.accessToken ?? data.AccessToken;
            const expiresAt = data.expiresAt ?? data.ExpiresAt;
            const message = data.message ?? data.Message;
            const user = data.user ?? data.User;

            if (requiresOtp) {
                if (rawUserId == null) {
                    throw new Error('Phien dang nhap OTP khong hop le. Vui long thu lai.');
                }
                localStorage.setItem('pendingUserId', String(rawUserId));
                localStorage.setItem('pendingEmail', identifier);
                // Do NOT store token here — wait for OTP verification to complete
                return {
                    requiresOtp: true,
                    userId: rawUserId,
                    message: message || 'Vui long kiem tra email de nhap ma OTP',
                };
            }

            if (!accessToken) {
                throw new Error(message || 'Dang nhap that bai: khong nhan duoc token.');
            }

            localStorage.setItem('token', accessToken);
            localStorage.setItem('tokenExpiresAt', expiresAt);

            try {
                const profileResponse = await apiClient.get('/User/profile');
                const userFromProfile = profileResponse.data;
                const roleFromToken = getRoleFromToken(accessToken);

                const userWithRole = {
                    ...(userFromProfile || {}),
                    roleCode: userFromProfile?.roleCode ?? userFromProfile?.RoleCode ?? user?.roleCode ?? roleFromToken,
                    roleName: userFromProfile?.roleName ?? userFromProfile?.RoleName ?? user?.roleName ?? roleFromToken,
                    role: userFromProfile?.role ?? userFromProfile?.Role ?? user?.role ?? roleFromToken,
                    roleId: userFromProfile?.roleId ?? userFromProfile?.RoleId ?? user?.roleId,
                };

                localStorage.setItem('userInfo', JSON.stringify(userWithRole));
            } catch {
                console.warn('Failed to fetch user profile');
                const roleFromToken = getRoleFromToken(accessToken);
                const userForStorage = {
                    ...(user || {}),
                    roleCode: user?.roleCode ?? roleFromToken,
                    roleName: user?.roleName ?? roleFromToken,
                    role: user?.role ?? roleFromToken,
                };
                localStorage.setItem('userInfo', JSON.stringify(userForStorage));
            }

            authService.notifySessionReady();
            return {
                requiresOtp: false,
                accessToken,
                expiresAt,
                message,
                user,
            };
        } catch (error) {
            const status = Number(error?.response?.status ?? error?.status ?? error?.raw?.status) || 0;
            const detail = extractErrorMessage(error);

            if (status === 401) {
                // Login 401 should always be shown as invalid credentials.
                throw new Error('Email/Username hoặc mật khẩu không đúng.');
            }

            if (!error.response && !status) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error('Hết thời gian chờ máy chủ. Vui lòng thử lại.');
                }
                throw new Error(
                    'Không kết nối được API. Hãy chạy backend (ví dụ http://localhost:5141) và thử lại. ' +
                        '(Kiểm tra tab Network: request /api/Auth/login có bị (failed) không.)'
                );
            }
            if (status === 500) {
                throw new Error(detail || 'Loi dang nhap.');
            } else {
                throw new Error(
                    detail && !isRawHttpStatusMessage(detail)
                        ? detail
                        : 'Loi dang nhap.'
                );
            }
        }
    },

    async verifyOtp(otp) {
        const userId = localStorage.getItem('pendingUserId');
        
        if (!userId) {
            throw new Error('Session expired. Vui long dang nhap lai.');
        }

        try {
            const response = await apiClient.post('/Auth/verify-otp', {
                userId: parseInt(userId, 10),
                otp,
                rememberMe: false
            });

            const verifyData = response.data ?? {};
            const accessToken = verifyData.accessToken ?? verifyData.AccessToken;
            const expiresAt = verifyData.expiresAt ?? verifyData.ExpiresAt;
            const user = verifyData.user ?? verifyData.User;

            if (!accessToken) {
                throw new Error('Xac thuc thanh cong nhung khong nhan duoc token. Vui long dang nhap lai.');
            }

            localStorage.setItem('token', accessToken);
            localStorage.setItem('tokenExpiresAt', expiresAt);

            // Get role from token first
            let roleFromToken = getRoleFromToken(accessToken);
            
            // Try to fetch user profile for complete info
            try {
                const profileResponse = await apiClient.get('/User/profile');
                const userFromProfile = profileResponse.data;
                
                const userWithRole = {
                    ...(userFromProfile || {}),
                    roleCode: userFromProfile?.roleCode ?? userFromProfile?.RoleCode ?? roleFromToken,
                    roleName: userFromProfile?.roleName ?? userFromProfile?.RoleName ?? roleFromToken,
                    role: userFromProfile?.role ?? userFromProfile?.Role ?? roleFromToken,
                    roleId: userFromProfile?.roleId ?? userFromProfile?.RoleId,
                };

                localStorage.setItem('userInfo', JSON.stringify(userWithRole));
            } catch {
                // Fallback: use user from response and role from token
                const userWithRole = {
                    ...(user || {}),
                    roleCode: user?.roleCode ?? roleFromToken,
                    roleName: user?.roleName ?? roleFromToken,
                    role: user?.role ?? roleFromToken,
                };
                localStorage.setItem('userInfo', JSON.stringify(userWithRole));
            }

            localStorage.removeItem('pendingUserId');
            localStorage.removeItem('pendingEmail');

            authService.notifySessionReady();
            return response.data;
        } catch (error) {
            if (!error.response) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error('Hết thời gian chờ máy chủ.');
                }
                throw new Error('Không kết nối được API. Hãy chạy backend và thử lại.');
            }
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Ma OTP khong hop le.');
            } else if (error.response?.status === 401) {
                throw new Error('Mã OTP không đúng.');
            } else {
                throw new Error(error.response?.data?.message || 'Xac thuc OTP that bai.');
            }
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('pendingUserId');
        localStorage.removeItem('pendingEmail');
        try {
            sessionStorage.removeItem('otpGatePending');
        } catch {
            /* ignore */
        }
    },

    /** Báo cho MasterData / các listener: đã có JWT hợp lệ sau login hoặc verify OTP. */
    notifySessionReady() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mk-auth-ready'));
        }
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    },

    getPermissionRole() {
        const userInfo = this.getUser();
        return normalizePermissionRole(getRawRoleFromUser(userInfo));
    },

    getCurrentUserId() {
        const user = this.getUser();
        if (user?.userId != null) return user.userId;
        if (user?.UserId != null) return user.UserId;
        if (user?.id != null) return user.id;
        if (user?.Id != null) return user.Id;
        // Fallback: decode JWT token để lấy nameidentifier (userId từ backend)
        const token = this.getToken();
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                if (base64Url) {
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(
                        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                    );
                    const payload = JSON.parse(jsonPayload);
                    const tokenUserId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
                        ?? payload.nameidentifier
                        ?? payload.sub
                        ?? payload.userId
                        ?? null;
                    if (tokenUserId != null) return Number(tokenUserId);
                }
            } catch {
                // ignore decode errors
            }
        }
        return null;
    },

    getCurrentUserName() {
        const user = this.getUser();
        return user?.fullName ?? user?.userName ?? user?.name ?? user?.fullname ?? null;
    },

    isLoggedIn() {
        const token = this.getToken();
        if (!token) return false;
        
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        if (expiresAt && new Date(expiresAt) < new Date()) return false;
        
        return true;
    },

    isAuthenticated() {
        // If OTP is pending, user is NOT fully authenticated yet — do not allow API calls
        if (localStorage.getItem('pendingUserId')) {
            return false;
        }
        return this.isLoggedIn();
    },

    isFullyAuthenticated() {
        return this.isLoggedIn() && !localStorage.getItem('pendingUserId');
    },

    isTokenExpired() {
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
    },

    async forgotPassword(email) {
        try {
            const response = await apiClient.post('/Auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Khong the gui email.');
        }
    },

    async resetPassword(token, newPassword) {
        try {
            const response = await apiClient.post('/Auth/reset-password', {
                token,
                newPassword,
                confirmPassword: newPassword,
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể đặt lại mật khẩu.');
        }
    },

    async getProfile() {
        try {
            const response = await apiClient.get('/User/profile');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Khong tai duoc thong tin.');
        }
    },

    async updateProfile(payload) {
        const body = typeof payload === 'string'
            ? { phone: payload }
            : {
                phone: payload?.phone ?? '',
                ...(payload?.gender != null && payload.gender !== '' && { gender: payload.gender }),
                ...(payload?.dob != null && payload.dob !== '' && { dob: payload.dob }),
            };
        try {
            const response = await apiClient.put('/User/profile', body);
            const currentUser = this.getUser();
            if (currentUser) {
                currentUser.phone = body.phone;
                if (body.gender != null) currentUser.gender = body.gender;
                if (body.dob != null) currentUser.dob = body.dob;
                localStorage.setItem('userInfo', JSON.stringify(currentUser));
            }
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Khong cap nhat duoc.');
        }
    },

    async changePassword(oldPassword, newPassword, confirmPassword) {
        try {
            const response = await apiClient.post('/User/change-password', {
                oldPassword,
                newPassword,
                confirmPassword
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
        }
    },
};

export default authService;
