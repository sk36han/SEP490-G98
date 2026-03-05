import React from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Divider,
} from '@mui/material';
import { Bell, FileText, User, Package, Truck, ShoppingCart, ClipboardCheck } from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../permissions/roleUtils';

/** Mock thông báo mẫu theo từng role */
const MOCK_NOTIFICATIONS_BY_ROLE = {
    ADMIN: [
        { id: '1', title: 'Tài khoản mới được tạo', message: 'Người dùng Nguyễn Văn A đã được thêm vào hệ thống.', time: '10 phút trước', icon: User, isNew: true },
        { id: '2', title: 'Yêu cầu đặt lại mật khẩu', message: 'Có 1 yêu cầu đặt lại mật khẩu từ phòng Kế toán.', time: '1 giờ trước', icon: FileText, isNew: false },
        { id: '3', title: 'Audit log', message: 'Hoạt động đăng nhập bất thường được ghi nhận.', time: 'Hôm qua', icon: ClipboardCheck, isNew: false },
    ],
    DIRECTOR: [
        { id: '1', title: 'Báo cáo tháng đã sẵn sàng', message: 'Báo cáo tổng hợp tháng 02/2025 có thể xem tại mục Báo cáo.', time: '30 phút trước', icon: FileText, isNew: true },
        { id: '2', title: 'Tổng quan kho', message: 'Tồn kho hiện tại trong ngưỡng an toàn. Không có cảnh báo.', time: '2 giờ trước', icon: Package, isNew: false },
    ],
    WAREHOUSE_KEEPER: [
        { id: '1', title: 'Phiếu nhập cần xử lý', message: 'Phiếu nhập hàng #GRN-2025-012 đang chờ xác nhận.', time: '15 phút trước', icon: Package, isNew: true },
        { id: '2', title: 'Cảnh báo tồn kho', message: 'Vật tư "Cáp mạng Cat6" dưới mức tối thiểu. Cần nhập thêm.', time: '1 giờ trước', icon: ClipboardCheck, isNew: true },
        { id: '3', title: 'Phiếu xuất đã duyệt', message: 'Phiếu xuất #GDN-2025-008 đã được duyệt, có thể thực hiện xuất kho.', time: 'Hôm qua', icon: FileText, isNew: false },
    ],
    SALE_SUPPORT: [
        { id: '1', title: 'Đơn mua (PO) mới', message: 'Đơn mua #PO-2025-024 đã được tạo và chờ xử lý.', time: '20 phút trước', icon: ShoppingCart, isNew: true },
        { id: '2', title: 'Nhà cung cấp cập nhật', message: 'Thông tin nhà cung cấp ABC Corp đã được cập nhật.', time: '3 giờ trước', icon: Truck, isNew: false },
    ],
    SALE_ENGINEER: [
        { id: '1', title: 'Yêu cầu xuất hàng', message: 'Có yêu cầu xuất hàng mới từ bộ phận Kinh doanh.', time: '5 phút trước', icon: Package, isNew: true },
        { id: '2', title: 'Người nhận hàng', message: 'Danh sách người nhận hàng đã được cập nhật.', time: '1 giờ trước', icon: User, isNew: false },
    ],
    ACCOUNTANTS: [
        { id: '1', title: 'Phiếu nhập cần đối soát', message: 'Phiếu nhập #GRN-2025-011 chờ kế toán đối soát.', time: '25 phút trước', icon: FileText, isNew: true },
        { id: '2', title: 'Báo cáo tài chính', message: 'Báo cáo chi tiết nhập/xuất tuần đã sẵn sàng.', time: '2 giờ trước', icon: ClipboardCheck, isNew: false },
    ],
};

const defaultMockList = [
    { id: '1', title: 'Thông báo hệ thống', message: 'Chào mừng bạn đã đăng nhập. Đây là trang thông báo mẫu.', time: 'Vừa xong', icon: Bell, isNew: true },
];

const ViewNotifications = () => {
    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const roleLabel = getPermissionRoleLabel(permissionRole);
    const list = MOCK_NOTIFICATIONS_BY_ROLE[permissionRole] || defaultMockList;

    return (
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Bell size={28} style={{ color: 'var(--mui-palette-primary-main)' }} />
                <Box>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                        Thông báo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Thông báo mẫu theo vai trò: {roleLabel}
                    </Typography>
                </Box>
            </Box>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                    {list.map((item, index) => {
                        const Icon = item.icon || Bell;
                        return (
                            <React.Fragment key={item.id}>
                                {index > 0 && <Divider component="li" />}
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        py: 2,
                                        px: 2.5,
                                        bgcolor: item.isNew ? 'rgba(0,0,0,0.03)' : 'transparent',
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                                        <Box
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(25, 118, 210, 0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon size={18} style={{ color: 'var(--mui-palette-primary-main)' }} />
                                        </Box>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {item.title}
                                                </Typography>
                                                {item.isNew && (
                                                    <Chip label="Mới" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                    {item.message}
                                                </Typography>
                                                <Typography component="span" variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                                                    {item.time}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                Đây là dữ liệu mockup. Kết nối API thật sẽ được bổ sung sau.
            </Typography>
        </Box>
    );
};

export default ViewNotifications;
