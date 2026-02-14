import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    CircularProgress,
    Avatar,
    Fade,
} from '@mui/material';
import { KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import AuthLayout from '../../components/Layout/AuthLayout';
import authService from '../lib/authService';
import { useToast } from '../hooks/useToast';
import { validateEmail } from '../utils/validation';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [email, setEmail] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            showToast('Vui lòng nhập email!', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showToast('Email không hợp lệ!', 'error');
            return;
        }

        setLoading(true);

        try {
            await authService.forgotPassword(email);
            showToast('Email khôi phục mật khẩu đã được gửi!', 'success');
            setIsSuccess(true);

            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <AuthLayout>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar
                    sx={{
                        m: 1,
                        bgcolor: 'primary.light',
                        width: 64,
                        height: 64,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                >
                    <KeyRound size={32} color="white" />
                </Avatar>
                <Typography component="h1" variant="h4" fontWeight="800" color="primary.main" gutterBottom>
                    Quên Mật Khẩu?
                </Typography>
                <Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: '80%' }}>
                    {!isSuccess
                        ? 'Đừng lo lắng! Hãy nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.'
                        : 'Email đã được gửi thành công!'}
                </Typography>
            </Box>

            {!isSuccess ? (
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        type="email"
                        label="Địa chỉ Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        autoFocus
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.5)',
                            },
                        }}
                    />

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
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            'Gửi liên kết đặt lại'
                        )}
                    </Button>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Link
                            to="/login"
                            style={{
                                textDecoration: 'none',
                                color: '#1976D2',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <ArrowLeft size={16} /> Quay lại đăng nhập
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
                    <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                        Vui lòng kiểm tra hộp thư đến (và cả mục spam) để nhận liên kết đặt lại mật khẩu
                        của bạn.
                    </Typography>
                    <Button
                        component={Link}
                        to="/login"
                        variant="outlined"
                        fullWidth
                        sx={{
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 'bold',
                        }}
                    >
                        Quay lại trang đăng nhập
                    </Button>
                </Box>
            )}

        </AuthLayout>
        {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </>
    );
};

export default ForgotPassword;
