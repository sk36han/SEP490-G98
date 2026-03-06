import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Button,
    TextField,
    Grid,
    Avatar,
    IconButton,
    Fade,
    LinearProgress,
    Tooltip,
    Paper,
    Stack,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import { ArrowLeft, User, Key, Save, Pencil, Mars, Venus, Camera, Calendar } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import ChangePasswordDialog from '../../components/profile/ChangePasswordDialog';
import authService from '../lib/authService';
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
            const dobStr = formData.dob
                ? (typeof formData.dob === 'string' && formData.dob.length >= 10 ? formData.dob.substring(0, 10) : new Date(formData.dob).toISOString().slice(0, 10))
                : undefined;
            await authService.updateProfile({
                phone: formData.phone,
                gender: formData.gender || undefined,
                dob: dobStr,
            });
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

    const isFemale = formData.gender && (
        String(formData.gender).toLowerCase().includes('nữ') ||
        String(formData.gender).toLowerCase().includes('female') ||
        String(formData.gender).toLowerCase() === 'f'
    );

    return (
        <Box sx={{ minHeight: '100%', bgcolor: 'grey.50', py: 3 }}>
            <Fade in={true} timeout={400}>
                <Container maxWidth="lg" sx={{ py: 4 }}>
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
                                    transition: 'all 0.2s',
                                },
                            }}
                        >
                            Quay lại
                        </Button>
                    </Box>

                    {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

                    <Paper
    elevation={0}
    sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
    }}
>
    <Grid
        container
        spacing={3}
        sx={{
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            alignItems: 'stretch',
        }}
    >
        {/* Left Column: Avatar, Name, Role, Actions */}
        <Grid item xs={12} md={4} sx={{ minWidth: 280 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
                {/* Avatar Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                bgcolor: isFemale ? 'secondary.main' : 'primary.main',
                                boxShadow: 3,
                                fontSize: '3rem',
                            }}
                        >
                            {formData.fullName ? (
                                formData.fullName.charAt(0)
                            ) : isFemale ? (
                                <Venus size={50} color="white" />
                            ) : formData.gender ? (
                                <Mars size={50} color="white" />
                            ) : (
                                <User size={50} color="white" />
                            )}
                        </Avatar>

                        <IconButton
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                bgcolor: 'background.paper',
                                boxShadow: 2,
                                '&:hover': { bgcolor: 'grey.100' },
                            }}
                            size="medium"
                        >
                            <Camera size={20} color="#1976d2" />
                        </IconButton>
                    </Box>

                    {/* Name & Email */}
                    <Typography
                        variant="h5"
                        fontWeight="bold"
                        textAlign="center"
                        sx={{ mb: 0.5 }}
                    >
                        {formData.fullName || '—'}
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        sx={{ mb: 1 }}
                    >
                        {formData.email || '—'}
                    </Typography>

                    {/* Role Badge */}
                    {formData.role && (
                        <Box
                            sx={{
                                px: 2,
                                py: 0.75,
                                borderRadius: 999,
                                bgcolor: 'rgba(25,118,210,0.1)',
                                color: 'primary.main',
                                fontSize: 14,
                                fontWeight: 600,
                            }}
                        >
                            {formData.role}
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Action Buttons */}
                <Stack spacing={1.5}>
                    {isEditing ? (
                        <>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={<Save size={20} />}
                                onClick={handleSaveProfile}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.25,
                                }}
                            >
                                Lưu thay đổi
                            </Button>

                            <Button
                                fullWidth
                                variant="outlined"
                                size="large"
                                onClick={handleEditToggle}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.25,
                                }}
                            >
                                Hủy
                            </Button>
                        </>
                    ) : (
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<Pencil size={20} />}
                            onClick={handleEditToggle}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 1.25,
                            }}
                        >
                            Chỉnh sửa hồ sơ
                        </Button>
                    )}

                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<Key size={20} />}
                        onClick={() => setOpenPasswordDialog(true)}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.25,
                        }}
                    >
                        Đổi mật khẩu
                    </Button>
                </Stack>
            </Stack>
        </Grid>

        {/* Vertical Divider */}
        <Grid
            item
            sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'stretch',
                px: 0,
            }}
        >
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        </Grid>

        {/* Right Column: Form Fields */}
        <Grid item xs={12} md sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ width: '100%' }}>
                <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{
                        color: 'text.primary',
                        mb: 3,
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                        pb: 1,
                    }}
                >
                    Thông tin cá nhân
                </Typography>

                    <Grid container spacing={2.5}>
                        {/* Row 1: Họ tên + Email */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Họ và tên"
                                name="fullName"
                                value={formData.fullName || ''}
                                InputProps={{
                                    readOnly: true,
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: '#f6f7f9',
                                        '& input': { py: 1.25 },
                                    },
                                }}
                                helperText="Chỉ Admin mới có quyền thay đổi"
                                sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Email"
                                name="email"
                                value={formData.email || ''}
                                InputProps={{
                                    readOnly: true,
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: '#f6f7f9',
                                        '& input': { py: 1.25 },
                                    },
                                }}
                                sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                            />
                        </Grid>

                        {/* Row 2: SĐT + Ngày sinh */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Số điện thoại"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                InputProps={{
                                    readOnly: !isEditing,
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: isEditing ? 'background.paper' : '#f6f7f9',
                                        '& input': { py: 1.25 },
                                    },
                                }}
                                sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Ngày sinh"
                                name="dob"
                                type={isEditing ? 'date' : 'text'}
                                value={
                                    isEditing
                                        ? formData.dob || ''
                                        : formData.dob
                                        ? new Date(formData.dob + 'T00:00:00').toLocaleDateString(
                                              'vi-VN',
                                              {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                              }
                                          )
                                        : ''
                                }
                                onChange={(e) =>
                                    setFormData({ ...formData, dob: e.target.value })
                                }
                                InputProps={{
                                    readOnly: !isEditing,
                                    startAdornment: !isEditing && formData.dob ? (
                                        <InputAdornment position="start" sx={{ mr: 1 }}>
                                            <Calendar
                                                size={18}
                                                style={{
                                                    color: 'var(--mui-palette-text-secondary)',
                                                }}
                                            />
                                        </InputAdornment>
                                    ) : null,
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: isEditing ? 'background.paper' : '#f6f7f9',
                                        '& input': { py: 1.25 },
                                        '& fieldset': { borderRadius: 2 },
                                    },
                                }}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiFormHelperText-root': { mx: 0 },
                                }}
                            />
                        </Grid>

                        {/* Row 3: Giới tính */}

                    <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                        {isEditing ? (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Giới tính"
                                name="gender"
                                value={formData.gender || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, gender: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        '& .MuiSelect-select': { py: 1.25 },
                                    },
                                }}
                            >
                                <MenuItem value="male">Nam</MenuItem>
                                <MenuItem value="female">Nữ</MenuItem>
                                <MenuItem value="other">Khác</MenuItem>
                            </TextField>
                        ) : (
                            <TextField
                                fullWidth
                                size="small"
                                label="Giới tính"
                                name="gender"
                                value={
                                    formData.gender === 'male'
                                        ? 'Nam'
                                        : formData.gender === 'female'
                                        ? 'Nữ'
                                        : formData.gender === 'other'
                                        ? 'Khác'
                                        : formData.gender || ''
                                }
                                InputProps={{
                                    readOnly: true,
                                    sx: {
                                        borderRadius: 2,
                                        bgcolor: '#f6f7f9',
                                        '& input': { py: 1.25 },
                                    },
                                }}
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                    </Grid>

                    {/* Empty cell để cân layout */}
                    <Grid item xs={12} md={6} />
                </Grid>
            </Box>
        </Grid>
    </Grid>
</Paper>

                    <ChangePasswordDialog
                        open={openPasswordDialog}
                        onClose={() => setOpenPasswordDialog(false)}
                        onSuccess={handlePasswordDialogSuccess}
                    />

                    {toast && (
                        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
                    )}
                </Container>
            </Fade>
        </Box>
    );
};

export default Profile;
