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
import Popover from '@mui/material/Popover';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { Bell, ChevronDown, User, LogOut, FileText, Package, Truck, ShoppingCart, ClipboardCheck, CheckCheck, ArrowRight } from 'lucide-react';
import authService from '../../shared/lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';
import { useNotifications } from '../../app/context/NotificationContext';

// ── Design tokens ──────────────────────────────────────────────────────────
const TYPE_COLOR = {
    info:    { bg: 'rgba(59,130,246,0.10)',  icon: '#3b82f6'  },
    warning: { bg: 'rgba(251,191,36,0.18)',  icon: '#d97706'  },
    success: { bg: 'rgba(16,185,129,0.14)',  icon: '#10b981'  },
    error:   { bg: 'rgba(239,68,68,0.12)',   icon: '#ef4444'  },
    default: { bg: 'rgba(17,24,39,0.07)',    icon: '#6b7280'  },
};

const TYPE_ICON = {
    info: FileText,
    warning: ClipboardCheck,
    success: CheckCheck,
    error: Bell,
    default: Bell,
};

const getNotificationIcon = (notification) => {
    const type = String(notification?.type || '').toLowerCase();
    const refType = String(notification?.refType || '').toLowerCase();
    if (refType.includes('purchase') || refType.includes('po')) return ShoppingCart;
    if (refType.includes('grn') || refType.includes('receipt')) return Package;
    if (refType.includes('shipment') || refType.includes('delivery')) return Truck;
    return TYPE_ICON[type] || Bell;
};

const formatNotificationTime = (value) => {
    if (!value) return 'Vừa xong';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';
    return date.toLocaleString('vi-VN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

// ── AppHeader ──────────────────────────────────────────────────────────────
const AppHeader = () => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    // Profile dropdown
    const [profileAnchor, setProfileAnchor] = useState(null);
    const profileOpen = Boolean(profileAnchor);

    // Notification popover
    const [notifAnchor, setNotifAnchor] = useState(null);
    const notifOpen = Boolean(notifAnchor);

    const userInfo        = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole  = getPermissionRole(roleFromBackend);
    const roleLabel       = getPermissionRoleLabel(permissionRole);
    const displayName     = String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100);
    const avatarSrc       = userInfo?.avatar;

    const allNotifs = notifications;
    const isUnread  = (n) => !n.isRead;

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
            <Box sx={{ flex: 1, minWidth: 0 }} />

            {/* Right side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>

                {/* ── Bell ── */}
                <Tooltip title="Thông báo" arrow>
                    <IconButton
                        onClick={(e) => setNotifAnchor(e.currentTarget)}
                        size="small"
                        sx={{
                            position: 'relative',
                            color: 'rgba(17,24,39,0.55)',
                            '&:hover': { bgcolor: 'rgba(17,24,39,0.05)' },
                        }}
                        aria-label="Thông báo"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: '#ef4444',
                                    border: '1.5px solid #fff',
                                }}
                            />
                        )}
                    </IconButton>
                </Tooltip>

                {/* ── Notification Popover ── */}
                <Popover
                    open={notifOpen}
                    anchorEl={notifAnchor}
                    onClose={() => setNotifAnchor(null)}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    slotProps={{
                        paper: {
                            elevation: 0,
                            sx: {
                                mt: 1,
                                width: 360,
                                borderRadius: '14px',
                                border: '1px solid rgba(17,24,39,0.08)',
                                boxShadow: '0 8px 24px rgba(17,24,39,0.10)',
                                overflow: 'hidden',
                            },
                        },
                    }}
                >
                    {/* Popover header */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 1.5,
                            borderBottom: '1px solid rgba(17,24,39,0.07)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(17,24,39,0.88)' }}>
                                Thông báo
                            </Typography>
                            {unreadCount > 0 && (
                                <Box
                                    sx={{
                                        minWidth: 20,
                                        height: 20,
                                        borderRadius: '999px',
                                        bgcolor: 'rgba(239,68,68,0.12)',
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        px: 0.75,
                                    }}
                                >
                                    {unreadCount}
                                </Box>
                            )}
                        </Box>
                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                startIcon={<CheckCheck size={13} />}
                                onClick={markAllAsRead}
                                sx={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: '#0284c7',
                                    textTransform: 'none',
                                    borderRadius: '6px',
                                    px: 1,
                                    py: 0.4,
                                    minWidth: 0,
                                    '&:hover': { bgcolor: 'rgba(2,132,199,0.08)', color: '#0369a1' },
                                }}
                            >
                                Đọc tất cả
                            </Button>
                        )}
                    </Box>

                    {/* Notification items */}
                    <Box sx={{ maxHeight: 380, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(17,24,39,0.12)', borderRadius: 2 } }}>
                        {allNotifs.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <Bell size={28} style={{ color: 'rgba(17,24,39,0.18)', marginBottom: 10 }} />
                                <Typography sx={{ fontSize: '13px', color: 'rgba(17,24,39,0.38)' }}>
                                    Không có thông báo
                                </Typography>
                            </Box>
                        ) : (
                            allNotifs.map((item, index) => {
                                const Icon   = getNotificationIcon(item);
                                const color  = TYPE_COLOR[String(item.type || '').toLowerCase()] ?? TYPE_COLOR.default;
                                const unread = isUnread(item);

                                return (
                                    <React.Fragment key={item.notificationId}>
                                        {index > 0 && (
                                            <Divider sx={{ borderColor: 'rgba(17,24,39,0.06)', mx: 2 }} />
                                        )}
                                        <Box
                                            onClick={() => markAsRead(item.notificationId)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1.5,
                                                px: 2,
                                                py: 1.5,
                                                cursor: 'pointer',
                                                bgcolor: unread ? 'rgba(2,132,199,0.04)' : 'transparent',
                                                position: 'relative',
                                                transition: 'background 0.12s',
                                                '&:hover': { bgcolor: 'rgba(17,24,39,0.035)' },
                                            }}
                                        >
                                            {/* Blue dot for unread */}
                                            {unread && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        left: 7,
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        width: 5,
                                                        height: 5,
                                                        borderRadius: '50%',
                                                        bgcolor: '#0284c7',
                                                    }}
                                                />
                                            )}

                                            {/* Icon */}
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '9px',
                                                    bgcolor: color.bg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    mt: 0.2,
                                                }}
                                            >
                                                <Icon size={15} style={{ color: color.icon }} />
                                            </Box>

                                            {/* Text */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                                                    <Typography
                                                        noWrap
                                                        sx={{
                                                            fontSize: '13px',
                                                            fontWeight: unread ? 600 : 500,
                                                            color: unread ? 'rgba(17,24,39,0.88)' : 'rgba(17,24,39,0.65)',
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {item.title}
                                                    </Typography>
                                                    {unread && (
                                                        <Chip
                                                            label="Mới"
                                                            size="small"
                                                            sx={{
                                                                height: 16,
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                borderRadius: '999px',
                                                                bgcolor: 'rgba(239,68,68,0.12)',
                                                                color: '#dc2626',
                                                                border: 'none',
                                                                flexShrink: 0,
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: '12px',
                                                        color: 'rgba(17,24,39,0.50)',
                                                        lineHeight: 1.5,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {item.message}
                                                </Typography>
                                                <Typography sx={{ fontSize: '11px', color: 'rgba(17,24,39,0.30)', mt: 0.4 }}>
                                                    {formatNotificationTime(item.createdAt)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </Box>

                    {/* Footer: View all */}
                    <Divider sx={{ borderColor: 'rgba(17,24,39,0.07)' }} />
                    <Box
                        onClick={() => { setNotifAnchor(null); navigate('/notifications'); }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            py: 1.25,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(2,132,199,0.05)' },
                            transition: 'background 0.12s',
                        }}
                    >
                        <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#0284c7' }}>
                            Xem tất cả thông báo
                        </Typography>
                        <ArrowRight size={14} style={{ color: '#0284c7' }} />
                    </Box>
                </Popover>

                {/* ── Profile button ── */}
                <Box
                    onClick={(e) => setProfileAnchor(e.currentTarget)}
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
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
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
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3, fontSize: '0.875rem' }}>
                            {displayName}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3, fontSize: '0.75rem' }}>
                            {roleLabel}
                        </Typography>
                    </Box>
                    <ChevronDown size={16} style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }} aria-hidden />
                </Box>

                {/* ── Profile dropdown menu ── */}
                <Menu
                    anchorEl={profileAnchor}
                    open={profileOpen}
                    onClose={() => setProfileAnchor(null)}
                    onClick={() => setProfileAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                        paper: {
                            elevation: 0,
                            sx: {
                                mt: 1,
                                minWidth: 200,
                                borderRadius: '12px',
                                border: '1px solid rgba(17,24,39,0.08)',
                                boxShadow: '0 8px 24px rgba(17,24,39,0.10)',
                                overflow: 'hidden',
                            },
                        },
                    }}
                >
                    <MenuItem
                        onClick={() => navigate('/profile')}
                        sx={{ py: 1.25, fontSize: '13px', color: 'rgba(17,24,39,0.80)', '&:hover': { bgcolor: 'rgba(17,24,39,0.04)' } }}
                    >
                        <ListItemIcon>
                            <User size={16} style={{ color: 'rgba(17,24,39,0.50)' }} />
                        </ListItemIcon>
                        Hồ sơ cá nhân
                    </MenuItem>
                    <Divider sx={{ borderColor: 'rgba(17,24,39,0.07)', my: 0.5 }} />
                    <MenuItem
                        onClick={() => {
                            if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
                                authService.logout();
                                navigate('/login');
                            }
                        }}
                        sx={{ py: 1.25, fontSize: '13px', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.05)' } }}
                    >
                        <ListItemIcon>
                            <LogOut size={16} color="#ef4444" />
                        </ListItemIcon>
                        Đăng xuất
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default AppHeader;
