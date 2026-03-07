import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Divider,
    Button,
    Tab,
    Tabs,
    IconButton,
} from '@mui/material';
import { Bell, FileText, User, Package, Truck, ShoppingCart, ClipboardCheck, CheckCheck, ChevronLeft } from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../permissions/roleUtils';

// ── Design tokens (matching ViewPurchaseOrderList) ─────────────────────────
const CARD_SX = {
    bgcolor: '#ffffff',
    border: '1px solid rgba(17,24,39,0.08)',
    borderRadius: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const TYPE_COLOR = {
    info:    { bg: 'rgba(59,130,246,0.10)',  icon: '#3b82f6'  },
    warning: { bg: 'rgba(251,191,36,0.18)',  icon: '#d97706'  },
    success: { bg: 'rgba(16,185,129,0.14)',  icon: '#10b981'  },
    error:   { bg: 'rgba(239,68,68,0.12)',   icon: '#ef4444'  },
    default: { bg: 'rgba(17,24,39,0.07)',    icon: '#6b7280'  },
};

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS_BY_ROLE = {
    ADMIN: [
        { id: '1', title: 'Tài khoản mới được tạo', message: 'Người dùng Nguyễn Văn A đã được thêm vào hệ thống.', time: '10 phút trước', icon: User,          isNew: true,  type: 'info'    },
        { id: '2', title: 'Yêu cầu đặt lại mật khẩu', message: 'Có 1 yêu cầu đặt lại mật khẩu từ phòng Kế toán.', time: '1 giờ trước',  icon: FileText,      isNew: false, type: 'warning' },
        { id: '3', title: 'Audit log', message: 'Hoạt động đăng nhập bất thường được ghi nhận.',               time: 'Hôm qua',       icon: ClipboardCheck, isNew: false, type: 'error'   },
    ],
    DIRECTOR: [
        { id: '1', title: 'Báo cáo tháng đã sẵn sàng', message: 'Báo cáo tổng hợp tháng 02/2025 có thể xem tại mục Báo cáo.', time: '30 phút trước', icon: FileText, isNew: true,  type: 'success' },
        { id: '2', title: 'Tổng quan kho', message: 'Tồn kho hiện tại trong ngưỡng an toàn. Không có cảnh báo.',               time: '2 giờ trước',   icon: Package,  isNew: false, type: 'info'    },
    ],
    WAREHOUSE_KEEPER: [
        { id: '1', title: 'Phiếu nhập cần xử lý', message: 'Phiếu nhập hàng #GRN-2025-012 đang chờ xác nhận.', time: '15 phút trước', icon: Package,        isNew: true,  type: 'warning' },
        { id: '2', title: 'Cảnh báo tồn kho',    message: 'Vật tư "Cáp mạng Cat6" dưới mức tối thiểu. Cần nhập thêm.', time: '1 giờ trước', icon: ClipboardCheck, isNew: true,  type: 'error'   },
        { id: '3', title: 'Phiếu xuất đã duyệt', message: 'Phiếu xuất #GDN-2025-008 đã được duyệt, có thể thực hiện xuất kho.', time: 'Hôm qua', icon: FileText, isNew: false, type: 'success' },
    ],
    SALE_SUPPORT: [
        { id: '1', title: 'Đơn mua (PO) mới', message: 'Đơn mua #PO-2025-024 đã được tạo và chờ xử lý.',         time: '20 phút trước', icon: ShoppingCart, isNew: true,  type: 'info'    },
        { id: '2', title: 'Nhà cung cấp cập nhật', message: 'Thông tin nhà cung cấp ABC Corp đã được cập nhật.', time: '3 giờ trước',   icon: Truck,        isNew: false, type: 'default' },
    ],
    SALE_ENGINEER: [
        { id: '1', title: 'Yêu cầu xuất hàng', message: 'Có yêu cầu xuất hàng mới từ bộ phận Kinh doanh.', time: '5 phút trước',  icon: Package, isNew: true,  type: 'warning' },
        { id: '2', title: 'Người nhận hàng',   message: 'Danh sách người nhận hàng đã được cập nhật.',     time: '1 giờ trước',   icon: User,    isNew: false, type: 'default' },
    ],
    ACCOUNTANTS: [
        { id: '1', title: 'Phiếu nhập cần đối soát', message: 'Phiếu nhập #GRN-2025-011 chờ kế toán đối soát.', time: '25 phút trước', icon: FileText,      isNew: true,  type: 'warning' },
        { id: '2', title: 'Báo cáo tài chính',       message: 'Báo cáo chi tiết nhập/xuất tuần đã sẵn sàng.',   time: '2 giờ trước',   icon: ClipboardCheck, isNew: false, type: 'success' },
    ],
};

const defaultMockList = [
    { id: '1', title: 'Thông báo hệ thống', message: 'Chào mừng bạn đã đăng nhập. Đây là trang thông báo mẫu.', time: 'Vừa xong', icon: Bell, isNew: true, type: 'info' },
];

// ── Component ──────────────────────────────────────────────────────────────
const ViewNotifications = () => {
    const navigate     = useNavigate();
    const userInfo     = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole  = getPermissionRole(roleFromBackend);
    const roleLabel       = getPermissionRoleLabel(permissionRole);

    const allList = MOCK_NOTIFICATIONS_BY_ROLE[permissionRole] || defaultMockList;
    const [readIds, setReadIds] = useState([]);
    const [tab, setTab]         = useState(0); // 0 = Tất cả, 1 = Chưa đọc

    const isRead  = (item) => readIds.includes(item.id);
    const isNew   = (item) => item.isNew && !isRead(item);
    const newCount = allList.filter((i) => isNew(i)).length;

    const displayed = tab === 1 ? allList.filter((i) => isNew(i)) : allList;

    const markAllRead = () => setReadIds(allList.map((i) => i.id));

    return (
        <Box sx={{ width: '100%', px: 0, pt: 3 }}>
            {/* ── Back button ── */}
            <Box sx={{ mb: 2 }}>
                <Button
                    startIcon={<ChevronLeft size={16} />}
                    onClick={() => navigate(-1)}
                    sx={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(17,24,39,0.50)',
                        textTransform: 'none',
                        borderRadius: '8px',
                        px: 1.25,
                        py: 0.6,
                        minWidth: 0,
                        '&:hover': { bgcolor: 'rgba(17,24,39,0.05)', color: 'rgba(17,24,39,0.80)' },
                    }}
                >
                    Quay lại
                </Button>
            </Box>

            {/* ── Page header ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 1,
                }}
            >
                <Box>
                    <Typography
                        sx={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: 'rgba(17,24,39,0.90)',
                            lineHeight: 1.3,
                        }}
                    >
                        Thông báo
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'rgba(17,24,39,0.45)', mt: 0.25 }}>
                        {roleLabel} · {allList.length} thông báo
                        {newCount > 0 && ` · ${newCount} chưa đọc`}
                    </Typography>
                </Box>

                {newCount > 0 && (
                    <Button
                        size="small"
                        startIcon={<CheckCheck size={15} />}
                        onClick={markAllRead}
                        sx={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#0284c7',
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 1.5,
                            py: 0.75,
                            border: '1px solid rgba(2,132,199,0.30)',
                            bgcolor: '#ffffff',
                            '&:hover': { bgcolor: 'rgba(2,132,199,0.06)', borderColor: '#0284c7' },
                        }}
                    >
                        Đánh dấu tất cả đã đọc
                    </Button>
                )}
            </Box>

            {/* ── Main card ── */}
            <Paper elevation={0} sx={CARD_SX}>
                {/* Tab bar */}
                <Box sx={{ px: 2, borderBottom: '1px solid rgba(17,24,39,0.07)' }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        sx={{
                            minHeight: 44,
                            '& .MuiTab-root': {
                                minHeight: 44,
                                fontSize: '13px',
                                fontWeight: 500,
                                textTransform: 'none',
                                color: 'rgba(17,24,39,0.50)',
                                px: 1.5,
                                py: 0,
                            },
                            '& .Mui-selected': { color: '#0284c7', fontWeight: 600 },
                            '& .MuiTabs-indicator': { bgcolor: '#0284c7', height: '2px', borderRadius: '2px 2px 0 0' },
                        }}
                    >
                        <Tab label="Tất cả" />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    Chưa đọc
                                    {newCount > 0 && (
                                        <Box
                                            sx={{
                                                minWidth: 18,
                                                height: 18,
                                                borderRadius: '999px',
                                                bgcolor: 'rgba(239,68,68,0.14)',
                                                color: '#ef4444',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 0.5,
                                            }}
                                        >
                                            {newCount}
                                        </Box>
                                    )}
                                </Box>
                            }
                        />
                    </Tabs>
                </Box>

                {/* Notification list */}
                {displayed.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Bell size={32} style={{ color: 'rgba(17,24,39,0.20)', marginBottom: 12 }} />
                        <Typography sx={{ fontSize: '14px', color: 'rgba(17,24,39,0.40)' }}>
                            Không có thông báo chưa đọc
                        </Typography>
                    </Box>
                ) : (
                    displayed.map((item, index) => {
                        const Icon  = item.icon || Bell;
                        const color = TYPE_COLOR[item.type] ?? TYPE_COLOR.default;
                        const read  = isRead(item);
                        const unread = isNew(item);

                        return (
                            <React.Fragment key={item.id}>
                                {index > 0 && (
                                    <Divider sx={{ borderColor: 'rgba(17,24,39,0.06)', mx: 2 }} />
                                )}
                                <Box
                                    onClick={() => setReadIds((prev) => [...new Set([...prev, item.id])])}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 2,
                                        px: 2.5,
                                        py: 2,
                                        cursor: 'pointer',
                                        bgcolor: unread ? 'rgba(2,132,199,0.04)' : 'transparent',
                                        transition: 'background 0.15s',
                                        '&:hover': { bgcolor: 'rgba(17,24,39,0.03)' },
                                        position: 'relative',
                                    }}
                                >
                                    {/* Unread indicator dot */}
                                    {unread && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 10,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                    bgcolor: '#0284c7',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}

                                    {/* Icon container */}
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            bgcolor: color.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            mt: 0.25,
                                        }}
                                    >
                                        <Icon size={17} style={{ color: color.icon }} />
                                    </Box>

                                    {/* Content */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: '13.5px',
                                                    fontWeight: unread ? 600 : 500,
                                                    color: unread ? 'rgba(17,24,39,0.90)' : 'rgba(17,24,39,0.70)',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {item.title}
                                            </Typography>
                                            {unread && (
                                                <Chip
                                                    label="Mới"
                                                    size="small"
                                                    sx={{
                                                        height: 18,
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(239,68,68,0.12)',
                                                        color: '#dc2626',
                                                        border: 'none',
                                                        '& .MuiChip-label': { px: 1 },
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: '13px',
                                                color: 'rgba(17,24,39,0.55)',
                                                lineHeight: 1.5,
                                                mb: 0.5,
                                            }}
                                        >
                                            {item.message}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: '12px',
                                                color: 'rgba(17,24,39,0.35)',
                                            }}
                                        >
                                            {item.time}
                                        </Typography>
                                    </Box>

                                    {/* Read status indicator */}
                                    {read && (
                                        <Typography
                                            sx={{
                                                fontSize: '11px',
                                                color: 'rgba(17,24,39,0.28)',
                                                flexShrink: 0,
                                                mt: 0.5,
                                            }}
                                        >
                                            Đã đọc
                                        </Typography>
                                    )}
                                </Box>
                            </React.Fragment>
                        );
                    })
                )}

                {/* Footer */}
                {displayed.length > 0 && (
                    <>
                        <Divider sx={{ borderColor: 'rgba(17,24,39,0.06)' }} />
                        <Box sx={{ py: 1.5, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '12px', color: 'rgba(17,24,39,0.30)' }}>
                                Đây là dữ liệu mockup · Kết nối API thật sẽ được bổ sung sau
                            </Typography>
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default ViewNotifications;
