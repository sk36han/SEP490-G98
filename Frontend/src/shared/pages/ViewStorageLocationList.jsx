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
    useTheme,
    useMediaQuery,
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

/** Cùng chuẩn bảng với ViewWarehouseList / các trang danh sách mới */
const HEAD_CELL_SX = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    py: 1.5,
    px: 2,
    verticalAlign: 'middle',
};

const BODY_CELL_SX = {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '20px',
    py: 1.75,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

const FILTER_SELECT_SX = {
    height: 36,
    fontSize: '13px',
    borderRadius: '8px',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' },
};

const FILTER_TEXTFIELD_SX = {
    '& .MuiOutlinedInput-root': {
        fontSize: '13px',
        borderRadius: '8px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' },
    },
    '& .MuiInputLabel-root': { fontSize: '13px' },
};

const EMPTY_FORM = {
    warehouseId: '',
    locationCode: '',
    locationName: '',
    maxCapacityQty: '',
    isActive: true,
};

const EMPTY_FORM_ERRORS = {
    warehouseId: '',
    locationCode: '',
    locationName: '',
    maxCapacityQty: '',
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    const [formErrors, setFormErrors] = useState(EMPTY_FORM_ERRORS);
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
        setFormErrors(EMPTY_FORM_ERRORS);
        setDialogOpen(true);
    };

    const openEditDialog = (row) => {
        setEditingRow(row);
        setFormData({
            warehouseId: String(row.warehouseId ?? ''),
            locationCode: row.locationCode ?? '',
            locationName: row.locationName ?? '',
            maxCapacityQty: row.maxCapacityQty == null ? '' : String(row.maxCapacityQty),
            isActive: row.isActive ?? true,
        });
        setFormErrors(EMPTY_FORM_ERRORS);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        setEditingRow(null);
        setFormData(EMPTY_FORM);
        setFormErrors(EMPTY_FORM_ERRORS);
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
        const nextErrors = { ...EMPTY_FORM_ERRORS };

        if (!formData.warehouseId) {
            nextErrors.warehouseId = 'Vui lòng chọn kho';
        }
        if (!formData.locationCode.trim()) {
            nextErrors.locationCode = 'Vui lòng nhập mã vị trí';
        }
        if (!nextErrors.locationCode && formData.locationCode.trim().length > 50) {
            nextErrors.locationCode = 'Mã vị trí tối đa 50 ký tự';
        }
        if (formData.locationName?.trim().length > 200) {
            nextErrors.locationName = 'Tên vị trí tối đa 200 ký tự';
        }
        if (String(formData.maxCapacityQty ?? '').trim() !== '') {
            const value = Number(formData.maxCapacityQty);
            if (!Number.isFinite(value) || value <= 0) {
                nextErrors.maxCapacityQty = 'Sức chứa tối đa phải lớn hơn 0 hoặc để trống';
            }
        }

        setFormErrors(nextErrors);
        const firstError = Object.values(nextErrors).find(Boolean);
        if (firstError) {
            showToast(firstError, 'error');
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
                maxCapacityQty: String(formData.maxCapacityQty ?? '').trim() === '' ? null : Number(formData.maxCapacityQty),
                isActive: !!formData.isActive,
            };

            if (editingRow) {
                await updateStorageLocation(editingRow.locationId, {
                    locationCode: payload.locationCode,
                    locationName: payload.locationName,
                    maxCapacityQty: payload.maxCapacityQty,
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
        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafafa',
            }}
        >
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography
                    variant="h5"
                    component="h1"
                    fontWeight="600"
                    sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                >
                    Quản lý vị trí kho
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Danh sách vị trí lưu trữ theo từng kho
                </Typography>
            </Box>

            <Box
                className="list-view storage-location-list-page"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    boxSizing: 'border-box',
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 2,
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: 1.5,
                            alignItems: isMobile ? 'stretch' : 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <SearchInput
                            placeholder="Tìm mã vị trí, tên vị trí…"
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setPage(1);
                            }}
                            sx={{
                                flex: '1 1 200px',
                                minWidth: isMobile ? '100%' : 200,
                                maxWidth: isMobile ? '100%' : 420,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#f3f4f6',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    boxShadow: 'none',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                    '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                },
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 220 }}>
                            <InputLabel sx={{ fontSize: '13px' }}>Kho</InputLabel>
                            <Select
                                label="Kho"
                                value={warehouseFilter}
                                onChange={(e) => {
                                    setWarehouseFilter(e.target.value);
                                    setPage(1);
                                }}
                                sx={FILTER_SELECT_SX}
                            >
                                <MenuItem value="" sx={{ fontSize: '13px' }}>Tất cả kho</MenuItem>
                                {warehouses.map((wh) => (
                                    <MenuItem key={wh.warehouseId} value={String(wh.warehouseId)} sx={{ fontSize: '13px' }}>
                                        {wh.warehouseCode} - {wh.warehouseName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                            <InputLabel sx={{ fontSize: '13px' }}>Trạng thái</InputLabel>
                            <Select
                                label="Trạng thái"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                sx={FILTER_SELECT_SX}
                            >
                                <MenuItem value="all" sx={{ fontSize: '13px' }}>Tất cả</MenuItem>
                                <MenuItem value="active" sx={{ fontSize: '13px' }}>Hoạt động</MenuItem>
                                <MenuItem value="inactive" sx={{ fontSize: '13px' }}>Tạm tắt</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 170 }}>
                            <InputLabel sx={{ fontSize: '13px' }}>Tồn kho</InputLabel>
                            <Select
                                label="Tồn kho"
                                value={stockFilter}
                                onChange={(e) => {
                                    setStockFilter(e.target.value);
                                    setPage(1);
                                }}
                                sx={FILTER_SELECT_SX}
                            >
                                <MenuItem value="all" sx={{ fontSize: '13px' }}>Tất cả</MenuItem>
                                <MenuItem value="has-stock" sx={{ fontSize: '13px' }}>Có hàng</MenuItem>
                                <MenuItem value="empty" sx={{ fontSize: '13px' }}>Trống</MenuItem>
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
                            sx={{ ...FILTER_TEXTFIELD_SX, minWidth: isMobile ? '100%' : 150 }}
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
                            sx={{ ...FILTER_TEXTFIELD_SX, width: isMobile ? '100%' : 110 }}
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
                            sx={{ ...FILTER_TEXTFIELD_SX, width: isMobile ? '100%' : 110 }}
                        />

                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                ml: isMobile ? 0 : 'auto',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Button
                                variant="outlined"
                                startIcon={<RefreshCw size={16} />}
                                onClick={fetchStorageLocations}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    borderColor: 'rgba(0, 0, 0, 0.1)',
                                    '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                                }}
                            >
                                Tải lại
                            </Button>

                            {canManage && (
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={openCreateDialog}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        borderRadius: 10,
                                        minHeight: 38,
                                        px: 2.5,
                                        bgcolor: '#0284c7',
                                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                        '&:hover': {
                                            bgcolor: '#0369a1',
                                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                        },
                                    }}
                                >
                                    Thêm vị trí
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <TableContainer
                            sx={{
                                flex: '0 0 auto',
                                alignSelf: 'stretch',
                                minWidth: 0,
                                width: '100%',
                                maxWidth: '100%',
                                overflowX: 'auto',
                                overflowY: 'visible',
                                boxSizing: 'border-box',
                            }}
                        >
                            <Table size="small" stickyHeader sx={{ minWidth: '100%', width: 'max-content', tableLayout: 'auto' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ ...HEAD_CELL_SX, width: 56 }} align="center">STT</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Kho</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Mã vị trí</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Tên vị trí</TableCell>
                                        <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 140 }}>Sức chứa tối đa</TableCell>
                                        <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 220 }}>Tồn tại vị trí</TableCell>
                                        <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 280 }}>Vật tư đang chứa</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Trạng thái</TableCell>
                                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Lịch sử</TableCell>
                                        {canManage && <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Thao tác</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={canManage ? 10 : 9} sx={{ ...BODY_CELL_SX, textAlign: 'center', py: 4 }}>
                                                <Typography variant="body2" sx={{ fontSize: '13px', color: '#6b7280' }}>
                                                    Đang tải dữ liệu…
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canManage ? 10 : 9} sx={{ ...BODY_CELL_SX, textAlign: 'center', py: 5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: '#9ca3af', fontSize: '13px' }}>
                                                    <MapPin size={16} />
                                                    Chưa có vị trí kho
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((row, idx) => (
                                            <TableRow
                                                key={row.locationId}
                                                hover
                                                sx={{
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                }}
                                            >
                                                <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>{(page - 1) * pageSize + idx + 1}</TableCell>
                                                <TableCell sx={BODY_CELL_SX}>{row.warehouseName || `Kho #${row.warehouseId}`}</TableCell>
                                                <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#0284c7' }}>{row.locationCode}</TableCell>
                                                <TableCell sx={BODY_CELL_SX}>{row.locationName || '—'}</TableCell>
                                                <TableCell sx={BODY_CELL_SX}>
                                                    {row.maxCapacityQty == null ? 'Không giới hạn' : formatQty(row.maxCapacityQty)}
                                                </TableCell>
                                                <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#111827' }}>
                                                    {formatQty(row.currentQty)}
                                                </TableCell>
                                                <TableCell sx={BODY_CELL_SX}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '13px',
                                                            lineHeight: '20px',
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
                                                <TableCell sx={BODY_CELL_SX}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                        <StatusBadge status={row.isActive} dot="•" variant="dot" />
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right' }}>
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => openLedgerDialog(row)}
                                                        sx={{ textTransform: 'none', fontSize: '13px' }}
                                                    >
                                                        Lịch sử
                                                    </Button>
                                                </TableCell>
                                                {canManage && (
                                                    <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right' }}>
                                                        <Button
                                                            size="small"
                                                            startIcon={<Edit size={14} />}
                                                            onClick={() => openEditDialog(row)}
                                                            sx={{ textTransform: 'none', mr: 1, fontSize: '13px' }}
                                                        >
                                                            Sửa
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            color={row.isActive ? 'warning' : 'success'}
                                                            onClick={() => handleToggleStatus(row)}
                                                            sx={{ textTransform: 'none', fontSize: '13px' }}
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
                    </Box>

                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 2,
                            py: 2,
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px', color: '#6b7280' }}>
                            Số dòng / trang:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                sx={{
                                    height: 32,
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                                }}
                            >
                                {PAGE_SIZE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt} sx={{ fontSize: '13px' }}>{opt}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px', color: '#6b7280' }}>
                            Trang {Math.min(page, totalPages)} / {totalPages}
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page <= 1}
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                            }}
                        >
                            Trước
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page >= totalPages}
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontSize: '18px', fontWeight: 600, color: '#111827', pb: 1 }}>
                    {editingRow ? 'Cập nhật vị trí kho' : 'Thêm vị trí kho'}
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth size="small" disabled={!!editingRow}>
                            <InputLabel sx={{ fontSize: '13px' }}>Kho</InputLabel>
                            <Select
                                label="Kho"
                                value={formData.warehouseId}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData((prev) => ({ ...prev, warehouseId: value }));
                                    setFormErrors((prev) => ({ ...prev, warehouseId: '' }));
                                }}
                                sx={FILTER_SELECT_SX}
                                error={!!formErrors.warehouseId}
                            >
                                {warehouses.map((wh) => (
                                    <MenuItem key={wh.warehouseId} value={String(wh.warehouseId)} sx={{ fontSize: '13px' }}>
                                        {wh.warehouseCode} - {wh.warehouseName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Mã vị trí"
                            size="small"
                            value={formData.locationCode}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({ ...prev, locationCode: value }));
                                setFormErrors((prev) => ({ ...prev, locationCode: '' }));
                            }}
                            placeholder="VD: A-01-02"
                            helperText={formErrors.locationCode || "Định dạng gợi ý: KHU-KỆ-TẦNG (ví dụ: A-01-02). Chỉ nên dùng chữ in hoa, số và dấu -."}
                            FormHelperTextProps={{ sx: { fontSize: '12px' } }}
                            inputProps={{ maxLength: 50 }}
                            sx={FILTER_TEXTFIELD_SX}
                            error={!!formErrors.locationCode}
                            required
                        />

                        <TextField
                            label="Tên vị trí"
                            size="small"
                            value={formData.locationName}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({ ...prev, locationName: value }));
                                setFormErrors((prev) => ({ ...prev, locationName: '' }));
                            }}
                            inputProps={{ maxLength: 200 }}
                            sx={FILTER_TEXTFIELD_SX}
                            error={!!formErrors.locationName}
                            helperText={formErrors.locationName || ''}
                            FormHelperTextProps={{ sx: { fontSize: '12px' } }}
                        />

                        <TextField
                            label="Sức chứa tối đa"
                            size="small"
                            type="number"
                            value={formData.maxCapacityQty}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({ ...prev, maxCapacityQty: value }));
                                setFormErrors((prev) => ({ ...prev, maxCapacityQty: '' }));
                            }}
                            placeholder="Để trống nếu không giới hạn"
                            inputProps={{ min: 0.0001, step: '0.0001' }}
                            helperText={formErrors.maxCapacityQty || 'Tạm cấu hình số lượng trần cho ô kệ (ví dụ: 100)'}
                            FormHelperTextProps={{ sx: { fontSize: '12px' } }}
                            sx={FILTER_TEXTFIELD_SX}
                            error={!!formErrors.maxCapacityQty}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '13px' }}>Trạng thái</InputLabel>
                            <Select
                                label="Trạng thái"
                                value={formData.isActive ? 'active' : 'inactive'}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isActive: e.target.value === 'active',
                                    }))
                                }
                                sx={FILTER_SELECT_SX}
                            >
                                <MenuItem value="active" sx={{ fontSize: '13px' }}>Hoạt động</MenuItem>
                                <MenuItem value="inactive" sx={{ fontSize: '13px' }}>Tạm tắt</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ textTransform: 'none', fontSize: '13px' }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={submitting}
                        sx={{ textTransform: 'none', fontSize: '13px', bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                    >
                        {submitting ? 'Đang lưu...' : editingRow ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={ledgerDialog.open} onClose={closeLedgerDialog} fullWidth maxWidth="lg">
                <DialogTitle sx={{ fontSize: '18px', fontWeight: 600, color: '#111827', pb: 1 }}>
                    Lịch sử vị trí: {ledgerDialog.row?.locationCode}
                    {ledgerDialog.row?.locationName ? ` - ${ledgerDialog.row.locationName}` : ''}
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <TableContainer sx={{ maxHeight: 460 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={HEAD_CELL_SX}>Thời gian</TableCell>
                                    <TableCell sx={HEAD_CELL_SX}>Chứng từ</TableCell>
                                    <TableCell sx={HEAD_CELL_SX}>Vật tư</TableCell>
                                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Biến động</TableCell>
                                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Trước</TableCell>
                                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Sau</TableCell>
                                    <TableCell sx={HEAD_CELL_SX}>Người thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledgerLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ ...BODY_CELL_SX, textAlign: 'center', py: 3, fontSize: '13px' }}>
                                            Đang tải…
                                        </TableCell>
                                    </TableRow>
                                ) : ledgerRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ ...BODY_CELL_SX, textAlign: 'center', py: 3, color: '#9ca3af', fontSize: '13px' }}>
                                            Chưa có biến động
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ledgerRows.map((row) => (
                                        <TableRow key={row.inventoryTxnLineId} hover sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb' } }}>
                                            <TableCell sx={BODY_CELL_SX}>{new Date(row.txnDate).toLocaleString('vi-VN')}</TableCell>
                                            <TableCell sx={BODY_CELL_SX}>{row.voucherCode || '—'}</TableCell>
                                            <TableCell sx={BODY_CELL_SX}>{row.itemCode ? `${row.itemCode} - ${row.itemName || ''}` : (row.itemName || '—')}</TableCell>
                                            <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, color: Number(row.qtyChange) >= 0 ? '#059669' : '#dc2626' }}>
                                                {Number(row.qtyChange) >= 0 ? '+' : ''}{formatQty(row.qtyChange)}
                                            </TableCell>
                                            <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right' }}>{formatQty(row.balanceBefore)}</TableCell>
                                            <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600 }}>{formatQty(row.balanceAfter)}</TableCell>
                                            <TableCell sx={BODY_CELL_SX}>{row.performedByName || 'Hệ thống'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '13px' }}>
                            Trang {ledgerPage} / {Math.max(1, Math.ceil((ledgerTotalItems || 0) / ledgerPageSize))}
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={ledgerPage <= 1 || ledgerLoading}
                            onClick={() => fetchLocationLedger(ledgerDialog.row?.locationId, ledgerPage - 1)}
                            sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)' }}
                        >
                            Trước
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={ledgerPage >= Math.max(1, Math.ceil((ledgerTotalItems || 0) / ledgerPageSize)) || ledgerLoading}
                            onClick={() => fetchLocationLedger(ledgerDialog.row?.locationId, ledgerPage + 1)}
                            sx={{ textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)' }}
                        >
                            Sau
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeLedgerDialog} sx={{ textTransform: 'none', fontSize: '13px' }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViewStorageLocationList;
