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
    Fade,
    LinearProgress,
    Paper,
    Stack,
    Chip,
    MenuItem,
    IconButton,
} from '@mui/material';
import { ArrowLeft, User, Key, Save, Pencil, X, Mars, Venus } from 'lucide-react';
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

    const [originalData, setOriginalData] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const data = await authService.getProfile();
                const profileData = {
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    role: data.roleName || ROLE_OPTIONS[data.roleId] || 'N/A',
                    dob: data.dob ? data.dob.split('T')[0] : '',
                    gender: data.gender || '',
                    username: data.username || '',
                };
                setFormData(profileData);
                setOriginalData(profileData);
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
        setIsEditing(true);
    };

    const handleCancel = () => {
        setFormData(originalData);
        setIsEditing(false);
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
                ? (typeof formData.dob === 'string' && formData.dob.length >= 10 
                    ? formData.dob.substring(0, 10) 
                    : new Date(formData.dob).toISOString().slice(0, 10))
                : undefined;
            await authService.updateProfile({
                phone: formData.phone,
                gender: formData.gender || undefined,
                dob: dobStr,
            });
            showToast('Cập nhật thông tin thành công!', 'success');
            setOriginalData(formData);
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

    const getGenderDisplay = (gender) => {
        if (gender === 'male') return 'Nam';
        if (gender === 'female') return 'Nữ';
        if (gender === 'other') return 'Khác';
        return gender || '—';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fafbfc' }}>
            <Fade in={true} timeout={400}>
                <Container 
                    maxWidth={false} 
                    sx={{ 
                        maxWidth: '1150px',
                        py: 4,
                        px: { xs: 2, sm: 3, md: 4 }
                    }}
                >
                    {/* Back Button */}
                    <Box sx={{ mb: 3 }}>
                        <Button
                            startIcon={<ArrowLeft size={18} />}
                            onClick={handleBack}
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                fontSize: '14px',
                                textTransform: 'none',
                                px: 1,
                                '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                },
                            }}
                        >
                            Quay lại
                        </Button>
                    </Box>

                    {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

                    {/* Header with Avatar, Name, Email, Role */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: '14px',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'rgba(0, 0, 0, 0.06)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 2
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                <Avatar
                                    sx={{
                                        width: 68,
                                        height: 68,
                                        bgcolor: isFemale ? 'secondary.main' : 'primary.main',
                                        fontSize: '1.5rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {formData.fullName ? (
                                        formData.fullName.charAt(0).toUpperCase()
                                    ) : isFemale ? (
                                        <Venus size={32} />
                                    ) : formData.gender ? (
                                        <Mars size={32} />
                                    ) : (
                                        <User size={32} />
                                    )}
                                </Avatar>

                                <Box sx={{ flex: 1 }}>
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            fontWeight: 600,
                                            fontSize: '20px',
                                            mb: 0.25,
                                            color: 'text.primary'
                                        }}
                                    >
                                        {formData.fullName || 'Người dùng'}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '13px',
                                            mb: 0.75
                                        }}
                                    >
                                        {formData.email || '—'}
                                    </Typography>
                                    {formData.role && (
                                        <Chip
                                            label={formData.role}
                                            size="small"
                                            sx={{
                                                height: '24px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                borderRadius: '999px',
                                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                                color: 'primary.main',
                                                border: '1px solid rgba(25, 118, 210, 0.12)',
                                                '& .MuiChip-label': {
                                                    px: 1.5,
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                {isEditing ? (
                                    <>
                                        <Button
                                            size="small"
                                            onClick={handleCancel}
                                            disabled={loading}
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
                                            variant="contained"
                                            size="small"
                                            startIcon={<Save size={16} />}
                                            onClick={handleSaveProfile}
                                            disabled={loading}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                fontSize: '13px',
                                                px: 2.5,
                                                py: 0.75,
                                                borderRadius: '8px',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                                                },
                                            }}
                                        >
                                            Lưu thay đổi
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="small"
                                            startIcon={<Key size={16} />}
                                            onClick={() => setOpenPasswordDialog(true)}
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
                                            Đổi mật khẩu
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Pencil size={16} />}
                                            onClick={handleEditToggle}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                fontSize: '13px',
                                                px: 2.5,
                                                py: 0.75,
                                                borderRadius: '8px',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                                                },
                                            }}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </Paper>

                    {/* Main Content Grid */}
                    <Box sx={{ 
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
                        gap: 3
                    }}>
                        {/* Left Column - Profile Summary Card */}
                        <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 4' } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: '14px',
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'rgba(0, 0, 0, 0.06)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                            >
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        mb: 2,
                                        color: 'text.primary'
                                    }}
                                >
                                    Thông tin tài khoản
                                </Typography>

                                <Stack spacing={2}>
                                    <Box>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                mb: 0.5,
                                                display: 'block',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}
                                        >
                                            Tên đăng nhập
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.primary',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {formData.username || '—'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                mb: 0.5,
                                                display: 'block',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}
                                        >
                                            Email
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.primary',
                                                fontSize: '14px',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {formData.email || '—'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Box>

                        {/* Right Column - Personal Information Form */}
                        <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 8' } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: '14px',
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'rgba(0, 0, 0, 0.06)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Typography 
                                        variant="subtitle2" 
                                        sx={{ 
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            mb: 3,
                                            color: 'text.primary'
                                        }}
                                    >
                                        Thông tin cá nhân
                                    </Typography>

                                    <Stack spacing={3}>
                                        {/* Họ và tên */}
                                        <Box>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    mb: 1,
                                                    display: 'block'
                                                }}
                                            >
                                                Họ và tên
                                            </Typography>
                                            {isEditing ? (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={formData.fullName || ''}
                                                    disabled
                                                    placeholder="Chưa cập nhật"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            height: '40px',
                                                            borderRadius: '8px',
                                                            bgcolor: '#f6f7f9',
                                                            fontSize: '14px',
                                                            '& fieldset': {
                                                                borderColor: 'rgba(0, 0, 0, 0.06)',
                                                            },
                                                        },
                                                    }}
                                                />
                                            ) : (
                                                <Box sx={{ 
                                                    pb: 1, 
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.primary',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {formData.fullName || '—'}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {isEditing && (
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        fontSize: '11px',
                                                        mt: 0.5,
                                                        display: 'block'
                                                    }}
                                                >
                                                    Chỉ Admin có thể thay đổi
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Số điện thoại */}
                                        <Box>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    mb: 1,
                                                    display: 'block'
                                                }}
                                            >
                                                Số điện thoại
                                            </Typography>
                                            {isEditing ? (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={formData.phone || ''}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, phone: e.target.value })
                                                    }
                                                    placeholder="Nhập số điện thoại"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
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
                                            ) : (
                                                <Box sx={{ 
                                                    pb: 1, 
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.primary',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {formData.phone || '—'}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Ngày sinh */}
                                        <Box>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    mb: 1,
                                                    display: 'block'
                                                }}
                                            >
                                                Ngày sinh
                                            </Typography>
                                            {isEditing ? (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="date"
                                                    value={formData.dob || ''}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, dob: e.target.value })
                                                    }
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
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
                                            ) : (
                                                <Box sx={{ 
                                                    pb: 1, 
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.primary',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {formatDate(formData.dob)}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Giới tính */}
                                        <Box>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    mb: 1,
                                                    display: 'block'
                                                }}
                                            >
                                                Giới tính
                                            </Typography>
                                            {isEditing ? (
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    value={formData.gender || ''}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, gender: e.target.value })
                                                    }
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
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
                                                >
                                                    <MenuItem value="male">Nam</MenuItem>
                                                    <MenuItem value="female">Nữ</MenuItem>
                                                    <MenuItem value="other">Khác</MenuItem>
                                                </TextField>
                                            ) : (
                                                <Box sx={{ 
                                                    pb: 1, 
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.primary',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {getGenderDisplay(formData.gender)}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Stack>
                                </Box>
                            </Paper>
                        </Box>
                    </Box>

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
