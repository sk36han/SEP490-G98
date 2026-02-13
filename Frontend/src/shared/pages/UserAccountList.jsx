import React, { useState, useEffect } from 'react';
import '../styles/UserAccountList.css';
import adminService from '../lib/adminService';
import Toast from '../../components/Toast/Toast';

const UserAccountList = () => {
    // State management
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form data
    const [createForm, setCreateForm] = useState({ email: '', fullName: '', roleId: 1 });
    const [editForm, setEditForm] = useState({ fullName: '', roleId: 1, isActive: true });

    // Toast helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Load users
    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await adminService.getUserList({
                pageNumber,
                pageSize,
                searchTerm: searchTerm.trim()
            });
            // Backend returns: { success, message, data: { items, totalCount, ... } }
            console.log('User list response:', response);
            const pagedResult = response.data; // Extract PagedResult from ApiResponse
            setUsers(pagedResult.items || []);
            setTotalCount(pagedResult.totalCount || 0);
        } catch (error) {
            console.error('Error loading users:', error);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search - wait 500ms after user stops typing
        const delaySearch = setTimeout(() => {
            loadUsers();
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [pageNumber, pageSize, searchTerm]);

    // Handle create user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!createForm.email || !createForm.fullName) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        try {
            await adminService.createUser(createForm);
            showToast('Tạo tài khoản thành công!', 'success');
            setShowCreateDialog(false);
            setCreateForm({ email: '', fullName: '', roleId: 1 });
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Handle edit user
    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!selectedUser || !editForm.fullName) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        try {
            await adminService.updateUser(selectedUser.userId, editForm);
            showToast('Cập nhật thành công!', 'success');
            setShowEditDialog(false);
            setSelectedUser(null);
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Handle toggle status
    const handleToggleStatus = async (userId, currentStatus) => {
        const confirmMessage = currentStatus
            ? 'Bạn có chắc muốn vô hiệu hóa tài khoản này?'
            : 'Bạn có chắc muốn kích hoạt tài khoản này?';

        if (!window.confirm(confirmMessage)) return;

        try {
            await adminService.toggleUserStatus(userId);
            showToast('Đã chuyển trạng thái tài khoản!', 'success');
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Handle export Excel
    const handleExportExcel = async () => {
        try {
            const blob = await adminService.exportUsersExcel();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Users_Export_${new Date().getTime()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Xuất Excel thành công!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Open edit dialog
    const openEditForm = (user) => {
        setSelectedUser(user);
        setEditForm({
            fullName: user.fullName,
            roleId: user.roleId || 1,
            isActive: user.isActive
        });
        setShowEditDialog(true);
    };

    // Pagination calculations
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (pageNumber - 1) * pageSize + 1;
    const endIndex = Math.min(pageNumber * pageSize, totalCount);

    return (
        <div className="user-account-container">
            {/* Header */}
            <div className="user-account-header">
                <h1>Quản lý tài khoản người dùng</h1>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        ➕ Tạo tài khoản
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleExportExcel}
                    >
                        📥 Xuất Excel
                    </button>
                </div>
            </div>

            {/* Search Filter */}
            <div className="search-filter-container">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPageNumber(1); // Reset to page 1 when searching
                        }}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm('')}
                            title="Xóa tìm kiếm"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Họ tên</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Số điện thoại</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-state">
                                            Không có dữ liệu người dùng
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.userId}>
                                            <td>{user.userId}</td>
                                            <td>{user.fullName}</td>
                                            <td>{user.username}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone || 'N/A'}</td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {user.roleName}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.isActive ? 'badge-success' : 'badge-inactive'}`}>
                                                    {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-icon btn-edit"
                                                        onClick={() => openEditForm(user)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className={`btn-icon ${user.isActive ? 'btn-disable' : 'btn-enable'}`}
                                                        onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                        title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    >
                                                        {user.isActive ? '🚫' : '✅'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Hiển thị {startIndex} - {endIndex} trong tổng số {totalCount} bản ghi
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="btn-pagination"
                                    onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                                    disabled={pageNumber === 1}
                                >
                                    ← Trước
                                </button>
                                <span className="page-info">
                                    Trang {pageNumber} / {totalPages || 1}
                                </span>
                                <button
                                    className="btn-pagination"
                                    onClick={() => setPageNumber(prev => Math.min(totalPages, prev + 1))}
                                    disabled={pageNumber >= totalPages}
                                >
                                    Sau →
                                </button>
                            </div>
                            <div className="page-size-selector">
                                <label>Số dòng:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPageNumber(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create User Dialog */}
            {showCreateDialog && (
                <div className="dialog-overlay" onClick={() => setShowCreateDialog(false)}>
                    <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h2>Tạo tài khoản mới</h2>
                            <button className="btn-close" onClick={() => setShowCreateDialog(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="dialog-body">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        required
                                        placeholder="example@email.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={createForm.fullName}
                                        onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                                        required
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select
                                        value={createForm.roleId}
                                        onChange={(e) => setCreateForm({ ...createForm, roleId: Number(e.target.value) })}
                                    >
                                        <option value={1}>Admin</option>
                                        <option value={2}>Manager</option>
                                        <option value={3}>Staff</option>
                                    </select>
                                </div>
                            </div>
                            <div className="dialog-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateDialog(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Tạo tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Dialog */}
            {showEditDialog && selectedUser && (
                <div className="dialog-overlay" onClick={() => setShowEditDialog(false)}>
                    <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h2>Chỉnh sửa thông tin</h2>
                            <button className="btn-close" onClick={() => setShowEditDialog(false)}>✕</button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            <div className="dialog-body">
                                <div className="form-group">
                                    <label>Email (không thể sửa)</label>
                                    <input
                                        type="email"
                                        value={selectedUser.email}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={editForm.fullName}
                                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select
                                        value={editForm.roleId}
                                        onChange={(e) => setEditForm({ ...editForm, roleId: Number(e.target.value) })}
                                    >
                                        <option value={1}>Admin</option>
                                        <option value={2}>Manager</option>
                                        <option value={3}>Staff</option>
                                    </select>
                                </div>
                            </div>
                            <div className="dialog-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditDialog(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Cập nhật
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default UserAccountList;
