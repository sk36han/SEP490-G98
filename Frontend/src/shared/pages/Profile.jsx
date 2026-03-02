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
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                                spacing={2}
                                sx={{ mb: 0 }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                        <Avatar
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: '50%',
                                                bgcolor: isFemale ? 'secondary.main' : 'primary.main',
                                                boxShadow: 1,
                                            }}
                                        >
                                            {formData.fullName ? (
                                                formData.fullName.charAt(0)
                                            ) : isFemale ? (
                                                <Venus size={40} color="white" />
                                            ) : formData.gender ? (
                                                <Mars size={40} color="white" />
                                            ) : (
                                                <User size={40} color="white" />
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
                                            size="small"
                                        >
                                            <Camera size={18} color="#1976d2" />
                                        </IconButton>
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                            {formData.fullName || '—'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {formData.email || '—'}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                size="medium"
                                                startIcon={<Save size={18} />}
                                                onClick={handleSaveProfile}
                                                disabled={loading}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    px: 2,
                                                }}
                                            >
                                                Lưu
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="medium"
                                                onClick={handleEditToggle}
                                                disabled={loading}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    px: 2,
                                                }}
                                            >
                                                Hủy
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            size="medium"
                                            startIcon={<Pencil size={18} />}
                                            onClick={handleEditToggle}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                px: 2,
                                            }}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                    <Tooltip title="Đổi mật khẩu">
                                        <IconButton
                                            onClick={() => setOpenPasswordDialog(true)}
                                            color="default"
                                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                                        >
                                            <Key size={20} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 3 }} />

                            <Box sx={{ maxWidth: 640 }}>
                                <Grid container spacing={3}>
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
                                        label="Vai trò"
                                        name="role"
                                        value={formData.role || ''}
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
                                <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Ngày sinh"
                                        name="dob"
                                        type={isEditing ? 'date' : 'text'}
                                        value={
                                            isEditing
                                                ? (formData.dob || '')
                                                : (formData.dob
                                                    ? new Date(formData.dob + 'T00:00:00').toLocaleDateString('vi-VN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                    })
                                                    : '')
                                        }
                                        onChange={(e) =>
                                            setFormData({ ...formData, dob: e.target.value })
                                        }
                                        InputProps={{
                                            readOnly: !isEditing,
                                            startAdornment: !isEditing && formData.dob ? (
                                                <InputAdornment position="start" sx={{ mr: 1 }}>
                                                    <Calendar size={18} style={{ color: 'var(--mui-palette-text-secondary)' }} />
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
                                        sx={{ width: '100%', minWidth: 0, '& .MuiFormHelperText-root': { mx: 0 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        disabled={!isEditing}
                                        variant="outlined"
                                        sx={{
                                            width: '100%',
                                            minWidth: 0,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                bgcolor: isEditing ? 'background.paper' : '#f6f7f9',
                                                '& fieldset': { borderRadius: 2, borderColor: 'divider' },
                                                '&:hover fieldset': { borderColor: isEditing ? 'primary.light' : undefined },
                                                '&.Mui-focused fieldset': { borderWidth: 2 },
                                            },
                                            '& .MuiSelect-select': { width: '100%', minWidth: 0 },
                                        }}
                                    >
                                        <InputLabel id="profile-gender-label" shrink>
                                            Giới tính
                                        </InputLabel>
                                        <Select
                                            labelId="profile-gender-label"
                                            label="Giới tính"
                                            value={formData.gender || ''}
                                            displayEmpty
                                            onChange={(e) =>
                                                setFormData({ ...formData, gender: e.target.value })
                                            }
                                            renderValue={(v) => {
                                                if (!v) return ' ';
                                                const map = { male: 'Nam', female: 'Nữ', other: 'Khác' };
                                                return map[v] || v;
                                            }}
                                        >
                                            <MenuItem value="male">Nam</MenuItem>
                                            <MenuItem value="female">Nữ</MenuItem>
                                            <MenuItem value="other">Khác</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                </Grid>
                            </Box>
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
