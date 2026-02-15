import axiosInstance from './axios';

const adminService = {
    /**
     * Get user list with pagination and filters
     * @param {Object} filter - { pageNumber, pageSize, searchTerm }
     * @returns {Promise} - PagedResult with user data
     */
    getUserList: async (filter = { pageNumber: 1, pageSize: 10, searchTerm: '' }) => {
        try {
            // ASP.NET Core [FromQuery] UserFilterRequest filter bind theo prefix "filter." hoặc không prefix
            const pageNum = filter.pageNumber ?? 1;
            const pageSz = Math.min(Math.max(1, filter.pageSize || 10), 100);
            const params = {
                pageNumber: pageNum,
                pageSize: pageSz,
                searchTerm: filter.searchTerm ?? '',
                'filter.PageNumber': pageNum,
                'filter.PageSize': pageSz,
                'filter.SearchTerm': filter.searchTerm ?? ''
            };
            const response = await axiosInstance.get('/admin/users/get-users', { params });
            // Backend trả về ApiResponse: { success, message, data: PagedResult }; PagedResult có Items (PascalCase) hoặc items (camelCase)
            const body = response.data;
            const paged = body?.data ?? body;
            const list = paged?.items ?? paged?.Items ?? [];
            return { data: { ...paged, items: list }, raw: body };
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể tải danh sách người dùng');
        }
    },

    /**
     * Create new user account
     * @param {Object} userData - { email, fullName, roleId }
     * @returns {Promise} - Created user response
     */
    createUser: async (userData) => {
        try {
            const response = await axiosInstance.post('/admin/users/create-user', userData);
            // Backend returns ApiResponse wrapper
            return response.data; // { success, message, data: CreateUserResponse }
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể tạo tài khoản người dùng');
        }
    },

    /**
     * Update user information
     * @param {number} userId - User ID
     * @param {Object} userData - { fullName, roleId, isActive }
     * @returns {Promise} - Updated user response
     */
    updateUser: async (userId, userData) => {
        try {
            const response = await axiosInstance.put(`/admin/users/update-user/${userId}`, userData);
            // Backend returns ApiResponse wrapper
            return response.data; // { success, message, data: AdminUserResponse }
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể cập nhật thông tin người dùng');
        }
    },

    /**
     * Toggle user active status (Enable/Disable)
     * @param {number} userId - User ID
     * @returns {Promise} - Updated user response
     */
    toggleUserStatus: async (userId) => {
        try {
            const response = await axiosInstance.patch(`/admin/users/toggle-status/${userId}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể thay đổi trạng thái người dùng');
        }
    },

    /**
     * Export user list to Excel
     * @returns {Promise} - File blob
     */
    exportUsersExcel: async () => {
        try {
            const response = await axiosInstance.get('/admin/users/export-excel', {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Không thể xuất file Excel');
        }
    }
};

export default adminService;
