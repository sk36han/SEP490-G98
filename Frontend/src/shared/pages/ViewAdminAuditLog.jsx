import React, { useState, useMemo } from 'react';
import {
    Container,
    Paper,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TablePagination,
} from '@mui/material';
import { ClipboardList } from 'lucide-react';

/**
 * Cấu trúc đúng theo bảng [dbo].[AuditLogs] trong DB.
 * Phần Detail: không lưu/hiển thị ID hệ thống, dùng username (hoặc mã/tên) thay thế.
 */
const MOCK_AUDIT_LOGS = [
    { auditLogId: 1, actorUserId: 101, action: 'CREATE', entityType: 'User', entityId: 205, detail: 'Tạo tài khoản: username=ketoan1, email=ketoan1@company.com', createdAt: '2025-02-23T08:15:00Z' },
    { auditLogId: 2, actorUserId: 102, action: 'UPDATE', entityType: 'Item', entityId: 12, detail: 'Cập nhật số lượng tồn, kho chính', createdAt: '2025-02-23T09:22:00Z' },
    { auditLogId: 3, actorUserId: 103, action: 'CREATE', entityType: 'Supplier', entityId: 8, detail: 'Thêm nhà cung cấp: Công ty TNHH ABC', createdAt: '2025-02-23T10:05:00Z' },
    { auditLogId: 4, actorUserId: 101, action: 'STATUS_CHANGE', entityType: 'User', entityId: 203, detail: 'Vô hiệu hóa tài khoản: username=truongnv', createdAt: '2025-02-23T10:30:00Z' },
    { auditLogId: 5, actorUserId: 102, action: 'CREATE', entityType: 'GRN', entityId: 4, detail: 'Tạo phiếu nhập kho GRN-2025-004', createdAt: '2025-02-23T11:00:00Z' },
    { auditLogId: 6, actorUserId: 104, action: 'UPDATE', entityType: 'PO', entityId: 2, detail: 'Duyệt đơn mua hàng PO-2025-002', createdAt: '2025-02-23T11:45:00Z' },
    { auditLogId: 7, actorUserId: 102, action: 'CREATE', entityType: 'GDN', entityId: 3, detail: 'Tạo phiếu xuất kho GDN-2025-003', createdAt: '2025-02-23T13:20:00Z' },
    { auditLogId: 8, actorUserId: 103, action: 'UPDATE', entityType: 'Supplier', entityId: 5, detail: 'Cập nhật SĐT và địa chỉ nhà cung cấp: Công ty XYZ', createdAt: '2025-02-23T14:10:00Z' },
    { auditLogId: 9, actorUserId: 101, action: 'CREATE', entityType: 'User', entityId: 206, detail: 'Tạo tài khoản: username=hoangse, fullName=Hoàng Sale Engineer', createdAt: '2025-02-22T16:00:00Z' },
    { auditLogId: 10, actorUserId: 102, action: 'UPDATE', entityType: 'Warehouse', entityId: 1, detail: 'Cập nhật địa chỉ kho chính', createdAt: '2025-02-22T15:30:00Z' },
];

/**
 * Mock bảng Users + Roles (DB đã có): dùng để hiển thị tên/role khi show audit.
 * Backend thật sẽ JOIN AuditLogs với Users và UserRoles/Roles, trả thêm ActorName, ActorRole.
 */
const MOCK_ACTORS_BY_USER_ID = {
    101: { fullName: 'Nguyễn Văn Admin', roleName: 'Admin' },
    102: { fullName: 'Trần Thủ Kho', roleName: 'Warehouse Keeper' },
    103: { fullName: 'Lê Sale Support', roleName: 'Sale Support' },
    104: { fullName: 'Phạm Kế Toán', roleName: 'Accountants' },
};
const getActorDisplay = (actorUserId) => MOCK_ACTORS_BY_USER_ID[actorUserId] || { fullName: `User #${actorUserId}`, roleName: '—' };

const ENTITY_TYPE_OPTIONS = [
    { value: '', label: 'Tất cả loại' },
    { value: 'User', label: 'User' },
    { value: 'Supplier', label: 'Supplier' },
    { value: 'Item', label: 'Item' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'GRN', label: 'Phiếu nhập (GRN)' },
    { value: 'GDN', label: 'Phiếu xuất (GDN)' },
    { value: 'PO', label: 'Đơn mua hàng (PO)' },
];

const ACTION_OPTIONS = [
    { value: '', label: 'Tất cả hành động' },
    { value: 'CREATE', label: 'Tạo mới' },
    { value: 'UPDATE', label: 'Cập nhật' },
    { value: 'STATUS_CHANGE', label: 'Đổi trạng thái' },
];

const actionColor = (action) => {
    if (action === 'CREATE') return 'success';
    if (action === 'UPDATE') return 'info';
    if (action === 'STATUS_CHANGE') return 'warning';
    return 'default';
};

const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const AdminAuditLog = () => {
    const [filterEntityType, setFilterEntityType] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const filteredRows = useMemo(() => {
        let list = [...MOCK_AUDIT_LOGS];
        if (filterEntityType) list = list.filter((r) => r.entityType === filterEntityType);
        if (filterAction) list = list.filter((r) => r.action === filterAction);
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [filterEntityType, filterAction]);

    const pagedRows = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, page, rowsPerPage]);

    const totalCount = filteredRows.length;

    return (
        <Container
            maxWidth={false}
            sx={{
                pt: 3,
                pb: 2,
                mt: -3,
                width: '100%',
                maxWidth: 2304,
                minHeight: 560,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ mb: 0.75, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    fontWeight="800"
                    sx={{
                        mt: 0,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Audit Log hệ thống
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Nhật ký thao tác tạo mới, cập nhật và đổi trạng thái — chỉ Admin xem toàn bộ.
                </Typography>
            </Box>

            <Paper
                elevation={3}
                sx={{
                    mt: 1.5,
                    p: 2,
                    borderRadius: 4,
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                }}
            >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClipboardList size={22} style={{ color: 'var(--mui-palette-primary-main)' }} />
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">Bộ lọc</Typography>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Loại đối tượng</InputLabel>
                        <Select
                            value={filterEntityType}
                            onChange={(e) => { setFilterEntityType(e.target.value); setPage(0); }}
                            label="Loại đối tượng"
                        >
                            {ENTITY_TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Hành động</InputLabel>
                        <Select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                            label="Hành động"
                        >
                            {ACTION_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer sx={{ flex: 1, minHeight: 320, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'auto' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', width: 56 }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', minWidth: 140 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', minWidth: 160 }}>Người thực hiện</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', width: 120 }}>Hành động</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', width: 120 }}>Loại đối tượng</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', width: 90 }}>Entity ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Chi tiết</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pagedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                        Không có bản ghi nào phù hợp.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedRows.map((row, index) => {
                                    const actor = getActorDisplay(row.actorUserId);
                                    return (
                                    <TableRow key={row.auditLogId} hover sx={{ '&:last-child td': { border: 0 } }}>
                                        <TableCell>{(page * rowsPerPage) + index + 1}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.createdAt)}</TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{actor.fullName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{actor.roleName}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={row.action} size="small" color={actionColor(row.action)} variant="filled" sx={{ fontWeight: 600 }} />
                                        </TableCell>
                                        <TableCell>{row.entityType}</TableCell>
                                        <TableCell>{row.entityId ?? '—'}</TableCell>
                                        <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.detail}>
                                            {row.detail ?? '—'}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Số dòng / trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                    sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}
                />
            </Paper>
        </Container>
    );
};

export default AdminAuditLog;
