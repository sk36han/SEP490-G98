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

// ── Design tokens ──────────────────────────────────────────────────────────
const TYPE_COLOR = {
    info:    { bg: 'rgba(59,130,246,0.10)',  icon: '#3b82f6'  },
    warning: { bg: 'rgba(251,191,36,0.18)',  icon: '#d97706'  },
    success: { bg: 'rgba(16,185,129,0.14)',  icon: '#10b981'  },
    error:   { bg: 'rgba(239,68,68,0.12)',   icon: '#ef4444'  },
    default: { bg: 'rgba(17,24,39,0.07)',    icon: '#6b7280'  },
};

// ── Mock notifications ─────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS_BY_ROLE = {
    ADMIN: [
        { id: '1', title: 'Tài khoản mới được tạo',    message: 'Nguyễn Văn A đã được thêm vào hệ thống.', time: '10 phút trước', icon: User,          isNew: true,  type: 'info'    },
        { id: '2', title: 'Yêu cầu đặt lại mật khẩu', message: 'Có 1 yêu cầu từ phòng Kế toán.',          time: '1 giờ trước',   icon: FileText,      isNew: false, type: 'warning' },
        { id: '3', title: 'Audit log',                  message: 'Hoạt động đăng nhập bất thường.',         time: 'Hôm qua',       icon: ClipboardCheck, isNew: false, type: 'error'  },
    ],
    DIRECTOR: [
        { id: '1', title: 'Báo cáo tháng đã sẵn sàng', message: 'Báo cáo tổng hợp tháng 02/2025 sẵn sàng.', time: '30 phút trước', icon: FileText, isNew: true,  type: 'success' },
        { id: '2', title: 'Tổng quan kho',               message: 'Tồn kho trong ngưỡng an toàn.',             time: '2 giờ trước',   icon: Package,  isNew: false, type: 'info'    },
    ],
    WAREHOUSE_KEEPER: [
        { id: '1', title: 'Phiếu nhập cần xử lý', message: '#GRN-2025-012 đang chờ xác nhận.',                    time: '15 phút trước', icon: Package,        isNew: true,  type: 'warning' },
        { id: '2', title: 'Cảnh báo tồn kho',     message: '"Cáp mạng Cat6" dưới mức tối thiểu.',                 time: '1 giờ trước',   icon: ClipboardCheck, isNew: true,  type: 'error'   },
        { id: '3', title: 'Phiếu xuất đã duyệt',  message: '#GDN-2025-008 đã duyệt, có thể thực hiện xuất kho.', time: 'Hôm qua',       icon: FileText,       isNew: false, type: 'success' },
    ],
    SALE_SUPPORT: [
        { id: '1', title: 'Đơn mua (PO) mới',      message: '#PO-2025-024 đã được tạo và chờ xử lý.',   time: '20 phút trước', icon: ShoppingCart, isNew: true,  type: 'info'    },
        { id: '2', title: 'Nhà cung cấp cập nhật', message: 'Thông tin ABC Corp đã được cập nhật.',      time: '3 giờ trước',   icon: Truck,        isNew: false, type: 'default' },
    ],
    SALE_ENGINEER: [
        { id: '1', title: 'Yêu cầu xuất hàng', message: 'Có yêu cầu xuất hàng mới từ Kinh doanh.', time: '5 phút trước',  icon: Package, isNew: true,  type: 'warning' },
        { id: '2', title: 'Người nhận hàng',   message: 'Danh sách người nhận đã được cập nhật.',   time: '1 giờ trước',   icon: User,    isNew: false, type: 'default' },
    ],
    ACCOUNTANTS: [
        { id: '1', title: 'Phiếu nhập cần đối soát', message: '#GRN-2025-011 chờ kế toán đối soát.', time: '25 phút trước', icon: FileText,       isNew: true,  type: 'warning' },
        { id: '2', title: 'Báo cáo tài chính',        message: 'Báo cáo nhập/xuất tuần đã sẵn sàng.', time: '2 giờ trước',   icon: ClipboardCheck, isNew: false, type: 'success' },
    ],
};
const defaultList = [
    { id: '1', title: 'Thông báo hệ thống', message: 'Chào mừng bạn đã đăng nhập.', time: 'Vừa xong', icon: Bell, isNew: true, type: 'info' },
];

// ── AppHeader ──────────────────────────────────────────────────────────────
const AppHeader = () => {
    const navigate = useNavigate();

    // Profile dropdown
    const [profileAnchor, setProfileAnchor] = useState(null);
    const profileOpen = Boolean(profileAnchor);

    // Notification popover
    const [notifAnchor, setNotifAnchor] = useState(null);
    const notifOpen = Boolean(notifAnchor);

    // Read state
    const [readIds, setReadIds] = useState([]);

    const userInfo        = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole  = getPermissionRole(roleFromBackend);
    const roleLabel       = getPermissionRoleLabel(permissionRole);
    const displayName     = String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100);
    const avatarSrc       = userInfo?.avatar;

    const allNotifs = MOCK_NOTIFICATIONS_BY_ROLE[permissionRole] || defaultList;
    const isUnread  = (n) => n.isNew && !readIds.includes(n.id);
    const unreadCount = allNotifs.filter(isUnread).length;
    const markAllRead = () => setReadIds(allNotifs.map((n) => n.id));
    const markRead    = (id) => setReadIds((prev) => [...new Set([...prev, id])]);

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
                                onClick={markAllRead}
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
                                const Icon   = item.icon || Bell;
                                const color  = TYPE_COLOR[item.type] ?? TYPE_COLOR.default;
                                const unread = isUnread(item);

                                return (
                                    <React.Fragment key={item.id}>
                                        {index > 0 && (
                                            <Divider sx={{ borderColor: 'rgba(17,24,39,0.06)', mx: 2 }} />
                                        )}
                                        <Box
                                            onClick={() => markRead(item.id)}
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
                                                    {item.time}
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
