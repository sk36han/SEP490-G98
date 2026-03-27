/**
 * ViewItemPriceList - Quản lý giá sản phẩm
 * Kế toán: xem, thêm, sửa, xóa giá
 * Thủ Kho / Sale: chỉ xem
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Switch,
} from '@mui/material';
import {
    DollarSign,
    Plus,
    Download,
    Filter,
    RefreshCw,
    Edit2,
    Trash2,
    X,
    TrendingUp,
    TrendingDown,
    Package,
    Calendar,
    CheckCircle,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import SearchInput from '../components/SearchInput';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { parseDate } from '../lib/dateUtils';
import '../styles/ListView.css';

const fDate = (v) => {
    const d = parseDate(v);
    return d ? d.toLocaleDateString('vi-VN') : '-';
};

const formatCurrency = (value, currency = 'VND') =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(Number(value) || 0);

const PRICE_TYPE_LABELS = {
    Purchase: 'Giá nhập',
    Sale: 'Giá xuất',
    Wholesale: 'Giá sỉ',
    Retail: 'Giá lẻ',
    Special: 'Giá đặc biệt',
};

const PRICE_TYPE_COLORS = {
    Purchase: { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '#93c5fd' },
    Sale: { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857', border: '#6ee7b7' },
    Wholesale: { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '#fcd34d' },
    Retail: { bg: 'rgba(139, 92, 246, 0.1)', color: '#6d28d9', border: '#c4b5fd' },
    Special: { bg: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '#fca5a5' },
};

const ITEM_PRICE_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false },
    { id: 'itemCode', label: 'Mã vật tư', sortable: true },
    { id: 'itemName', label: 'Tên vật tư', sortable: true },
    { id: 'priceType', label: 'Loại giá', sortable: true },
    { id: 'amount', label: 'Giá', sortable: true },
    { id: 'currency', label: 'Tiền tệ', sortable: true },
    { id: 'effectiveFrom', label: 'Từ ngày', sortable: true },
    { id: 'effectiveTo', label: 'Đến ngày', sortable: true },
    { id: 'isActive', label: 'Trạng thái', sortable: true },
    { id: 'actions', label: 'Thao tác', sortable: false },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** ─── Mock data ─── */
const MOCK_ITEM_PRICES = [
    { itemPriceId: 1, itemId: 1, itemCode: 'SP001', itemName: 'Bóng đèn LED 9W', priceType: 'Purchase', amount: 15000, currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: null, isActive: true, createdAt: '2026-01-01' },
    { itemPriceId: 2, itemId: 1, itemCode: 'SP001', itemName: 'Bóng đèn LED 9W', priceType: 'Sale', amount: 35000, currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: null, isActive: true, createdAt: '2026-01-01' },
    { itemPriceId: 3, itemId: 1, itemCode: 'SP001', itemName: 'Bóng đèn LED 9W', priceType: 'Purchase', amount: 14500, currency: 'VND', effectiveFrom: '2025-10-01', effectiveTo: '2025-12-31', isActive: false, createdAt: '2025-10-01' },
    { itemPriceId: 4, itemId: 2, itemCode: 'SP002', itemName: 'Dây cáp điện 2.5mm', priceType: 'Purchase', amount: 8500, currency: 'VND', effectiveFrom: '2026-01-15', effectiveTo: null, isActive: true, createdAt: '2026-01-15' },
    { itemPriceId: 5, itemId: 2, itemCode: 'SP002', itemName: 'Dây cáp điện 2.5mm', priceType: 'Sale', amount: 18000, currency: 'VND', effectiveFrom: '2026-01-15', effectiveTo: null, isActive: true, createdAt: '2026-01-15' },
    { itemPriceId: 6, itemId: 2, itemCode: 'SP002', itemName: 'Dây cáp điện 2.5mm', priceType: 'Wholesale', amount: 16000, currency: 'VND', effectiveFrom: '2026-01-15', effectiveTo: null, isActive: true, createdAt: '2026-01-15' },
    { itemPriceId: 7, itemId: 3, itemCode: 'SP003', itemName: 'Ổ cắm điện Panasonic', priceType: 'Purchase', amount: 42000, currency: 'VND', effectiveFrom: '2026-02-01', effectiveTo: null, isActive: true, createdAt: '2026-02-01' },
    { itemPriceId: 8, itemId: 3, itemCode: 'SP003', itemName: 'Ổ cắm điện Panasonic', priceType: 'Sale', amount: 85000, currency: 'VND', effectiveFrom: '2026-02-01', effectiveTo: null, isActive: true, createdAt: '2026-02-01' },
    { itemPriceId: 9, itemId: 4, itemCode: 'SP004', itemName: 'Công tắc 1 chiều', priceType: 'Purchase', amount: 22000, currency: 'VND', effectiveFrom: '2025-12-01', effectiveTo: null, isActive: true, createdAt: '2025-12-01' },
    { itemPriceId: 10, itemId: 4, itemCode: 'SP004', itemName: 'Công tắc 1 chiều', priceType: 'Sale', amount: 55000, currency: 'VND', effectiveFrom: '2025-12-01', effectiveTo: null, isActive: true, createdAt: '2025-12-01' },
    { itemPriceId: 11, itemId: 5, itemCode: 'SP005', itemName: 'CB 10A 1P', priceType: 'Purchase', amount: 35000, currency: 'VND', effectiveFrom: '2026-03-01', effectiveTo: null, isActive: true, createdAt: '2026-03-01' },
    { itemPriceId: 12, itemId: 5, itemCode: 'SP005', itemName: 'CB 10A 1P', priceType: 'Sale', amount: 75000, currency: 'VND', effectiveFrom: '2026-03-01', effectiveTo: null, isActive: true, createdAt: '2026-03-01' },
    { itemPriceId: 13, itemId: 6, itemCode: 'SP006', itemName: 'Ống luồng PVC 20mm', priceType: 'Purchase', amount: 12000, currency: 'VND', effectiveFrom: '2026-01-10', effectiveTo: null, isActive: true, createdAt: '2026-01-10' },
    { itemPriceId: 14, itemId: 6, itemCode: 'SP006', itemName: 'Ống luồng PVC 20mm', priceType: 'Sale', amount: 25000, currency: 'VND', effectiveFrom: '2026-01-10', effectiveTo: null, isActive: true, createdAt: '2026-01-10' },
    { itemPriceId: 15, itemId: 7, itemCode: 'SP007', itemName: 'Băng keo cách điện', priceType: 'Purchase', amount: 8000, currency: 'VND', effectiveFrom: '2026-02-15', effectiveTo: null, isActive: true, createdAt: '2026-02-15' },
    { itemPriceId: 16, itemId: 7, itemCode: 'SP007', itemName: 'Băng keo cách điện', priceType: 'Sale', amount: 18000, currency: 'VND', effectiveFrom: '2026-02-15', effectiveTo: null, isActive: true, createdAt: '2026-02-15' },
    { itemPriceId: 17, itemId: 8, itemCode: 'SP008', itemName: 'Đầu cos đồng 4mm', priceType: 'Purchase', amount: 5500, currency: 'VND', effectiveFrom: '2026-01-20', effectiveTo: null, isActive: true, createdAt: '2026-01-20' },
    { itemPriceId: 18, itemId: 8, itemCode: 'SP008', itemName: 'Đầu cos đồng 4mm', priceType: 'Sale', amount: 12000, currency: 'VND', effectiveFrom: '2026-01-20', effectiveTo: null, isActive: true, createdAt: '2026-01-20' },
    { itemPriceId: 19, itemId: 9, itemCode: 'SP009', itemName: 'Thanh ray nhựa', priceType: 'Purchase', amount: 18000, currency: 'VND', effectiveFrom: '2025-11-01', effectiveTo: null, isActive: true, createdAt: '2025-11-01' },
    { itemPriceId: 20, itemId: 9, itemCode: 'SP009', itemName: 'Thanh ray nhựa', priceType: 'Sale', amount: 38000, currency: 'VND', effectiveFrom: '2025-11-01', effectiveTo: null, isActive: true, createdAt: '2025-11-01' },
    { itemPriceId: 21, itemId: 10, itemCode: 'SP010', itemName: 'Domino điện 6 lỗ', priceType: 'Purchase', amount: 15000, currency: 'VND', effectiveFrom: '2026-03-10', effectiveTo: null, isActive: true, createdAt: '2026-03-10' },
    { itemPriceId: 22, itemId: 10, itemCode: 'SP010', itemName: 'Domino điện 6 lỗ', priceType: 'Sale', amount: 32000, currency: 'VND', effectiveFrom: '2026-03-10', effectiveTo: null, isActive: true, createdAt: '2026-03-10' },
];

/** ─── Style helpers ─── */
const headCellSx = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    height: 48,
    py: 0,
    px: 2,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
};

const bodyCellSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.5,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
};

/** ─── Summary Card ─── */
const SummaryCard = ({ icon: Icon, label, value, subValue, color, bgColor }) => (
    <Box
        sx={{
            flex: '1 1 200px',
            minWidth: 200,
            bgcolor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
    >
        <Box
            sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <Icon size={22} color={color} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.25 }}>
                {value}
            </Typography>
            {subValue && (
                <Typography sx={{ fontSize: '11px', color: '#9ca3af', mt: 0.25 }}>{subValue}</Typography>
            )}
        </Box>
    </Box>
);

/** ─── Add/Edit Dialog ─── */
const PriceDialog = ({ open, onClose, onSave, editingRow, onEdit }) => {
    const [form, setForm] = useState({
        itemCode: '',
        itemName: '',
        priceType: 'Purchase',
        amount: '',
        currency: 'VND',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        isActive: true,
    });

    useEffect(() => {
        if (editingRow) {
            setForm({
                itemCode: editingRow.itemCode || '',
                itemName: editingRow.itemName || '',
                priceType: editingRow.priceType || 'Purchase',
                amount: editingRow.amount || '',
                currency: editingRow.currency || 'VND',
                effectiveFrom: editingRow.effectiveFrom || '',
                effectiveTo: editingRow.effectiveTo || '',
                isActive: editingRow.isActive ?? true,
            });
        } else {
            setForm({
                itemCode: '',
                itemName: '',
                priceType: 'Purchase',
                amount: '',
                currency: 'VND',
                effectiveFrom: new Date().toISOString().split('T')[0],
                effectiveTo: '',
                isActive: true,
            });
        }
    }, [editingRow, open]);

    const handleSave = () => {
        if (!form.itemCode || !form.itemName || !form.amount) {
            return;
        }
        onSave({ ...form, amount: Number(form.amount) });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    fontSize: '17px',
                    color: '#111827',
                    borderBottom: '1px solid #f3f4f6',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {editingRow ? 'Sửa giá sản phẩm' : 'Thêm giá sản phẩm'}
                <IconButton size="small" onClick={onClose} sx={{ color: '#9ca3af' }}>
                    <X size={18} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Item */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Mã vật tư"
                            size="small"
                            value={form.itemCode}
                            onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                            fullWidth
                            placeholder="VD: SP001"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                '& .MuiInputLabel-root': { fontSize: '14px' },
                            }}
                        />
                        <TextField
                            label="Tên vật tư"
                            size="small"
                            value={form.itemName}
                            onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                            fullWidth
                            placeholder="VD: Bóng đèn LED 9W"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                '& .MuiInputLabel-root': { fontSize: '14px' },
                            }}
                        />
                    </Box>

                    {/* Price Type & Amount */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl size="small" fullWidth>
                            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                                Loại giá
                            </Typography>
                            <Select
                                value={form.priceType}
                                onChange={(e) => setForm((f) => ({ ...f, priceType: e.target.value }))}
                                sx={{ borderRadius: '10px', fontSize: '14px' }}
                            >
                                {Object.entries(PRICE_TYPE_LABELS).map(([key, label]) => (
                                    <MenuItem key={key} value={key} sx={{ fontSize: '14px' }}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Giá"
                            size="small"
                            type="number"
                            value={form.amount}
                            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                            fullWidth
                            placeholder="VD: 15000"
                            InputProps={{
                                endAdornment: (
                                    <Typography sx={{ fontSize: '13px', color: '#9ca3af', mr: 1 }}>VND</Typography>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                '& .MuiInputLabel-root': { fontSize: '14px' },
                            }}
                        />
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Từ ngày"
                            size="small"
                            type="date"
                            value={form.effectiveFrom}
                            onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                '& .MuiInputLabel-root': { fontSize: '14px' },
                            }}
                        />
                        <TextField
                            label="Đến ngày (không bắt buộc)"
                            size="small"
                            type="date"
                            value={form.effectiveTo}
                            onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                '& .MuiInputLabel-root': { fontSize: '14px' },
                            }}
                        />
                    </Box>

                    {/* Active */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1.5,
                            bgcolor: '#f9fafb',
                            borderRadius: '10px',
                            border: '1px solid #e5e7eb',
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Đang hoạt động
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                                Giá này sẽ được sử dụng làm giá mặc định
                            </Typography>
                        </Box>
                        <Switch
                            checked={form.isActive}
                            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                            size="medium"
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f3f4f6' }}>
                <Button
                    onClick={onClose}
                    sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280', borderRadius: '10px' }}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!form.itemCode || !form.itemName || !form.amount}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '10px',
                        bgcolor: '#0284c7',
                        '&:hover': { bgcolor: '#0369a1' },
                    }}
                >
                    {editingRow ? 'Lưu thay đổi' : 'Thêm giá'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/** ─── Delete Confirmation Dialog ─── */
const DeleteDialog = ({ open, onClose, onConfirm, deletingRow }) => (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
            sx: {
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
            },
        }}
    >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '17px', color: '#111827', px: 3, py: 2.5 }}>
            Xác nhận xóa
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1 }}>
            <Alert
                severity="warning"
                sx={{ borderRadius: '10px', fontSize: '13px', mb: 1 }}
            >
                Hành động này không thể hoàn tác.
            </Alert>
            <Typography sx={{ fontSize: '14px', color: '#374151', mt: 1.5 }}>
                Bạn có chắc muốn xóa giá{' '}
                <strong>
                    {PRICE_TYPE_LABELS[deletingRow?.priceType]} — {formatCurrency(deletingRow?.amount)}
                </strong>{' '}
                của vật tư{' '}
                <strong>{deletingRow?.itemName}</strong>?
            </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
                onClick={onClose}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280', borderRadius: '10px' }}
            >
                Hủy
            </Button>
            <Button
                variant="contained"
                color="error"
                onClick={onConfirm}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
            >
                Xóa
            </Button>
        </DialogActions>
    </Dialog>
);

/** ─── Main Component ─── */
const ViewItemPriceList = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    const isAccountant = permissionRole === 'ACCOUNTANTS';
    const canEdit = isAccountant;

    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriceType, setFilterPriceType] = useState('All');
    const [filterActive, setFilterActive] = useState('All');
    const [orderBy, setOrderBy] = useState('itemCode');
    const [order, setOrder] = useState('asc');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRow, setDeletingRow] = useState(null);

    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setPrices(MOCK_ITEM_PRICES);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // Filter
    const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');

    const filteredPrices = useMemo(() => {
        let result = prices;

        if (searchTerm.trim()) {
            const term = normalize(searchTerm.trim());
            result = result.filter(
                (p) =>
                    normalize(p.itemCode).includes(term) ||
                    normalize(p.itemName).includes(term) ||
                    normalize(p.priceType).includes(term)
            );
        }

        if (filterPriceType !== 'All') {
            result = result.filter((p) => p.priceType === filterPriceType);
        }

        if (filterActive === 'Active') {
            result = result.filter((p) => p.isActive);
        } else if (filterActive === 'Inactive') {
            result = result.filter((p) => !p.isActive);
        }

        return result;
    }, [prices, searchTerm, filterPriceType, filterActive]);

    // Sort
    const sortedPrices = useMemo(() => {
        const sorted = [...filteredPrices];
        sorted.sort((a, b) => {
            let cmp = 0;
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            if (orderBy === 'amount') {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else if (orderBy === 'effectiveFrom' || orderBy === 'effectiveTo') {
                cmp = (aVal ? parseDate(aVal)?.getTime() : 0) - (bVal ? parseDate(bVal)?.getTime() : 0);
            } else {
                cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
            }
            return order === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [filteredPrices, orderBy, order]);

    const rows = sortedPrices.slice(page * pageSize, (page + 1) * pageSize);
    const totalCount = sortedPrices.length;
    const totalPages = Math.max(0, Math.ceil(totalCount / pageSize));
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);

    // Summary stats
    const stats = useMemo(() => {
        const total = prices.length;
        const activeCount = prices.filter((p) => p.isActive).length;
        const purchaseCount = prices.filter((p) => p.priceType === 'Purchase').length;
        const saleCount = prices.filter((p) => p.priceType === 'Sale').length;
        const uniqueItems = new Set(prices.map((p) => p.itemId)).size;
        return { total, activeCount, purchaseCount, saleCount, uniqueItems };
    }, [prices]);

    const handleSort = (colId) => {
        if (!ITEM_PRICE_COLUMNS.find((c) => c.id === colId)?.sortable) return;
        if (orderBy === colId) {
            setOrder(order === 'asc' ? 'desc' : 'asc');
        } else {
            setOrderBy(colId);
            setOrder('asc');
        }
    };

    const handleAddNew = () => {
        setEditingRow(null);
        setDialogOpen(true);
    };

    const handleEdit = (row) => {
        setEditingRow(row);
        setDialogOpen(true);
    };

    const handleDelete = (row) => {
        setDeletingRow(row);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        setPrices((prev) => prev.filter((p) => p.itemPriceId !== deletingRow.itemPriceId));
        showToast(`Đã xóa giá ${PRICE_TYPE_LABELS[deletingRow.priceType]} của ${deletingRow.itemName}.`, 'success');
        setDeleteDialogOpen(false);
        setDeletingRow(null);
    };

    const handleSavePrice = (formData) => {
        if (editingRow) {
            setPrices((prev) =>
                prev.map((p) =>
                    p.itemPriceId === editingRow.itemPriceId ? { ...p, ...formData } : p
                )
            );
            showToast('Đã cập nhật giá thành công.', 'success');
        } else {
            const newRow = {
                ...formData,
                itemPriceId: Date.now(),
                itemId: Date.now(),
                createdAt: new Date().toISOString().split('T')[0],
                effectiveTo: formData.effectiveTo || null,
            };
            setPrices((prev) => [newRow, ...prev]);
            showToast('Đã thêm giá mới thành công.', 'success');
        }
        setDialogOpen(false);
        setEditingRow(null);
    };

    const handleExport = () => showToast('Chức năng xuất Excel sẽ được triển khai sớm.', 'info');

    const isCenterAligned = (colId) => ['stt', 'amount', 'isActive', 'actions'].includes(colId);

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafafa',
            }}
        >
            {/* Header */}
            <Box sx={{ flexShrink: 0, px: 3, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', fontSize: '22px' }}>
                    Quản lý giá sản phẩm
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5 }}>
                    Quản lý giá nhập, giá xuất và các loại giá khác của vật tư
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', px: 3, pb: 2 }}>
                {/* Summary cards */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2.5, flexShrink: 0 }}>
                    <SummaryCard
                        icon={DollarSign}
                        label="Tổng bản ghi"
                        value={stats.total}
                        subValue={`${stats.uniqueItems} vật tư`}
                        color="#0284c7"
                        bgColor="rgba(2,132,199,0.1)"
                    />
                    <SummaryCard
                        icon={CheckCircle}
                        label="Đang hoạt động"
                        value={stats.activeCount}
                        subValue="giá hiệu lực"
                        color="#16a34a"
                        bgColor="rgba(22,163,74,0.1)"
                    />
                    <SummaryCard
                        icon={TrendingDown}
                        label="Giá nhập (Purchase)"
                        value={stats.purchaseCount}
                        subValue="bản ghi"
                        color="#2563eb"
                        bgColor="rgba(37,99,235,0.1)"
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Giá xuất (Sale)"
                        value={stats.saleCount}
                        subValue="bản ghi"
                        color="#16a34a"
                        bgColor="rgba(22,163,74,0.1)"
                    />
                </Box>

                {/* Main table card */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: '14px',
                        bgcolor: '#fff',
                    }}
                >
                    {/* Filter bar */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            gap: 2,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <SearchInput
                            placeholder="Tìm theo mã, tên vật tư, loại giá…"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }}
                            sx={{
                                flex: '1 1 200px',
                                minWidth: 200,
                                maxWidth: 420,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#f3f4f6',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                },
                            }}
                        />

                        {/* Filter: Price type */}
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                                value={filterPriceType}
                                onChange={(e) => {
                                    setFilterPriceType(e.target.value);
                                    setPage(0);
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    bgcolor: '#f3f4f6',
                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                }}
                            >
                                <MenuItem value="All" sx={{ fontSize: '13px' }}>Tất cả loại giá</MenuItem>
                                {Object.entries(PRICE_TYPE_LABELS).map(([key, label]) => (
                                    <MenuItem key={key} value={key} sx={{ fontSize: '13px' }}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Filter: Active */}
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                                value={filterActive}
                                onChange={(e) => {
                                    setFilterActive(e.target.value);
                                    setPage(0);
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    bgcolor: '#f3f4f6',
                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                }}
                            >
                                <MenuItem value="All" sx={{ fontSize: '13px' }}>Tất cả trạng thái</MenuItem>
                                <MenuItem value="Active" sx={{ fontSize: '13px' }}>Đang hoạt động</MenuItem>
                                <MenuItem value="Inactive" sx={{ fontSize: '13px' }}>Không hoạt động</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                            <Tooltip title="Xuất danh sách">
                                <IconButton
                                    onClick={handleExport}
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb' },
                                    }}
                                >
                                    <Download size={18} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Tải lại">
                                <IconButton
                                    onClick={() => {
                                        setLoading(true);
                                        setTimeout(() => {
                                            setPrices(MOCK_ITEM_PRICES);
                                            setLoading(false);
                                            setPage(0);
                                        }, 600);
                                    }}
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb' },
                                    }}
                                >
                                    <RefreshCw size={18} />
                                </IconButton>
                            </Tooltip>
                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={16} />}
                                    onClick={handleAddNew}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        bgcolor: '#0284c7',
                                        '&:hover': { bgcolor: '#0369a1' },
                                        height: 38,
                                        px: 2,
                                    }}
                                >
                                    Thêm giá
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Table */}
                    <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    {ITEM_PRICE_COLUMNS.map((col) => (
                                        <TableCell
                                            key={col.id}
                                            align={isCenterAligned(col.id) ? 'center' : 'left'}
                                            sx={{ ...headCellSx }}
                                        >
                                            {col.sortable ? (
                                                <TableSortLabel
                                                    active={orderBy === col.id}
                                                    direction={orderBy === col.id ? order : 'asc'}
                                                    onClick={() => handleSort(col.id)}
                                                    sx={{ '& .MuiTableSortLabel-icon': { fontSize: '13px' } }}
                                                >
                                                    {col.label}
                                                </TableSortLabel>
                                            ) : (
                                                col.label
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={ITEM_PRICE_COLUMNS.length} sx={{ textAlign: 'center', py: 8 }}>
                                            <CircularProgress size={36} />
                                            <Typography sx={{ mt: 1.5, color: '#9ca3af', fontSize: '13px' }}>
                                                Đang tải dữ liệu…
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={ITEM_PRICE_COLUMNS.length} sx={{ textAlign: 'center', py: 8 }}>
                                            <Package size={48} style={{ color: '#d1d5db', marginBottom: 12 }} />
                                            <Typography sx={{ color: '#9ca3af', fontSize: '14px' }}>
                                                Không tìm thấy bản ghi nào
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row, index) => {
                                        const typeStyle = PRICE_TYPE_COLORS[row.priceType] || PRICE_TYPE_COLORS.Sale;
                                        return (
                                            <TableRow
                                                key={row.itemPriceId}
                                                hover
                                                sx={{
                                                    height: 56,
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                    ...(!row.isActive ? { opacity: 0.6 } : {}),
                                                }}
                                            >
                                                <TableCell align="center" sx={{ ...bodyCellSx, color: '#9ca3af', fontSize: '12px' }}>
                                                    {(page) * pageSize + index + 1}
                                                </TableCell>
                                                <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: '#2563eb' }}>
                                                    {row.itemCode}
                                                </TableCell>
                                                <TableCell sx={{ ...bodyCellSx }}>
                                                    {row.itemName}
                                                </TableCell>
                                                <TableCell sx={{ ...bodyCellSx }}>
                                                    <Chip
                                                        label={PRICE_TYPE_LABELS[row.priceType] || row.priceType}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            bgcolor: typeStyle.bg,
                                                            color: typeStyle.color,
                                                            border: `1px solid ${typeStyle.border}`,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell
                                                    align="center"
                                                    sx={{ ...bodyCellSx, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                                >
                                                    <span style={{ color: row.priceType === 'Purchase' ? '#2563eb' : '#047857' }}>
                                                        {formatCurrency(row.amount)}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="center" sx={{ ...bodyCellSx, color: '#6b7280', fontSize: '12px' }}>
                                                    {row.currency}
                                                </TableCell>
                                                <TableCell sx={{ ...bodyCellSx, color: '#6b7280', fontSize: '12px' }}>
                                                    {row.effectiveFrom ? fDate(row.effectiveFrom) : '-'}
                                                </TableCell>
                                                <TableCell sx={{ ...bodyCellSx, color: '#6b7280', fontSize: '12px' }}>
                                                    {row.effectiveTo ? fDate(row.effectiveTo) : '—'}
                                                </TableCell>
                                                <TableCell align="center" sx={{ ...bodyCellSx }}>
                                                    <Chip
                                                        label={row.isActive ? '● Hoạt động' : '● Hết hiệu lực'}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '11px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            bgcolor: row.isActive ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.1)',
                                                            color: row.isActive ? '#16a34a' : '#6b7280',
                                                            '& .MuiChip-label': { px: 1 },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ ...bodyCellSx }}>
                                                    {canEdit && (
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                            <Tooltip title="Sửa">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleEdit(row)}
                                                                    sx={{
                                                                        color: '#6b7280',
                                                                        '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)' },
                                                                        borderRadius: '8px',
                                                                    }}
                                                                >
                                                                    <Edit2 size={15} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Xóa">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDelete(row)}
                                                                    sx={{
                                                                        color: '#6b7280',
                                                                        '&:hover': { color: '#dc2626', bgcolor: 'rgba(220,38,38,0.08)' },
                                                                        borderRadius: '8px',
                                                                    }}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 2.5,
                            py: 1.5,
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                        }}
                    >
                        <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                            {start}–{end} / {totalCount} bản ghi
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <FormControl size="small">
                                <Select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(0);
                                    }}
                                    sx={{ height: 32, fontSize: '12px', borderRadius: '8px' }}
                                >
                                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                        <MenuItem key={n} value={n} sx={{ fontSize: '12px' }}>{n} dòng</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={page <= 0}
                                onClick={() => setPage((p) => p - 1)}
                                sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px', minWidth: 60 }}
                            >
                                Trước
                            </Button>
                            <Typography sx={{ fontSize: '12px', color: '#374151', minWidth: 60, textAlign: 'center' }}>
                                {page + 1} / {totalPages || 1}
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={end >= totalCount || totalCount === 0}
                                onClick={() => setPage((p) => p + 1)}
                                sx={{ textTransform: 'none', fontSize: '12px', borderRadius: '8px', minWidth: 60 }}
                            >
                                Sau
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Dialogs */}
            <PriceDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditingRow(null);
                }}
                onSave={handleSavePrice}
                editingRow={editingRow}
            />
            <DeleteDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingRow(null);
                }}
                onConfirm={handleConfirmDelete}
                deletingRow={deletingRow}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </Box>
    );
};

export default ViewItemPriceList;
