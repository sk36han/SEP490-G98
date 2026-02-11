import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/ForgotPassword.css';
import logo from '../../assets/logo.png';
import Toast from '../../../components/Toast/Toast';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [toast, setToast] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!email) {
            showToast('Vui lòng nhập email!', 'error');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Email không hợp lệ!', 'error');
            return;
        }

        // TODO: Call API to send reset password email
        console.log('Forgot password for:', email);
        showToast('Email khôi phục mật khẩu đã được gửi!', 'success');
        setIsSuccess(true);

        // Navigate back to login after 3 seconds
        setTimeout(() => {
            navigate('/login');
        }, 3000);
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-background">
                <div className="forgot-password-form-container">
                    <div className="forgot-password-form">
                        <div className="logo-section">
                            <img src={logo} alt="Minh Khanh Logo" className="company-logo" />
                        </div>

                        {!isSuccess ? (
                            <>
                                <h2 className="forgot-password-title">Quên mật khẩu?</h2>
                                <p className="forgot-password-subtitle">
                                    Nhập email của bạn để nhận liên kết đặt lại mật khẩu
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div className="input-group">
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="forgot-password-input"
                                            required
                                        />
                                    </div>

                                    <button type="submit" className="forgot-password-button">
                                        Gửi liên kết đặt lại
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
                                <h3>Email đã được gửi!</h3>
                                <p>
                                    Vui lòng kiểm tra hộp thư của bạn để nhận liên kết đặt lại mật khẩu.
                                    Bạn sẽ được chuyển về trang đăng nhập...
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

export default ForgotPassword;
