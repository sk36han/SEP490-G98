import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Edit, MapPin, Plus, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@ui/badges';
import SearchInput from '../components/SearchInput';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getWarehouses } from '../lib/warehouseService';
import {
    changeStorageLocationStatus,
    createStorageLocation,
    getStorageLocationLedger,
    getStorageLocationList,
    updateStorageLocation,
} from '../lib/storageLocationService';
import { useToastContext } from '../../app/context/ToastContext';
import '../styles/ListView.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const CAN_MANAGE_ROLES = ['ADMIN', 'DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS'];

const EMPTY_FORM = {
    warehouseId: '',
    locationCode: '',
    locationName: '',
    isActive: true,
};

const formatQty = (value) => {
    const qty = Number(value ?? 0);
    if (!Number.isFinite(qty)) return '0';
    if (Number.isInteger(qty)) return qty.toLocaleString('vi-VN');
    return qty.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
};

const formatItemsSummary = (summary) => {
    const text = String(summary ?? '').trim();
    if (!text) return '';
    return text
        .split(',')
        .map((segment) => {
            const part = segment.trim();
            const separatorIdx = part.indexOf(':');
            if (separatorIdx === -1) return part;
            const itemCode = part.slice(0, separatorIdx).trim();
            const qty = part.slice(separatorIdx + 1).trim();
            return `${itemCode} - SL: ${qty}`;
        })
        .join(', ');
};

const ViewStorageLocationList = () => {
    const { showToast } = useToastContext();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const canManage = CAN_MANAGE_ROLES.includes(permissionRole);

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [totalItems, setTotalItems] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [keyword, setKeyword] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [itemCodeFilter, setItemCodeFilter] = useState('');
    const [minQtyFilter, setMinQtyFilter] = useState('');
    const [maxQtyFilter, setMaxQtyFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [ledgerDialog, setLedgerDialog] = useState({ open: false, row: null });
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerRows, setLedgerRows] = useState([]);
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerPageSize] = useState(10);
    const [ledgerTotalItems, setLedgerTotalItems] = useState(0);

    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await getWarehouses({ pageNumber: 1, pageSize: 200 });
            setWarehouses(res?.items ?? []);
        } catch (error) {
            console.error('Load warehouses failed:', error);
        }
    }, []);

    const fetchStorageLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getStorageLocationList({
                page,
                pageSize,
                warehouseId: warehouseFilter || undefined,
                keyword: keyword.trim() || undefined,
                isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                hasStock: stockFilter === 'all' ? undefined : stockFilter === 'has-stock',
                itemCode: itemCodeFilter.trim() || undefined,
                minQty: minQtyFilter === '' ? undefined : Number(minQtyFilter),
                maxQty: maxQtyFilter === '' ? undefined : Number(maxQtyFilter),
            });
            setRows(res.items ?? []);
            setTotalItems(res.totalItems ?? 0);
        } catch (error) {
            console.error('Load storage locations failed:', error);
            showToast(error?.message || 'Không tải được danh sách vị trí kho', 'error');
            setRows([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [keyword, page, pageSize, showToast, statusFilter, warehouseFilter, stockFilter, itemCodeFilter, minQtyFilter, maxQtyFilter]);

    const fetchLocationLedger = useCallback(async (locationId, pageNumber = 1) => {
        setLedgerLoading(true);
        try {
            const res = await getStorageLocationLedger(locationId, {
                page: pageNumber,
                pageSize: ledgerPageSize,
            });
            setLedgerRows(res.items ?? []);
            setLedgerTotalItems(res.totalItems ?? 0);
            setLedgerPage(pageNumber);
        } catch (error) {
            console.error('Load location ledger failed:', error);
            showToast(error?.message || 'Không tải được lịch sử biến động vị trí', 'error');
            setLedgerRows([]);
            setLedgerTotalItems(0);
        } finally {
            setLedgerLoading(false);
        }
    }, [ledgerPageSize, showToast]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        fetchStorageLocations();
    }, [fetchStorageLocations]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((totalItems || 0) / pageSize)),
        [pageSize, totalItems],
    );

    const openCreateDialog = () => {
        setEditingRow(null);
        setFormData(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEditDialog = (row) => {
        setEditingRow(row);
        setFormData({
            warehouseId: String(row.warehouseId ?? ''),
            locationCode: row.locationCode ?? '',
            locationName: row.locationName ?? '',
            isActive: row.isActive ?? true,
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        setEditingRow(null);
        setFormData(EMPTY_FORM);
    };

    const openLedgerDialog = async (row) => {
        setLedgerDialog({ open: true, row });
        await fetchLocationLedger(row.locationId, 1);
    };

    const closeLedgerDialog = () => {
        setLedgerDialog({ open: false, row: null });
        setLedgerRows([]);
        setLedgerPage(1);
        setLedgerTotalItems(0);
    };

    const validateForm = () => {
        if (!formData.warehouseId) {
            showToast('Vui lòng chọn kho', 'error');
            return false;
        }
        if (!formData.locationCode.trim()) {
            showToast('Vui lòng nhập mã vị trí', 'error');
            return false;
        }
        if (formData.locationCode.trim().length > 50) {
            showToast('Mã vị trí tối đa 50 ký tự', 'error');
            return false;
        }
        if (formData.locationName?.trim().length > 200) {
            showToast('Tên vị trí tối đa 200 ký tự', 'error');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            const payload = {
                warehouseId: Number(formData.warehouseId),
                locationCode: formData.locationCode.trim(),
                locationName: formData.locationName?.trim() || null,
                isActive: !!formData.isActive,
            };

            if (editingRow) {
                await updateStorageLocation(editingRow.locationId, {
                    locationCode: payload.locationCode,
                    locationName: payload.locationName,
                    isActive: payload.isActive,
                });
                showToast('Cập nhật vị trí kho thành công', 'success');
            } else {
                await createStorageLocation(payload);
                showToast('Tạo vị trí kho thành công', 'success');
            }

            closeDialog();
            await fetchStorageLocations();
        } catch (error) {
            console.error('Save storage location failed:', error);
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'Có lỗi xảy ra khi lưu vị trí kho';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (row) => {
        const nextStatus = !row.isActive;
        try {
            await changeStorageLocationStatus(row.locationId, nextStatus);
            showToast(nextStatus ? 'Đã kích hoạt vị trí kho' : 'Đã vô hiệu hóa vị trí kho', 'success');
            await fetchStorageLocations();
        } catch (error) {
            console.error('Toggle status failed:', error);
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'Không đổi được trạng thái vị trí kho';
            showToast(msg, 'error');
        }
    };

    return (
        <Box sx={{ p: 2.5, bgcolor: '#fafafa', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                    Quản lý vị trí kho
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Danh sách vị trí lưu trữ theo từng kho
                </Typography>
            </Box>

            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <SearchInput
                        placeholder="Tìm mã vị trí, tên vị trí..."
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        sx={{ minWidth: 260, maxWidth: 420 }}
                    />

                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Kho</InputLabel>
                        <Select
                            label="Kho"
                            value={warehouseFilter}
                            onChange={(e) => {
                                setWarehouseFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="">Tất cả kho</MenuItem>
                            {warehouses.map((wh) => (
                                <MenuItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                                    {wh.warehouseCode} - {wh.warehouseName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            label="Trạng thái"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="active">Hoạt động</MenuItem>
                            <MenuItem value="inactive">Tạm tắt</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Tồn kho</InputLabel>
                        <Select
                            label="Tồn kho"
                            value={stockFilter}
                            onChange={(e) => {
                                setStockFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="has-stock">Có hàng</MenuItem>
                            <MenuItem value="empty">Trống</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        label="Mã vật tư"
                        value={itemCodeFilter}
                        onChange={(e) => {
                            setItemCodeFilter(e.target.value);
                            setPage(1);
                        }}
                        sx={{ minWidth: 150 }}
                    />

                    <TextField
                        size="small"
                        label="SL từ"
                        type="number"
                        value={minQtyFilter}
                        onChange={(e) => {
                            setMinQtyFilter(e.target.value);
                            setPage(1);
                        }}
                        sx={{ width: 110 }}
                    />

                    <TextField
                        size="small"
                        label="SL đến"
                        type="number"
                        value={maxQtyFilter}
                        onChange={(e) => {
                            setMaxQtyFilter(e.target.value);
                            setPage(1);
                        }}
                        sx={{ width: 110 }}
                    />

                    <Button
                        variant="outlined"
                        startIcon={<RefreshCw size={16} />}
                        onClick={fetchStorageLocations}
                        sx={{ textTransform: 'none', ml: 'auto' }}
                    >
                        Tải lại
                    </Button>

                    {canManage && (
                        <Button
                            variant="contained"
                            startIcon={<Plus size={16} />}
                            onClick={openCreateDialog}
                            sx={{
                                textTransform: 'none',
                                bgcolor: '#0284c7',
                                '&:hover': { bgcolor: '#0369a1' },
                            }}
                        >
                            Thêm vị trí
                        </Button>
                    )}
                </Box>

                <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Kho</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Mã vị trí</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Tên vị trí</TableCell>
                                <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Tồn tại vị trí</TableCell>
                                <TableCell sx={{ fontWeight: 600, minWidth: 280 }}>Vật tư đang chứa</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Lịch sử</TableCell>
                                {canManage && <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Thao tác</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 9 : 8} sx={{ textAlign: 'center', py: 4 }}>
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 9 : 8} sx={{ textAlign: 'center', py: 5, color: '#9ca3af' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <MapPin size={16} />
                                            Chưa có vị trí kho
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row, idx) => (
                                    <TableRow key={row.locationId} hover>
                                        <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                                        <TableCell>{row.warehouseName || `Kho #${row.warehouseId}`}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#0284c7' }}>{row.locationCode}</TableCell>
                                        <TableCell>{row.locationName || '-'}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#111827' }}>
                                            {formatQty(row.currentQty)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: row.currentItemsSummary ? '#374151' : '#9ca3af',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: 360,
                                                }}
                                                title={row.currentItemsSummary || 'Chưa có vật tư'}
                                            >
                                                {formatItemsSummary(row.currentItemsSummary) || 'Chưa có vật tư'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={row.isActive} dot="•" variant="dot" />
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => openLedgerDialog(row)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Lịch sử
                                            </Button>
                                        </TableCell>
                                        {canManage && (
                                            <TableCell sx={{ textAlign: 'right' }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<Edit size={14} />}
                                                    onClick={() => openEditDialog(row)}
                                                    sx={{ textTransform: 'none', mr: 1 }}
                                                >
                                                    Sửa
                                                </Button>
                                                <Button
                                                    size="small"
                                                    color={row.isActive ? 'warning' : 'success'}
                                                    onClick={() => handleToggleStatus(row)}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {row.isActive ? 'Tạm tắt' : 'Kích hoạt'}
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ p: 2, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Trang {Math.min(page, totalPages)} / {totalPages}
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        sx={{ textTransform: 'none' }}
                    >
                        Trước
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page >= totalPages}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        sx={{ textTransform: 'none' }}
                    >
                        Sau
                    </Button>
                </Box>
            </Box>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{editingRow ? 'Cập nhật vị trí kho' : 'Thêm vị trí kho'}</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth size="small" disabled={!!editingRow}>
                            <InputLabel>Kho</InputLabel>
                            <Select
                                label="Kho"
                                value={formData.warehouseId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, warehouseId: e.target.value }))}
                            >
                                {warehouses.map((wh) => (
                                    <MenuItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                                        {wh.warehouseCode} - {wh.warehouseName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Mã vị trí"
                            size="small"
                            value={formData.locationCode}
                            onChange={(e) => setFormData((prev) => ({ ...prev, locationCode: e.target.value }))}
                            placeholder="VD: A-01-02"
                            helperText="Định dạng gợi ý: KHU-KE-TANG (ví dụ: A-01-02). Chỉ nên dùng chữ in hoa, số và dấu -."
                            inputProps={{ maxLength: 50 }}
                            required
                        />

                        <TextField
                            label="Tên vị trí"
                            size="small"
                            value={formData.locationName}
                            onChange={(e) => setFormData((prev) => ({ ...prev, locationName: e.target.value }))}
                            inputProps={{ maxLength: 200 }}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                label="Trạng thái"
                                value={formData.isActive ? 'active' : 'inactive'}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isActive: e.target.value === 'active',
                                    }))
                                }
                            >
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Tạm tắt</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ textTransform: 'none' }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={submitting}
                        sx={{ textTransform: 'none', bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                    >
                        {submitting ? 'Đang lưu...' : editingRow ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={ledgerDialog.open} onClose={closeLedgerDialog} fullWidth maxWidth="lg">
                <DialogTitle>
                    Lịch sử vị trí: {ledgerDialog.row?.locationCode}
                    {ledgerDialog.row?.locationName ? ` - ${ledgerDialog.row.locationName}` : ''}
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <TableContainer sx={{ maxHeight: 460 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Thời gian</TableCell>
                                    <TableCell>Chứng từ</TableCell>
                                    <TableCell>Vật tư</TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>Biến động</TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>Trước</TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>Sau</TableCell>
                                    <TableCell>Người thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledgerLoading ? (
                                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>Đang tải...</TableCell></TableRow>
                                ) : ledgerRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#9ca3af' }}>Chưa có biến động</TableCell></TableRow>
                                ) : (
                                    ledgerRows.map((row) => (
                                        <TableRow key={row.inventoryTxnLineId}>
                                            <TableCell>{new Date(row.txnDate).toLocaleString('vi-VN')}</TableCell>
                                            <TableCell>{row.voucherCode || '-'}</TableCell>
                                            <TableCell>{row.itemCode ? `${row.itemCode} - ${row.itemName || ''}` : (row.itemName || '-')}</TableCell>
                                            <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: Number(row.qtyChange) >= 0 ? '#059669' : '#dc2626' }}>
                                                {Number(row.qtyChange) >= 0 ? '+' : ''}{formatQty(row.qtyChange)}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right' }}>{formatQty(row.balanceBefore)}</TableCell>
                                            <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{formatQty(row.balanceAfter)}</TableCell>
                                            <TableCell>{row.performedByName || 'Hệ thống'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Trang {ledgerPage} / {Math.max(1, Math.ceil((ledgerTotalItems || 0) / ledgerPageSize))}
                        </Typography>
                        <Button size="small" variant="outlined" disabled={ledgerPage <= 1 || ledgerLoading} onClick={() => fetchLocationLedger(ledgerDialog.row?.locationId, ledgerPage - 1)}>
                            Trước
                        </Button>
                        <Button size="small" variant="outlined" disabled={ledgerPage >= Math.max(1, Math.ceil((ledgerTotalItems || 0) / ledgerPageSize)) || ledgerLoading} onClick={() => fetchLocationLedger(ledgerDialog.row?.locationId, ledgerPage + 1)}>
                            Sau
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeLedgerDialog} sx={{ textTransform: 'none' }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViewStorageLocationList;
