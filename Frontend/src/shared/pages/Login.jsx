import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import logo from '../assets/logo.png';
import Toast from '../../components/Toast/Toast';
import authService from '../lib/authService';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        setLoading(true);

        try {
            await authService.login(formData.email, formData.password, formData.rememberMe);

            showToast('Đăng nhập thành công!', 'success');

            setTimeout(() => {
                navigate('/home');
            }, 1500);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="login-form-container">
                    <div className="login-form">
                        <div className="logo-section">
                            <img src={logo} alt="Minh Khanh Logo" className="company-logo" />
                        </div>

                        <p className="welcome-text">
                            Chào mừng bạn đến với Minh Khanh Warehouse Management System
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="login-input"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Mật khẩu"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="login-input"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={togglePasswordVisibility}
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="login-options">
                                <label className="remember-me">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                    />
                                    Ghi nhớ đăng nhập
                                </label>

                                <Link to="/forgot-password" className="forgot-password">
                                    Quên mật khẩu?
                                </Link>
                            </div>

                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>
                        </form>

                        <div className="footer-text">© 2026 Minh Khanh Warehouse Management System</div>
                    </div>
                </div>
            </div>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
};

export default Login;
