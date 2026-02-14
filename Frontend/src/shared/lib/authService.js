import apiClient from './axios';

const authService = {
    /**
     * Login user with email/username and password
     * @param {string} identifier - Email or username
     * @param {string} password - User password
     * @param {boolean} rememberMe - Remember me option
     * @returns {Promise<{accessToken, expiresAt, user}>}
     */
    async login(identifier, password, rememberMe = false) {
        try {
            const response = await apiClient.post('/Auth/login', {
                identifier,
                password,
                rememberMe,
            });

            const { accessToken, expiresAt, user } = response.data;

            // Store token first (needed for authenticated API calls)
            localStorage.setItem('token', accessToken);
            localStorage.setItem('tokenExpiresAt', expiresAt);

            // Fetch complete user profile with role from /api/User/profile
            try {
                const profileResponse = await apiClient.get('/User/profile');
                const userWithRole = profileResponse.data;
                localStorage.setItem('userInfo', JSON.stringify(userWithRole));
            } catch (profileError) {
                // Fallback: use user from login response if profile fetch fails
                console.warn('Failed to fetch user profile, using login data:', profileError);
                localStorage.setItem('userInfo', JSON.stringify(user));
            }

            return response.data;
        } catch (error) {
            // Re-throw with more specific error message
            if (error.response?.status === 401) {
                throw new Error('Email/Username hoặc mật khẩu không đúng');
            } else if (error.response?.status === 500) {
                throw new Error('Lỗi server. Vui lòng thử lại sau.');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout. Vui lòng kiểm tra kết nối.');
            } else if (error.message === 'Network Error') {
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend API.');
            } else {
                throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi trong quá trình đăng nhập');
            }
        }
    },

    /**
     * Logout user - clear all auth data
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('tokenExpiresAt');
    },

    /**
     * Get current auth token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('token');
    },

    /**
     * Get current user data
     * @returns {object|null}
     */
    getUser() {
        const userStr = localStorage.getItem('userInfo');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        const token = this.getToken();
        const expiresAt = localStorage.getItem('tokenExpiresAt');

        if (!token) return false;

        // Check if token is expired
        if (expiresAt) {
            const expiryDate = new Date(expiresAt);
            if (expiryDate < new Date()) {
                this.logout();
                return false;
            }
        }

        return true;
    },

    /**
     * Send forgot password email
     * @param {string} email - User email
     */
    async forgotPassword(email) {
        try {
            const response = await apiClient.post('/Auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể gửi email. Vui lòng thử lại.');
        }
    },

    /**
     * Reset password with token
     * @param {string} token - Reset token from email
     * @param {string} newPassword - New password
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await apiClient.post('/Auth/reset-password', {
                token,
                newPassword,
                confirmPassword: newPassword, // Backend requires confirmPassword for validation
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        }
    },

    /**
     * Get current user profile from API
     * @returns {Promise<object>}
     */
    async getProfile() {
        try {
            const response = await apiClient.get('/User/profile');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể tải thông tin hồ sơ.');
        }
    },

    /**
     * Update user profile (currently only Phone)
     * @param {string} phone - New phone number
     * @returns {Promise<object>}
     */
    async updateProfile(phone) {
        try {
            const response = await apiClient.put('/User/profile', { phone });
            // Update local storage if successful
            const currentUser = this.getUser();
            if (currentUser) {
                currentUser.phone = phone;
                localStorage.setItem('userInfo', JSON.stringify(currentUser));
            }
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể cập nhật hồ sơ.');
        }
    },

    /**
     * Change password
     * @param {string} oldPassword
     * @param {string} newPassword
     * @param {string} confirmPassword
     */
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
