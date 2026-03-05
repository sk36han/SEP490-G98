import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { Bell, ChevronDown } from 'lucide-react';
import authService from '../../shared/lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const AppHeader = () => {
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const displayName = String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100);
    const roleLabel = getPermissionRoleLabel(permissionRole);
    const avatarSrc = userInfo?.avatar;

    return (
        <Box
            component="header"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                minHeight: 56,
                py: 1,
                px: 0,
                mb: 2,
                flexShrink: 0,
                bgcolor: '#fff',
                borderBottom: '1px solid',
                borderColor: 'rgba(0,0,0,0.08)',
                pb: 2,
            }}
        >
            {/* Bên trái: để trống (hoặc sau này thêm ô tìm kiếm) */}
            <Box sx={{ flex: 1, minWidth: 0 }} />

            {/* Bên phải: Thông báo + Người dùng */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                }}
            >
                <Tooltip title="Thông báo" arrow>
                    <IconButton
                        onClick={() => navigate('/notifications')}
                        size="medium"
                        sx={{
                            color: 'grey.600',
                            '&:hover': { color: 'primary.main', bgcolor: 'rgba(0,0,0,0.04)' },
                        }}
                        aria-label="Thông báo"
                    >
                        <Bell size={22} />
                    </IconButton>
                </Tooltip>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        pl: 1.5,
                        borderLeft: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)',
                    }}
                >
                    <Avatar
                        src={avatarSrc}
                        alt={displayName}
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}
                    >
                        {(displayName || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}
                        >
                            {displayName}
                        </Typography>
                        <Typography
                            variant="caption"
                            noWrap
                            sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3 }}
                        >
                            {roleLabel}
                        </Typography>
                    </Box>
                    <ChevronDown
                        size={18}
                        style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }}
                        aria-hidden
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default AppHeader;
