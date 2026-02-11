import React, { useState } from 'react';
import '../styles/Profile.css';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';

const Profile = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'settings'

    const [formData, setFormData] = useState({
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0912345678',
        gender: 'Nam',
        dob: '1995-05-15',
        role: 'Quản lý kho'
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [toast, setToast] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = (e) => {
        e.preventDefault();

        // Validation số điện thoại
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(formData.phone)) {
            showToast('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!', 'error');
            return;
        }

        // TODO: Call API to update profile
        showToast('Đã cập nhật thông tin thành công!', 'success');
        setIsEditing(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        // Validation - Độ dài tối thiểu
        if (passwordData.newPassword.length < 6) {
            showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
            return;
        }

        // Validation - Phải có ít nhất 1 chữ hoa
        if (!/[A-Z]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 chữ in hoa (A-Z)!', 'error');
            return;
        }

        // Validation - Phải có ít nhất 1 số
        if (!/[0-9]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 chữ số (0-9)!', 'error');
            return;
        }

        // Validation - Phải có ít nhất 1 ký tự đặc biệt
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)!', 'error');
            return;
        }

        // Validation - Xác nhận mật khẩu khớp
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }

        // TODO: Call API to change password
        showToast('Đổi mật khẩu thành công!', 'success');

        // Reset form
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const renderProfileContent = () => (
        <>
            <div className="profile-header-simple">
                <div className="header-avatar">
                    <div className="avatar-placeholder">
                        {formData.gender === 'Nữ' ? (
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                                <circle cx="12" cy="8" r="4" fill="#E91E63" fillOpacity="0.1" stroke="#E91E63" strokeWidth="1.5" />
                                <path d="M12 12C15.5 12 18.5 14 19 17C18.5 19 16 21 12 21C8 21 5.5 19 5 17C5.5 14 8.5 12 12 12Z" fill="#E91E63" fillOpacity="0.1" stroke="#E91E63" strokeWidth="1.5" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                                <circle cx="12" cy="8" r="4" fill="#1976D2" fillOpacity="0.1" stroke="#1976D2" strokeWidth="1.5" />
                                <path d="M12 12C15.5 12 18.5 14 19 17C18.5 19 16 21 12 21C8 21 5.5 19 5 17C5.5 14 8.5 12 12 12Z" fill="#1976D2" fillOpacity="0.1" stroke="#1976D2" strokeWidth="1.5" />
                            </svg>
                        )}
                    </div>
                </div>
                <div className="header-info">
                    <h2>{formData.fullName}</h2>
                    <p>Chức vụ: {formData.role}</p>
                </div>
                <div className="header-actions">
                    <button
                        className="edit-profile-btn"
                        onClick={() => setIsEditing(!isEditing)}
                        title="Chỉnh sửa thông tin"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="profile-body">
                <form onSubmit={handleSave} className="form-grid">
                    <div className="form-group full-width">
                        <label className="form-label">Họ và Tên</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Số điện thoại</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="form-input"
                            placeholder="Nhập số điện thoại (10 chữ số)"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Giới tính</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="form-input"
                        >
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ngày sinh</label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="form-input"
                        />
                    </div>

                    {isEditing && (
                        <div className="form-actions full-width">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setIsEditing(false)}
                            >
                                Hủy
                            </button>
                            <button type="submit" className="btn-save">Lưu thay đổi</button>
                        </div>
                    )}
                </form>
            </div>
        </>
    );

    const renderSettingsContent = () => (
        <div className="settings-body">
            <div className="settings-header">
                <h2>Đổi mật khẩu</h2>
                <p>Cập nhật mật khẩu để bảo mật tài khoản của bạn</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="password-form">
                <div className="form-group-password">
                    <label className="form-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Mật khẩu hiện tại
                    </label>
                    <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="form-input-password"
                        placeholder="Nhập mật khẩu hiện tại"
                        required
                    />
                </div>

                <div className="form-group-password">
                    <label className="form-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Mật khẩu mới
                    </label>
                    <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="form-input-password"
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        required
                        minLength="6"
                    />
                    <span className="form-hint">Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt</span>
                </div>

                <div className="form-group-password">
                    <label className="form-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Xác nhận mật khẩu mới
                    </label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="form-input-password"
                        placeholder="Nhập lại mật khẩu mới"
                        required
                    />
                </div>

                <div className="password-form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                        })}
                    >
                        Hủy
                    </button>
                    <button type="submit" className="btn-save">
                        Đổi mật khẩu
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="profile-page">
            <div className="page-content">

                {/* Sidebar (Left) */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <button className="back-btn" onClick={() => navigate(-1)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Quay lại
                        </button>
                    </div>

                    <div
                        className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <span className="nav-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </span>
                        Hồ sơ
                    </div>

                    <div
                        className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <span className="nav-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </span>
                        Thiết lập
                    </div>

                    <div className="logout-btn">
                        <div
                            className="sidebar-nav-item logout-item"
                            onClick={() => navigate('/login')}
                        >
                            <span className="nav-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </span>
                            Đăng xuất
                        </div>
                    </div>
                </div>

                {/* Main Panel (Right) */}
                <div className="main-panel">
                    {activeTab === 'profile' ? renderProfileContent() : renderSettingsContent()}
                </div>

            </div>

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

export default Profile;
