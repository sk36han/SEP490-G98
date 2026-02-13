import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/ResetPassword.css';
import logo from '../assets/logo.png';
import Toast from '../../components/Toast/Toast';
import authService from '../lib/authService';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState({
        new: false,
        confirm: false
    });

    const [toast, setToast] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            showToast('Token không hợp lệ. Vui lòng thử lại từ email.', 'error');
            return;
        }

        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
            return;
        }

        if (!/[A-Z]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 chữ in hoa (A-Z)!', 'error');
            return;
        }

        if (!/[0-9]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 chữ số (0-9)!', 'error');
            return;
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword)) {
            showToast('Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)!', 'error');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }

        setLoading(true);

        try {
            await authService.resetPassword(token, passwordData.newPassword);
            showToast('Đặt lại mật khẩu thành công!', 'success');
            setIsSuccess(true);

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-container">
            <div className="reset-password-background">
                <div className="reset-password-form-container">
                    <div className="reset-password-form">
                        <div className="logo-section">
                            <img src={logo} alt="Minh Khanh Logo" className="company-logo" />
                        </div>

                        {!isSuccess ? (
                            <>
                                <p className="reset-password-subtitle">Vui lòng nhập mật khẩu mới của bạn</p>

                                <form onSubmit={handleSubmit}>
                                    <div className="input-group">
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPassword.new ? 'text' : 'password'}
                                                name="newPassword"
                                                placeholder="Mật khẩu mới"
                                                value={passwordData.newPassword}
                                                onChange={handleChange}
                                                className="reset-password-input"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="toggle-password"
                                                onClick={() => togglePasswordVisibility('new')}
                                                aria-label={showPassword.new ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                title={showPassword.new ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                            >
                                                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPassword.confirm ? 'text' : 'password'}
                                                name="confirmPassword"
                                                placeholder="Xác nhận mật khẩu mới"
                                                value={passwordData.confirmPassword}
                                                onChange={handleChange}
                                                className="reset-password-input"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="toggle-password"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                aria-label={showPassword.confirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                title={showPassword.confirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                            >
                                                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <p className="password-hint">
                                        Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt
                                    </p>

                                    <button type="submit" className="reset-password-button" disabled={loading}>
                                        {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                    </button>

                                    <Link to="/login" className="back-to-login">
                                        ← Quay lại đăng nhập
                                    </Link>
                                </form>
                            </>
                        ) : (
                            <div className="success-message">
                                <div className="success-icon">
                                    <svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </div>
                                <h3>Đặt lại mật khẩu thành công!</h3>
                                <p>Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển đến trang đăng nhập...</p>
                            </div>
                        )}

                        <div className="footer-text">© 2026 Minh Khanh Warehouse Management System</div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default ResetPassword;
