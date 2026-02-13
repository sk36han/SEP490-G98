import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, Button, TextField, Grid,
    Avatar, Chip, IconButton, Fade, Dialog, DialogTitle,
    DialogContent, DialogActions, InputAdornment, LinearProgress
} from '@mui/material';
import {
    ArrowLeft, User, Mail, Phone, Calendar, Key, Eye, EyeOff,
    Camera, Save, X, ShieldCheck
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import authService from '../../shared/lib/authService';
import backgroundImage from '../assets/background.jpg';

const Profile = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
    const [toast, setToast] = useState(null);

    // Initial dummy data - in real app, fetch from API
    const [formData, setFormData] = useState({
        fullName: 'Nguyễn Văn A',
        email: 'manager@warehouse.com',
        phone: '0912345678',
        role: 'Warehouse Manager',
        dob: '1995-05-15',
        gender: 'Nam'
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleBack = () => {
        navigate('/home');
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel edit - reset data if needed
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    };

    const handleSaveProfile = () => {
        // Validation logic here
        showToast('Cập nhật thông tin thành công!', 'success');
        setIsEditing(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleChangePasswordSubmit = () => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }

        showToast('Đổi mật khẩu thành công!', 'success');
        setOpenPasswordDialog(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    return (
        <Box
            sx={{
                minHeight: 'calc(100vh - 84px)', // Adjusted height to fit within layout
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                pt: 4, // Reduced padding
                pb: 4,
                px: 3,
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(240, 242, 245, 0.4)', // Light overlay
                    backdropFilter: 'blur(8px)',
                    zIndex: 0
                }
            }}
        >
            <Fade in={true} timeout={800}>
                <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1000, mx: 'auto' }}>

                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Button
                            startIcon={<ArrowLeft size={22} />}
                            onClick={handleBack}
                            sx={{
                                mr: 2,
                                color: 'primary.main',
                                fontWeight: 700,
                                fontSize: '1rem',
                                textTransform: 'none',
                                '&:hover': {
                                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                                    transform: 'translateX(-4px)',
                                    transition: 'all 0.2s'
                                }
                            }}
                        >
                            Quay lại
                        </Button>
                        <Typography variant="h4" fontWeight="800" color="primary.dark">
                            Hồ sơ cá nhân
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Left Column: Avatar & Quick Info */}
                        <Grid item xs={12} md={4}>
                            <Card
                                elevation={10}
                                sx={{
                                    borderRadius: 4,
                                    background: 'rgba(255, 255, 255, 0.75)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    textAlign: 'center',
                                    p: 3,
                                    height: '100%'
                                }}
                            >
                                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            margin: '0 auto',
                                            bgcolor: 'primary.main',
                                            fontSize: '3rem',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                            border: '4px solid white'
                                        }}
                                    >
                                        {formData.fullName.charAt(0)}
                                    </Avatar>
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            bgcolor: 'white',
                                            boxShadow: 2,
                                            '&:hover': { bgcolor: 'grey.100' }
                                        }}
                                        size="small"
                                    >
                                        <Camera size={18} />
                                    </IconButton>
                                </Box>

                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    {formData.fullName}
                                </Typography>
                                <Chip
                                    label={formData.role}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, mb: 3 }}
                                />

                                <Box sx={{ mt: 4, textAlign: 'left' }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Bảo mật
                                    </Typography>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<Key size={18} />}
                                        onClick={() => setOpenPasswordDialog(true)}
                                        sx={{
                                            justifyContent: 'flex-start',
                                            borderColor: 'divider',
                                            color: 'text.primary',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                bgcolor: 'primary.lighter'
                                            }
                                        }}
                                    >
                                        Đổi mật khẩu
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>

                        {/* Right Column: Details Form */}
                        <Grid item xs={12} md={8}>
                            <Card
                                elevation={10}
                                sx={{
                                    borderRadius: 4,
                                    background: 'rgba(255, 255, 255, 0.75)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    p: 3
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Thông tin chi tiết
                                    </Typography>
                                    <Button
                                        variant={isEditing ? "outlined" : "contained"}
                                        color={isEditing ? "error" : "primary"}
                                        startIcon={isEditing ? <X size={18} /> : <User size={18} />}
                                        onClick={handleEditToggle}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {isEditing ? 'Hủy bỏ' : 'Chỉnh sửa'}
                                    </Button>
                                </Box>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Họ và tên"
                                            value={formData.fullName}
                                            disabled
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <User size={20} className="text-gray-400" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.5)' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Email"
                                            value={formData.email}
                                            disabled
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Mail size={20} className="text-gray-400" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.5)' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Số điện thoại"
                                            value={formData.phone}
                                            disabled={!isEditing}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Phone size={20} className="text-gray-400" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: isEditing ? 'white' : 'rgba(255,255,255,0.5)' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Ngày sinh"
                                            type="date"
                                            value={formData.dob}
                                            disabled={!isEditing}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Calendar size={20} className="text-gray-400" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: isEditing ? 'white' : 'rgba(255,255,255,0.5)' } }}
                                        />
                                    </Grid>
                                </Grid>

                                {isEditing && (
                                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="contained"
                                            startIcon={<Save size={18} />}
                                            onClick={handleSaveProfile}
                                            sx={{
                                                px: 4,
                                                py: 1.2,
                                                borderRadius: 2,
                                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
                                            }}
                                        >
                                            Lưu thay đổi
                                        </Button>
                                    </Box>
                                )}
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            </Fade>

            {/* Change Password Dialog */}
            <Dialog
                open={openPasswordDialog}
                onClose={() => setOpenPasswordDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, p: 1 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ bgcolor: 'primary.lighter', p: 1, borderRadius: '50%', color: 'primary.main' }}>
                        <ShieldCheck size={24} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold">Đổi mật khẩu</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu của bạn cho người khác.
                    </Typography>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Mật khẩu hiện tại"
                        type={showPassword.current ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('current')}>
                                        {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Mật khẩu mới"
                        type={showPassword.new ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('new')}>
                                        {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Xác nhận mật khẩu mới"
                        type={showPassword.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => togglePasswordVisibility('confirm')}>
                                        {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        helperText="Mật khẩu phải có ít nhất 6 ký tự"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenPasswordDialog(false)} color="inherit">
                        Hủy
                    </Button>
                    <Button
                        onClick={handleChangePasswordSubmit}
                        variant="contained"
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

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

export default Profile;
