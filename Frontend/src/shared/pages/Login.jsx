import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Checkbox,
    FormControlLabel,
    Typography,
    InputAdornment,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import logo from '../assets/logo.png';
import Toast from '../../components/Toast/Toast';
import AuthLayout from '../../components/Layout/AuthLayout';
import authService from '../lib/authService';
import { useToast } from '../hooks/useToast';
import { getPermissionRole, isPermissionRoleValid } from '../permissions/roleUtils';

const ROLE_ERROR_MESSAGE = 'Tài khoản đang bị lỗi vai trò. Vui lòng liên hệ quản trị viên.';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast, showToast, clearToast } = useToast();

    useEffect(() => {
        if (location.state?.roleError) {
            showToast(ROLE_ERROR_MESSAGE, 'error');
            window.history.replaceState({}, '', location.pathname);
        }
    }, [location.state?.roleError]);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
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

            const userInfo = authService.getUser();
            const rawRole = userInfo?.roleCode || userInfo?.roleName;
            const permissionRole = getPermissionRole(rawRole);

            if (!isPermissionRoleValid(permissionRole)) {
                authService.logout();
                showToast(ROLE_ERROR_MESSAGE, 'error');
                setLoading(false);
                return;
            }

            showToast('Đăng nhập thành công!', 'success');

            setTimeout(() => {
                switch (permissionRole) {
                    case 'ADMIN': navigate('/admin/home'); break;
                    case 'DIRECTOR': navigate('/director/home'); break;
                    case 'WAREHOUSE_KEEPER': navigate('/products'); break;
                    case 'SALE_SUPPORT': navigate('/sale-support/home'); break;
                    case 'SALE_ENGINEER': navigate('/sale-engineer/home'); break;
                    case 'ACCOUNTANTS': navigate('/products'); break;
                    default: navigate('/home');
                }
            }, 1000);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <AuthLayout fadeTimeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img
                    src={logo}
                    alt="Minh Khanh Logo"
                    style={{
                        maxWidth: '140px',
                        height: 'auto',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                    }}
                />
            </Box>

            <Typography
                variant="h4"
                component="h1"
                align="center"
                fontWeight="800"
                color="primary.main"
                gutterBottom
            >
                Chào mừng trở lại!
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                Đăng nhập vào hệ thống quản lý kho
            </Typography>

            <form onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    type="email"
                    name="email"
                    label="Email"
                    value={formData.email}
                    onChange={handleChange}
                    margin="normal"
                    required
                    autoComplete="email"
                    autoFocus
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Mail size={20} className="text-gray-400" />
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    label="Mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                    margin="normal"
                    required
                    autoComplete="current-password"
                    sx={{
                        mt: 2,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Lock size={20} className="text-gray-400" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                size="small"
                                sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                            />
                        }
                        label={
                            <Typography variant="body2" color="text.secondary">
                                Ghi nhớ đăng nhập
                            </Typography>
                        }
                    />
                    <Link
                        to="/forgot-password"
                        style={{
                            textDecoration: 'none',
                            color: '#1976D2',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                        }}
                    >
                        Quên mật khẩu?
                    </Link>
                </Box>

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                        py: 1.8,
                        borderRadius: 2,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        textTransform: 'none',
                        boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        '&:hover': {
                            background: 'linear-gradient(45deg, #2196F3 60%, #21CBF3 90%)',
                            boxShadow: '0 6px 20px rgba(0,118,255,0.23)',
                        },
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng nhập'}
                </Button>
            </form>

            <Typography
                variant="caption"
                align="center"
                color="text.secondary"
                sx={{ display: 'block', mt: 4 }}
            >
                © 2026 Minh Khanh Warehouse Management System
            </Typography>

        </AuthLayout>
        {toast && (
            <Toast message={toast.message} type={toast.type} onClose={clearToast} />
        )}
        </>
    );
};

export default Login;
