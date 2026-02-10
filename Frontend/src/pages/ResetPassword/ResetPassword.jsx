import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './ResetPassword.css';
import logo from '../../assets/images/logo.png';
import Toast from '../../components/Toast/Toast';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token'); // Get token from URL query params

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [toast, setToast] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation - Kiểm tra trường trống
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
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

        // TODO: Call API to reset password with token
        console.log('Reset password with token:', token);

        showToast('Đặt lại mật khẩu thành công!', 'success');
        setIsSuccess(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
            navigate('/login');
        }, 2000);
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
                                <p className="reset-password-subtitle">
                                    Vui lòng nhập mật khẩu mới của bạn
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div className="input-group">
                                        <input
                                            type="password"
                                            name="newPassword"
                                            placeholder="Mật khẩu mới"
                                            value={passwordData.newPassword}
                                            onChange={handleChange}
                                            className="reset-password-input"
                                            required
                                        />
                                    </div>

                                    <div className="input-group">
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            placeholder="Xác nhận mật khẩu mới"
                                            value={passwordData.confirmPassword}
                                            onChange={handleChange}
                                            className="reset-password-input"
                                            required
                                        />
                                    </div>

                                    <p className="password-hint">
                                        Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt
                                    </p>

                                    <button type="submit" className="reset-password-button">
                                        Đặt lại mật khẩu
                                    </button>

                                    <Link to="/login" className="back-to-login">
                                        ← Quay lại đăng nhập
                                    </Link>
                                </form>
                            </>
                        ) : (
                            <div className="success-message">
                                <div className="success-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </div>
                                <h3>Đặt lại mật khẩu thành công!</h3>
                                <p>
                                    Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển đến trang đăng nhập...
                                </p>
                            </div>
                        )}

                        <div className="footer-text">
                            © 2026 Minh Khanh Warehouse Management System
                        </div>
                    </div>
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

export default ResetPassword;
