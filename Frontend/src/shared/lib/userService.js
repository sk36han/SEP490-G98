import apiClient from './axios';

const userService = {
    /**
     * Get current user profile
     * GET /api/User/profile
     * @returns {Promise<UserResponse>} User profile data
     */
    async getProfile() {
        try {
            const response = await apiClient.get('/User/profile');
            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            } else if (error.response?.status === 404) {
                throw new Error('Không tìm thấy thông tin người dùng.');
            } else if (error.message === 'Network Error') {
                throw new Error('Không thể kết nối đến server.');
            } else {
                throw new Error(error.response?.data?.message || 'Không thể tải thông tin cá nhân.');
            }
        }
    },

    /**
     * Change user password
     * POST /api/User/change-password
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @param {string} confirmPassword - Confirm new password
     * @returns {Promise<{success, message}>}
     */
    async changePassword(oldPassword, newPassword, confirmPassword) {
        try {
            const response = await apiClient.post('/User/change-password', {
                oldPassword,
                newPassword,
                confirmPassword,
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ.');
            } else if (error.response?.status === 401) {
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            } else if (error.response?.status === 404) {
                throw new Error(error.response?.data?.message || 'Không tìm thấy người dùng.');
            } else if (error.message === 'Network Error') {
                throw new Error('Không thể kết nối đến server.');
            } else {
                throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
            }
        }
    },
};

export default userService;
