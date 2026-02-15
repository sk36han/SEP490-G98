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
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    py: 2,
                }}
            >
                <Typography variant="h6" fontWeight="bold">
                    Đổi mật khẩu
                </Typography>
                <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 4, minWidth: 400 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <TextField
                        fullWidth
                        label="Mật khẩu hiện tại"
                        name="oldPassword"
                        type={showPassword.current ? 'text' : 'password'}
                        value={passwordData.oldPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Key size={18} className="text-gray-500" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('current')} edge="end">
                                        {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2 },
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Mật khẩu mới"
                        name="newPassword"
                        type={showPassword.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <ShieldCheck size={18} className="text-gray-500" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('new')} edge="end">
                                        {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2 },
                        }}
                        helperText="Tối thiểu 6 ký tự"
                    />
                    <TextField
                        fullWidth
                        label="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        type={showPassword.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <ShieldCheck size={18} className="text-gray-500" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('confirm')} edge="end">
                                        {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2 },
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        px: 4,
                        borderRadius: 2,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    }}
                >
                    Xác nhận đổi
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangePasswordDialog;
