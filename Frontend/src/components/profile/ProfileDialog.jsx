/*
 * Popup (Dialog) hồ sơ cá nhân – mockup thay cho trang Profile full-page.
 * Dùng: <ProfileDialog open={open} onClose={onClose} /> hoặc mở khi vào /profile.
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Button,
    TextField,
    Grid,
    Avatar,
    IconButton,
    LinearProgress,
    Tooltip,
    Stack,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import { User, Key, Save, Pencil, Mars, Venus, Camera, X, Calendar } from 'lucide-react';
import ChangePasswordDialog from './ChangePasswordDialog';
import authService from '../../shared/lib/authService';
import { useToast } from '../../shared/hooks/useToast';
import { validatePhoneWithMessage } from '../../shared/utils/validation';
import { ROLE_OPTIONS } from '../../shared/constants/roles';
import Toast from '../Toast/Toast';

const ProfileDialog = ({ open, onClose }) => {
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
        if (!open) return;
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const data = await authService.getProfile();
                setFormData({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    role: data.roleName || ROLE_OPTIONS[data.roleId] || 'N/A',
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
    }, [open, showToast]);

    const handleEditToggle = () => setIsEditing((prev) => !prev);

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
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: 24,
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 700,
                        fontSize: '1.125rem',
                    }}
                >
                    Hồ sơ cá nhân
                    <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }} aria-label="Đóng">
                        <X size={22} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {loading && <LinearProgress sx={{ borderRadius: 0 }} />}
                    <Box sx={{ p: 2.5 }}>
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
                                            width: 64,
                                            height: 64,
                                            borderRadius: '50%',
                                            bgcolor: isFemale ? 'secondary.main' : 'primary.main',
                                            boxShadow: 1,
                                        }}
                                    >
                                        {formData.fullName ? (
                                            formData.fullName.charAt(0)
                                        ) : isFemale ? (
                                            <Venus size={32} color="white" />
                                        ) : formData.gender ? (
                                            <Mars size={32} color="white" />
                                        ) : (
                                            <User size={32} color="white" />
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
                                        <Camera size={14} color="#1976d2" />
                                    </IconButton>
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                        {formData.fullName || '—'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                        {formData.email || '—'}
                                    </Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                {isEditing ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Save size={16} />}
                                            onClick={handleSaveProfile}
                                            disabled={loading}
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 1.5 }}
                                        >
                                            Lưu
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleEditToggle}
                                            disabled={loading}
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 1.5 }}
                                        >
                                            Hủy
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<Pencil size={16} />}
                                        onClick={handleEditToggle}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 1.5 }}
                                    >
                                        Chỉnh sửa
                                    </Button>
                                )}
                                <Tooltip title="Đổi mật khẩu">
                                    <IconButton
                                        onClick={() => setOpenPasswordDialog(true)}
                                        color="default"
                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                                        size="small"
                                    >
                                        <Key size={18} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Họ và tên"
                                    value={formData.fullName || ''}
                                    InputProps={{
                                        readOnly: true,
                                        sx: { borderRadius: 2, bgcolor: '#f6f7f9', '& input': { py: 1 } },
                                    }}
                                    helperText="Chỉ Admin mới có quyền thay đổi"
                                    sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Vai trò"
                                    value={formData.role || ''}
                                    InputProps={{
                                        readOnly: true,
                                        sx: { borderRadius: 2, bgcolor: '#f6f7f9', '& input': { py: 1 } },
                                    }}
                                    helperText="Chỉ Admin mới có quyền thay đổi"
                                    sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Email"
                                    value={formData.email || ''}
                                    InputProps={{
                                        readOnly: true,
                                        sx: { borderRadius: 2, bgcolor: '#f6f7f9', '& input': { py: 1 } },
                                    }}
                                    sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Số điện thoại"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    InputProps={{
                                        readOnly: !isEditing,
                                        sx: {
                                            borderRadius: 2,
                                            bgcolor: isEditing ? 'background.paper' : '#f6f7f9',
                                            '& input': { py: 1 },
                                        },
                                    }}
                                    sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} sx={{ minWidth: 0 }}>
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
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
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
                                            '& input': { py: 1 },
                                            '& fieldset': { borderRadius: 2 },
                                        },
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ width: '100%', minWidth: 0, '& .MuiFormHelperText-root': { mx: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} sx={{ minWidth: 0 }}>
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
                                    <InputLabel id="profile-dialog-gender-label" shrink>
                                        Giới tính
                                    </InputLabel>
                                    <Select
                                        labelId="profile-dialog-gender-label"
                                        label="Giới tính"
                                        value={formData.gender || ''}
                                        displayEmpty
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
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
                </DialogContent>
            </Dialog>

            <ChangePasswordDialog
                open={openPasswordDialog}
                onClose={() => setOpenPasswordDialog(false)}
                onSuccess={handlePasswordDialogSuccess}
            />

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </>
    );
};

export default ProfileDialog;
