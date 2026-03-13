import apiClient from './axios';
import { getRoleFromToken } from '../permissions/roleUtils';

const authService = {
    async login(identifier, password, rememberMe = false) {
        try {
            const response = await apiClient.post('/Auth/login', {
                identifier,
                password,
                rememberMe,
            });

            const { requiresOtp, userId, accessToken, expiresAt, user, message } = response.data;

            if (requiresOtp) {
                localStorage.setItem('pendingUserId', userId);
                localStorage.setItem('pendingEmail', identifier);
                return {
                    requiresOtp: true,
                    userId: userId,
                    message: message || 'Vui long kiem tra email de nhap ma OTP'
                };
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
            } catch (profileError) {
                console.warn('Failed to fetch user profile:', profileError?.response?.status);
                const roleFromToken = getRoleFromToken(accessToken);
                const userForStorage = {
                    ...(user || {}),
                    roleCode: user?.roleCode ?? roleFromToken,
                    roleName: user?.roleName ?? roleFromToken,
                    role: user?.role ?? roleFromToken,
                };
                localStorage.setItem('userInfo', JSON.stringify(userForStorage));
            }

            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Email/Username hoac mat khau khong dung.');
            } else if (error.response?.status === 500) {
                const detail = error.response?.data?.error || error.response?.data?.message;
                throw new Error(detail || 'Loi dang nhap.');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout. Vui long kiem tra ket noi.');
            } else {
                throw new Error(error.response?.data?.message || 'Loi dang nhap.');
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
                userId: parseInt(userId),
                otp,
                rememberMe: false
            });

            const { accessToken, expiresAt, user } = response.data;

            localStorage.setItem('token', accessToken);
            localStorage.setItem('tokenExpiresAt', expiresAt);

            const roleFromToken = getRoleFromToken(accessToken);
            const userWithRole = {
                ...(user || {}),
                roleCode: user?.roleCode ?? roleFromToken,
                roleName: user?.roleName ?? roleFromToken,
                role: user?.role ?? roleFromToken,
            };

            localStorage.setItem('userInfo', JSON.stringify(userWithRole));

            localStorage.removeItem('pendingUserId');
            localStorage.removeItem('pendingEmail');

            return response.data;
        } catch (error) {
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Ma OTP khong hop le.');
            } else if (error.response?.status === 401) {
                throw new Error('Ma OTP khong dung.');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout.');
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
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    },

    isLoggedIn() {
        const token = this.getToken();
        if (!token) return false;
        
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        if (expiresAt && new Date(expiresAt) < new Date()) {
            this.logout();
            return false;
        }
        
        return true;
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
            throw new Error(error.response?.data?.message || 'Khong the dat lai mat khau.');
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
            throw new Error(error.response?.data?.message || 'Doi mat khau that bai.');
        }
    },
};

export default authService;
