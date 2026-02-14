import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Grid,
    Avatar,
    Chip,
    IconButton,
    Fade,
    InputAdornment,
    LinearProgress,
} from '@mui/material';
import { ArrowLeft, User, Mail, Phone, Calendar, Key, Camera, Save, Briefcase } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import ChangePasswordDialog from '../../components/profile/ChangePasswordDialog';
import authService from '../lib/authService';
import backgroundImage from '../assets/background.jpg';
import { useToast } from '../hooks/useToast';
import { validatePhoneWithMessage } from '../utils/validation';
import { ROLE_OPTIONS } from '../constants/roles';

const Profile = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        role: '',
        dob: '',
        gender: '',
        username: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const data = await authService.getProfile();
                setFormData({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    role:
                        data.roleName || ROLE_OPTIONS[data.roleId] || 'N/A',
                    dob: data.dob ? data.dob.split('T')[0] : '',
                    gender: data.gender || '',
                    username: data.username || '',
                });
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [showToast]);

    const handleBack = () => {
        navigate('/home');
    };

    const handleEditToggle = () => {
        setIsEditing((prev) => !prev);
    };

    const handleSaveProfile = async () => {
        const validation = validatePhoneWithMessage(formData.phone);
        if (!validation.valid) {
            showToast(validation.message, 'error');
            return;
        }

        setLoading(true);
        try {
            await authService.updateProfile(formData.phone);
            showToast('Cập nhật thông tin thành công!', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordDialogSuccess = (message, type) => {
        if (message) showToast(message, type);
    };

    return (
        <Box
            sx={{
                height: 'calc(100vh - 100px)',
                maxHeight: 'calc(100vh - 100px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(240, 242, 245, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 0,
                },
            }}
        >
            <Fade in={true} timeout={800}>
                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: 1000,
                        mx: 'auto',
                        width: '100%',
                        py: 2,
                        px: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
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
                                    transition: 'all 0.2s',
                                },
                            }}
                        >
                            Quay lại
                        </Button>
                        <Typography variant="h4" fontWeight="800" color="primary.dark">
                            Hồ sơ cá nhân
                        </Typography>
                    </Box>

                    {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1, flexShrink: 0 }} />}

                    <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                        <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                            <Card
                                elevation={10}
                                sx={{
                                    borderRadius: 3,
                                    background: 'rgba(255, 255, 255, 0.75)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    textAlign: 'center',
                                    p: 2,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <Box sx={{ position: 'relative', display: 'inline-block', mb: 1.5 }}>
                                    <Avatar
                                        sx={{
                                            width: 88,
                                            height: 88,
                                            margin: '0 auto',
                                            bgcolor: 'primary.main',
                                            fontSize: '3rem',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                            border: '4px solid white',
                                        }}
                                    >
                                        {formData.fullName ? (
                                            formData.fullName.charAt(0)
                                        ) : (
                                            <User size={44} />
                                        )}
                                    </Avatar>
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            bgcolor: 'white',
                                            boxShadow: 2,
                                            '&:hover': { bgcolor: 'grey.100' },
                                        }}
                                        size="small"
                                    >
                                        <Camera size={18} color="#1976d2" />
                                    </IconButton>
                                </Box>

                                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1rem' }}>
                                    {formData.fullName}
                                </Typography>
                                <Chip
                                    label={formData.role || 'N/A'}
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 600, mb: 1.5 }}
                                />

                                <Box sx={{ textAlign: 'left', mt: 1 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 1,
                                            p: 1,
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            borderRadius: 1.5,
                                        }}
                                    >
                                        <Mail size={16} style={{ marginRight: 8, color: '#1976d2' }} />
                                        <Typography variant="body2" noWrap title={formData.email} sx={{ fontSize: '0.8rem' }}>
                                            {formData.email}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            p: 1,
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            borderRadius: 1.5,
                                        }}
                                    >
                                        <Phone size={16} style={{ marginRight: 8, color: '#1976d2' }} />
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                            {formData.phone || 'Chưa cập nhật'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Button
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    startIcon={<Key size={16} />}
                                    sx={{ mt: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                    onClick={() => setOpenPasswordDialog(true)}
                                >
                                    Đổi mật khẩu
                                </Button>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={8} sx={{ display: 'flex' }}>
                            <Card
                                elevation={10}
                                sx={{
                                    borderRadius: 3,
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    minHeight: 0,
                                }}
                            >
                                <CardContent sx={{ p: 2, flex: 1, minHeight: 0, '&:last-child': { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 2,
                                        }}
                                    >
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                            Thông tin cá nhân
                                        </Typography>
                                        <Button
                                            variant={isEditing ? 'contained' : 'soft'}
                                            color={isEditing ? 'primary' : 'inherit'}
                                            size="small"
                                            startIcon={
                                                isEditing ? <Save size={16} /> : <User size={16} />
                                            }
                                            onClick={isEditing ? handleSaveProfile : handleEditToggle}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                bgcolor: isEditing ? 'primary.main' : 'rgba(0,0,0,0.05)',
                                            }}
                                            disabled={loading}
                                        >
                                            {isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}
                                        </Button>
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Họ và tên"
                                                name="fullName"
                                                value={formData.fullName}
                                                InputProps={{
                                                    readOnly: true,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <User size={16} className="text-gray-500" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)' },
                                                }}
                                                helperText="Liên hệ Admin để thay đổi"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Email"
                                                name="email"
                                                value={formData.email}
                                                InputProps={{
                                                    readOnly: true,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Mail size={16} className="text-gray-500" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)' },
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Số điện thoại"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, phone: e.target.value })
                                                }
                                                InputProps={{
                                                    readOnly: !isEditing,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Phone size={16} className="text-gray-500" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 1.5 },
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Vai trò"
                                                name="role"
                                                value={formData.role}
                                                InputProps={{
                                                    readOnly: true,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Briefcase size={16} className="text-gray-500" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)' },
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Ngày sinh"
                                                name="dob"
                                                type={isEditing ? 'date' : 'text'}
                                                value={formData.dob}
                                                InputProps={{
                                                    readOnly: true,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Calendar size={16} className="text-gray-500" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)' },
                                                }}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <ChangePasswordDialog
                        open={openPasswordDialog}
                        onClose={() => setOpenPasswordDialog(false)}
                        onSuccess={handlePasswordDialogSuccess}
                    />

                    {toast && (
                        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
                    )}
                </Box>
            </Fade>
        </Box>
    );
};

export default Profile;
