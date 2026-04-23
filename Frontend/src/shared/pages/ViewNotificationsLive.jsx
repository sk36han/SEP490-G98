import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Divider, Button, Tab, Tabs } from '@mui/material';
import { Bell, FileText, Package, Truck, ShoppingCart, ClipboardCheck, CheckCheck, ChevronLeft } from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../permissions/roleUtils';
import { useNotifications } from '../../app/context/NotificationContext';

const CARD_SX = {
    bgcolor: '#ffffff',
    border: '1px solid rgba(17,24,39,0.08)',
    borderRadius: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const TYPE_COLOR = {
    info: { bg: 'rgba(59,130,246,0.10)', icon: '#3b82f6' },
    warning: { bg: 'rgba(251,191,36,0.18)', icon: '#d97706' },
    success: { bg: 'rgba(16,185,129,0.14)', icon: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.12)', icon: '#ef4444' },
    default: { bg: 'rgba(17,24,39,0.07)', icon: '#6b7280' },
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

const ViewNotificationsLive = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const roleLabel = getPermissionRoleLabel(permissionRole);

    const {
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    useEffect(() => {
        refreshNotifications({ pageNumber: 1, pageSize: 100 });
    }, [refreshNotifications]);

    const displayed = useMemo(
        () => (tab === 1 ? notifications.filter((item) => !item.isRead) : notifications),
        [notifications, tab]
    );

    return (
        <Box sx={{ width: '100%', px: 0, pt: 3 }}>
            <Box sx={{ mb: 2 }}>
                <Button startIcon={<ChevronLeft size={16} />} onClick={() => navigate(-1)} sx={{ fontSize: '13px', fontWeight: 500, color: 'rgba(17,24,39,0.50)', textTransform: 'none', borderRadius: '8px', px: 1.25, py: 0.6, minWidth: 0, '&:hover': { bgcolor: 'rgba(17,24,39,0.05)', color: 'rgba(17,24,39,0.80)' } }}>
                    Quay lại
                </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'rgba(17,24,39,0.90)', lineHeight: 1.3 }}>Thông báo</Typography>
                    <Typography sx={{ fontSize: '13px', color: 'rgba(17,24,39,0.45)', mt: 0.25 }}>
                        {roleLabel} · {notifications.length} thông báo
                        {unreadCount > 0 && ` · ${unreadCount} chưa đọc`}
                    </Typography>
                </Box>
                {unreadCount > 0 && (
                    <Button size="small" startIcon={<CheckCheck size={15} />} onClick={markAllAsRead} sx={{ fontSize: '13px', fontWeight: 500, color: '#0284c7', textTransform: 'none', borderRadius: '8px', px: 1.5, py: 0.75, border: '1px solid rgba(2,132,199,0.30)', bgcolor: '#ffffff', '&:hover': { bgcolor: 'rgba(2,132,199,0.06)', borderColor: '#0284c7' } }}>
                        Đánh dấu tất cả đã đọc
                    </Button>
                )}
            </Box>

            <Paper elevation={0} sx={CARD_SX}>
                <Box sx={{ px: 2, borderBottom: '1px solid rgba(17,24,39,0.07)' }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, fontSize: '13px', fontWeight: 500, textTransform: 'none', color: 'rgba(17,24,39,0.50)', px: 1.5, py: 0 }, '& .Mui-selected': { color: '#0284c7', fontWeight: 600 }, '& .MuiTabs-indicator': { bgcolor: '#0284c7', height: '2px', borderRadius: '2px 2px 0 0' } }}>
                        <Tab label="Tất cả" />
                        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>Chưa đọc{unreadCount > 0 && <Box sx={{ minWidth: 18, height: 18, borderRadius: '999px', bgcolor: 'rgba(239,68,68,0.14)', color: '#ef4444', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.5 }}>{unreadCount}</Box>}</Box>} />
                    </Tabs>
                </Box>
                {loading ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}><Typography sx={{ fontSize: '14px', color: 'rgba(17,24,39,0.45)' }}>Đang tải thông báo...</Typography></Box>
                ) : error ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}><Typography sx={{ fontSize: '14px', color: '#dc2626' }}>{error}</Typography></Box>
                ) : displayed.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}><Bell size={32} style={{ color: 'rgba(17,24,39,0.20)', marginBottom: 12 }} /><Typography sx={{ fontSize: '14px', color: 'rgba(17,24,39,0.40)' }}>{tab === 1 ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}</Typography></Box>
                ) : (
                    displayed.map((item, index) => {
                        const Icon = getNotificationIcon(item);
                        const color = TYPE_COLOR[String(item.type || '').toLowerCase()] ?? TYPE_COLOR.default;
                        const unread = !item.isRead;
                        return (
                            <React.Fragment key={item.notificationId}>
                                {index > 0 && <Divider sx={{ borderColor: 'rgba(17,24,39,0.06)', mx: 2 }} />}
                                <Box onClick={() => markAsRead(item.notificationId)} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, px: 2.5, py: 2, cursor: 'pointer', bgcolor: unread ? 'rgba(2,132,199,0.04)' : 'transparent', transition: 'background 0.15s', '&:hover': { bgcolor: 'rgba(17,24,39,0.03)' }, position: 'relative' }}>
                                    {unread && <Box sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', bgcolor: '#0284c7', flexShrink: 0 }} />}
                                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}><Icon size={17} style={{ color: color.icon }} /></Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                                            <Typography sx={{ fontSize: '13.5px', fontWeight: unread ? 600 : 500, color: unread ? 'rgba(17,24,39,0.90)' : 'rgba(17,24,39,0.70)', lineHeight: 1.4 }}>{item.title || 'Thông báo'}</Typography>
                                            {unread && <Chip label="Mới" size="small" sx={{ height: 18, fontSize: '11px', fontWeight: 600, borderRadius: '999px', bgcolor: 'rgba(239,68,68,0.12)', color: '#dc2626', border: 'none', '& .MuiChip-label': { px: 1 } }} />}
                                        </Box>
                                        <Typography sx={{ fontSize: '13px', color: 'rgba(17,24,39,0.55)', lineHeight: 1.5, mb: 0.5 }}>{item.message || 'Bạn có thông báo mới.'}</Typography>
                                        <Typography sx={{ fontSize: '12px', color: 'rgba(17,24,39,0.35)' }}>{formatNotificationTime(item.createdAt)}</Typography>
                                    </Box>
                                    {!unread && <Typography sx={{ fontSize: '11px', color: 'rgba(17,24,39,0.28)', flexShrink: 0, mt: 0.5 }}>Đã đọc</Typography>}
                                </Box>
                            </React.Fragment>
                        );
                    })
                )}
            </Paper>
        </Box>
    );
};

export default ViewNotificationsLive;
