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
import Divider from '@mui/material/Divider';
import { Bell, ChevronDown, User, LogOut } from 'lucide-react';
import authService from '../../shared/lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const AppHeader = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    
    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const displayName = String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100);
    const roleLabel = getPermissionRoleLabel(permissionRole);
    const avatarSrc = userInfo?.avatar;

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleProfile = () => {
        handleClose();
        navigate('/profile');
    };

    const handleLogout = () => {
        handleClose();
        if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
            authService.logout();
            navigate('/login');
        }
    };

    return (
        <Box
            component="header"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: 60,
                px: 0,
                mb: 0,
                flexShrink: 0,
                bgcolor: '#fff',
                borderBottom: '1px solid',
                borderColor: 'rgba(0,0,0,0.08)',
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
                    height: '100%',
                }}
            >
                <Tooltip title="Thông báo" arrow>
                    <IconButton
                        onClick={() => navigate('/notifications')}
                        size="small"
                        sx={{
                            color: 'grey.600',
                            '&:hover': { color: 'primary.main', bgcolor: 'rgba(0,0,0,0.04)' },
                        }}
                        aria-label="Thông báo"
                    >
                        <Bell size={20} />
                    </IconButton>
                </Tooltip>

                <Box
                    onClick={handleClick}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        pl: 1.5,
                        borderLeft: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        borderRadius: 2,
                        px: 1,
                        height: '100%',
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.04)',
                        }
                    }}
                >
                    <Avatar
                        src={avatarSrc}
                        alt={displayName}
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                        }}
                    >
                        {(displayName || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3, fontSize: '0.875rem' }}
                        >
                            {displayName}
                        </Typography>
                        <Typography
                            variant="caption"
                            noWrap
                            sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3, fontSize: '0.75rem' }}
                        >
                            {roleLabel}
                        </Typography>
                    </Box>
                    <ChevronDown
                        size={16}
                        style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }}
                        aria-hidden
                    />
                </Box>

                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    onClick={handleClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                        paper: {
                            elevation: 3,
                            sx: {
                                mt: 1,
                                minWidth: 200,
                                borderRadius: 2,
                                overflow: 'visible',
                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.08))',
                            }
                        }
                    }}
                >
                    <MenuItem onClick={handleProfile} sx={{ py: 1.25, fontSize: '0.875rem' }}>
                        <ListItemIcon>
                            <User size={18} />
                        </ListItemIcon>
                        Hồ sơ cá nhân
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ py: 1.25, fontSize: '0.875rem', color: 'error.main' }}>
                        <ListItemIcon>
                            <LogOut size={18} color="currentColor" />
                        </ListItemIcon>
                        Đăng xuất
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default AppHeader;
