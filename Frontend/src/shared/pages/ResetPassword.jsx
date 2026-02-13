import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Card, CardContent, TextField, Button, Typography,
    CircularProgress, Container, InputAdornment, IconButton, Fade, Avatar
} from '@mui/material';
import { Eye, EyeOff, CheckCircle, ShieldCheck, Lock } from 'lucide-react';
import backgroundImage from '../assets/background.jpg';
import Toast from '../../components/Toast/Toast';
import authService from '../lib/authService';

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
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(3px)'
                },
                p: 2
            }}
        >
            <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <Fade in={true} timeout={800}>
                    <Card
                        elevation={24}
                        sx={{
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                        }}
                    >
                        <CardContent sx={{ p: 5 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                                <Avatar
                                    sx={{
                                        m: 1,
                                        bgcolor: 'primary.main',
                                        width: 64,
                                        height: 64,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <ShieldCheck size={32} color="white" />
                                </Avatar>
                                <Typography component="h1" variant="h4" fontWeight="800" color="primary.dark" gutterBottom>
                                    Đặt Lại Mật Khẩu
                                </Typography>
                                <Typography variant="body1" color="text.secondary" align="center">
                                    {!isSuccess
                                        ? "Vui lòng nhập mật khẩu mới để bảo vệ tài khoản của bạn."
                                        : "Tài khoản của bạn đã được bảo vệ thành công!"}
                                </Typography>
                            </Box>

                            {!isSuccess ? (
                                <form onSubmit={handleSubmit}>
                                    <TextField
                                        fullWidth
                                        type={showPassword.new ? 'text' : 'password'}
                                        name="newPassword"
                                        label="Mật khẩu mới"
                                        value={passwordData.newPassword}
                                        onChange={handleChange}
                                        margin="normal"
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                bgcolor: 'rgba(255,255,255,0.5)'
                                            }
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
                                                        onClick={() => togglePasswordVisibility('new')}
                                                        edge="end"
                                                    >
                                                        {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        type={showPassword.confirm ? 'text' : 'password'}
                                        name="confirmPassword"
                                        label="Xác nhận mật khẩu mới"
                                        value={passwordData.confirmPassword}
                                        onChange={handleChange}
                                        margin="normal"
                                        required
                                        sx={{
                                            mt: 2,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                bgcolor: 'rgba(255,255,255,0.5)'
                                            }
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
                                                        onClick={() => togglePasswordVisibility('confirm')}
                                                        edge="end"
                                                    >
                                                        {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        helperText="Mật khẩu phải có ít nhất 6 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt"
                                    />

                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={loading}
                                        sx={{
                                            mt: 4,
                                            mb: 2,
                                            py: 1.8,
                                            borderRadius: 2,
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            textTransform: 'none',
                                            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
                                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #2196F3 60%, #21CBF3 90%)',
                                                boxShadow: '0 6px 20px rgba(0,118,255,0.23)'
                                            }
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            'Đặt lại mật khẩu'
                                        )}
                                    </Button>

                                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                                        <Link
                                            to="/login"
                                            style={{
                                                textDecoration: 'none',
                                                color: '#1976D2',
                                                fontWeight: 600
                                            }}
                                        >
                                            ← Quay lại đăng nhập
                                        </Link>
                                    </Box>
                                </form>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                    <Fade in={isSuccess} timeout={1000}>
                                        <Box sx={{ mb: 3, color: 'success.main', display: 'flex', justifyContent: 'center' }}>
                                            <CheckCircle size={80} strokeWidth={1.5} />
                                        </Box>
                                    </Fade>
                                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                                        Thành công!
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                        Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng về trang đăng nhập...
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Fade>
            </Container>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </Box>
    );
};

export default ResetPassword;
