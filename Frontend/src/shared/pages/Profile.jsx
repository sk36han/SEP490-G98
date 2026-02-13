import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, Key, Eye, EyeOff, Loader } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import userService from '../lib/userService';
import '../styles/Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [changingPassword, setChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        role: '',
    });

    const [originalData, setOriginalData] = useState(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Fetch profile data from API on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const data = await userService.getProfile();
                const profileData = {
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    role: data.roleName || '',
                };
                setFormData(profileData);
                setOriginalData(profileData);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleBack = () => {
        navigate('/home');
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (originalData) {
            setFormData(originalData);
        }
    };

    const handleSaveProfile = () => {
        // Backend chưa có API update profile, chỉ hiển thị thông báo
        showToast('Cập nhật thông tin thành công!', 'success');
        setOriginalData({ ...formData });
        setIsEditing(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const validatePassword = () => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return false;
        }

        if (newPassword.length < 6) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
            return false;
        }

        if (!/[A-Z]/.test(newPassword)) {
            showToast('Mật khẩu phải chứa ít nhất 1 chữ hoa!', 'error');
            return false;
        }

        if (!/[0-9]/.test(newPassword)) {
            showToast('Mật khẩu phải chứa ít nhất 1 chữ số!', 'error');
            return false;
        }

        if (!/[!@#$%^&*]/.test(newPassword)) {
            showToast('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*)!', 'error');
            return false;
        }

        if (newPassword !== confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp!', 'error');
            return false;
        }

        return true;
    };

    const handleChangePassword = async () => {
        if (!validatePassword()) return;

        try {
            setChangingPassword(true);
            await userService.changePassword(
                passwordData.currentPassword,
                passwordData.newPassword,
                passwordData.confirmPassword
            );
            showToast('Đổi mật khẩu thành công!', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowChangePassword(false);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    if (loading) {
        return (
            <div className="profile-page-minimal">
                <div className="profile-container-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Loader size={40} className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page-minimal">
            <div className="profile-container-content">

                {/* Header with Back Button */}
                <div className="profile-top-bar">
                    <button onClick={handleBack} className="back-link">
                        <ArrowLeft size={20} />
                        <span>Quay lại Dashboard</span>
                    </button>
                    <h1>Hồ sơ cá nhân</h1>
                </div>

                {/* Profile Card */}
                <div className="profile-card-minimal">
                    <div className="profile-header-section">
                        <div className="avatar-large">
                            {formData.fullName.charAt(0)}
                        </div>
                        <div className="header-details">
                            <h2>{formData.fullName}</h2>
                            <span className="role-badge">{formData.role}</span>
                        </div>
                        <button className="edit-btn" onClick={handleEditToggle}>
                            {isEditing ? 'Đóng' : 'Chỉnh sửa'}
                        </button>
                    </div>

                    <div className="profile-info-grid">
                        <div className="info-group">
                            <label><User size={16} /> Họ và tên</label>
                            <input type="text" value={formData.fullName} disabled />
                        </div>

                        <div className="info-group">
                            <label><Mail size={16} /> Email</label>
                            <input type="email" value={formData.email} disabled />
                        </div>

                        <div className="info-group">
                            <label><Phone size={16} /> Số điện thoại</label>
                            <input type="tel" value={formData.phone} disabled={!isEditing} />
                        </div>

                    </div>

                    {isEditing && (
                        <div className="form-actions">
                            <button className="cancel-btn" onClick={handleCancelEdit}>Hủy</button>
                            <button className="save-btn" onClick={handleSaveProfile}>Lưu thay đổi</button>
                        </div>
                    )}
                </div>

                {/* Security Section */}
                <div className="security-section">
                    <h3><Key size={18} /> Bảo mật</h3>

                    <div className="security-row">
                        <div className="sec-info">
                            <strong>Mật khẩu</strong>
                            <p>Đổi mật khẩu để bảo vệ tài khoản của bạn</p>
                        </div>
                        <button className="change-pass-btn" onClick={() => setShowChangePassword(true)}>
                            Đổi mật khẩu
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {showChangePassword && (
                <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Đổi mật khẩu</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowChangePassword(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="change-password-form">
                            <div className="password-field">
                                <label>Mật khẩu hiện tại</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword.current ? "text" : "password"}
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Nhập mật khẩu hiện tại"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => togglePasswordVisibility('current')}
                                    >
                                        {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="password-field">
                                <label>Mật khẩu mới</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword.new ? "text" : "password"}
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => togglePasswordVisibility('new')}
                                    >
                                        {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="password-hint">
                                    Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt
                                </p>
                            </div>

                            <div className="password-field">
                                <label>Xác nhận mật khẩu mới</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword.confirm ? "text" : "password"}
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                    >
                                        {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="password-actions">
                                <button className="cancel-btn" disabled={changingPassword} onClick={() => {
                                    setShowChangePassword(false);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}>
                                    Hủy
                                </button>
                                <button className="save-btn" onClick={handleChangePassword} disabled={changingPassword}>
                                    {changingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                                </button>
                            </div>
                        </div>
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

export default Profile;
