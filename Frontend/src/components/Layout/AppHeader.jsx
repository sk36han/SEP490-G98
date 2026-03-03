import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { Bell, ChevronDown, User } from 'lucide-react';
import authService from '../../shared/lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const AppHeader = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const displayName = String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100);
    const roleLabel = getPermissionRoleLabel(permissionRole);
    const avatarSrc = userInfo?.avatar;

    const handleAvatarClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleProfile = () => {
        handleMenuClose();
        navigate('/profile');
    };

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

            {/* Bên phải: Thông báo + Người dùng (vùng avatar full chiều cao header) */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 0,
                    alignSelf: 'stretch',
                    minHeight: 56,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                </Box>

                <Box
                    onClick={handleAvatarClick}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        pl: 1.5,
                        pr: 0.75,
                        borderLeft: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        borderRadius: 0,
                        minHeight: '100%',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.04)',
                        },
                    }}
                    aria-controls={openMenu ? 'avatar-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu ? 'true' : undefined}
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
                        style={{
                            color: 'var(--mui-palette-text-secondary)',
                            flexShrink: 0,
                            transition: 'transform 0.2s',
                            transform: openMenu ? 'rotate(180deg)' : 'none',
                        }}
                        aria-hidden
                    />
                </Box>
                <Menu
                    id="avatar-menu"
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleMenuClose}
                    MenuListProps={{
                        'aria-labelledby': 'avatar-menu-button',
                    }}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1.5,
                                minWidth: 200,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                borderRadius: 2,
                            },
                        },
                    }}
                >
                    <MenuItem onClick={handleProfile}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            <User size={20} />
                        </ListItemIcon>
                        <ListItemText primary="Hồ sơ cá nhân" />
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default AppHeader;
