import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    Box,
    Typography,
    Stack,
} from '@mui/material';
import { Key, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import authService from '../../shared/lib/authService';

const ChangePasswordDialog = ({ open, onClose, onSuccess }) => {
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async () => {
        const { oldPassword, newPassword, confirmPassword } = passwordData;

        if (!oldPassword || !newPassword || !confirmPassword) {
            onSuccess?.('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        if (newPassword.length < 6) {
            onSuccess?.('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            onSuccess?.('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(oldPassword, newPassword, confirmPassword);
            onSuccess?.('Đổi mật khẩu thành công!', 'success');
            onClose();
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            onSuccess?.(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontWeight: 600,
                        fontSize: '18px',
                        color: 'text.primary'
                    }}
                >
                    Đổi mật khẩu
                </Typography>
                <IconButton 
                    onClick={handleClose} 
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                        },
                    }}
                >
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 3 }}>
                <Stack spacing={3}>
                    {/* Mật khẩu hiện tại */}
                    <Box>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 500,
                                fontSize: '13px',
                                mb: 1,
                                color: 'text.primary'
                            }}
                        >
                            Mật khẩu hiện tại
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            name="oldPassword"
                            type={showPassword.current ? 'text' : 'password'}
                            value={passwordData.oldPassword}
                            onChange={handlePasswordChange}
                            placeholder="Nhập mật khẩu hiện tại"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            onClick={() => togglePasswordVisibility('current')} 
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: {
                                    height: '40px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    '& fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.2)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px',
                                    },
                                },
                            }}
                        />
                    </Box>

                    {/* Mật khẩu mới */}
                    <Box>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 500,
                                fontSize: '13px',
                                mb: 1,
                                color: 'text.primary'
                            }}
                        >
                            Mật khẩu mới
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            name="newPassword"
                            type={showPassword.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            placeholder="Nhập mật khẩu mới"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            onClick={() => togglePasswordVisibility('new')} 
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: {
                                    height: '40px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    '& fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.2)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px',
                                    },
                                },
                            }}
                        />
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: 'text.secondary',
                                fontSize: '11px',
                                mt: 0.5,
                                display: 'block'
                            }}
                        >
                            Tối thiểu 6 ký tự
                        </Typography>
                    </Box>

                    {/* Xác nhận mật khẩu */}
                    <Box>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 500,
                                fontSize: '13px',
                                mb: 1,
                                color: 'text.primary'
                            }}
                        >
                            Xác nhận mật khẩu mới
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            name="confirmPassword"
                            type={showPassword.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            placeholder="Nhập lại mật khẩu mới"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            onClick={() => togglePasswordVisibility('confirm')} 
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: {
                                    height: '40px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    '& fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(0, 0, 0, 0.2)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px',
                                    },
                                },
                            }}
                        />
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions 
                sx={{ 
                    p: 3, 
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                    gap: 1.5
                }}
            >
                <Button 
                    onClick={handleClose}
                    size="small"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '13px',
                        color: 'text.secondary',
                        px: 2,
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                        },
                    }}
                >
                    Hủy
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    size="small"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '13px',
                        px: 3,
                        py: 0.75,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                        },
                    }}
                >
                    Xác nhận đổi
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangePasswordDialog;
