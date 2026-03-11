import React, { useState, useEffect, useCallback } from 'react';
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
    CircularProgress,
    Alert,
} from '@mui/material';
import { ClipboardList } from 'lucide-react';
import auditLogService from '../lib/auditLogService';

const ENTITY_TYPE_OPTIONS = [
    { value: '', label: 'Tất cả loại' },
    { value: 'User', label: 'User' },
    { value: 'Supplier', label: 'Supplier' },
    { value: 'Item', label: 'Item' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'PurchaseOrder', label: 'Đơn mua hàng (PO)' },
    { value: 'Receiver', label: 'Receiver' },
    { value: 'Role', label: 'Role' },
];

const ACTION_OPTIONS = [
    { value: '', label: 'Tất cả hành động' },
    { value: 'CREATE', label: 'Tạo mới' },
    { value: 'UPDATE', label: 'Cập nhật' },
    { value: 'DELETE', label: 'Xóa' },
    { value: 'LOGIN', label: 'Đăng nhập' },
];

const actionColor = (action) => {
    if (action === 'CREATE') return 'success';
    if (action === 'UPDATE') return 'info';
    if (action === 'DELETE') return 'error';
    if (action === 'LOGIN') return 'primary';
    return 'default';
};

const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const ViewAdminAuditLog = () => {
    const [filterEntityType, setFilterEntityType] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [rows, setRows] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await auditLogService.getAuditLogs({
                entityType: filterEntityType || undefined,
                action: filterAction || undefined,
                pageNumber: page + 1,
                pageSize: rowsPerPage,
            });
            setRows(result.items ?? []);
            setTotalItems(result.totalItems ?? 0);
        } catch (err) {
            setError(err?.message ?? 'Không thể tải audit log.');
            setRows([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [filterEntityType, filterAction, page, rowsPerPage]);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    const handlePageChange = (_, newPage) => setPage(newPage);
    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setPage(0);
    };
    const handleFilterEntityType = (e) => {
        setFilterEntityType(e.target.value);
        setPage(0);
    };
    const handleFilterAction = (e) => {
        setFilterAction(e.target.value);
        setPage(0);
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                pt: 3,
                pb: 2,
                width: '100%',
                maxWidth: 1400,
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
                    Nhật ký thao tác từ API — chỉ Admin xem toàn bộ.
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
                        <Select value={filterEntityType} onChange={handleFilterEntityType} label="Loại đối tượng">
                            {ENTITY_TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Hành động</InputLabel>
                        <Select value={filterAction} onChange={handleFilterAction} label="Hành động">
                            {ACTION_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <TableContainer sx={{ flex: 1, minHeight: 320, minWidth: 0, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
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
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                            {error ? 'Lỗi tải dữ liệu.' : 'Không có bản ghi nào phù hợp.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row, index) => (
                                        <TableRow key={row.auditLogId ?? row.AuditLogId ?? index} hover sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell>{(page * rowsPerPage) + index + 1}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {formatDateTime(row.createdAt ?? row.CreatedAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {row.actorFullName ?? row.ActorFullName ?? `User #${row.actorUserId ?? row.ActorUserId}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.action ?? row.Action}
                                                    size="small"
                                                    color={actionColor(row.action ?? row.Action)}
                                                    variant="filled"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>{row.entityType ?? row.EntityType ?? '—'}</TableCell>
                                            <TableCell>{row.entityId ?? row.EntityId ?? '—'}</TableCell>
                                            <TableCell
                                                sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                title={row.detail ?? row.Detail}
                                            >
                                                {row.detail ?? row.Detail ?? '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalItems}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Số dòng / trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                    sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}
                />
            </Paper>
        </Container>
    );
};

export default ViewAdminAuditLog;
