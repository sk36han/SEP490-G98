/**
 * ViewItemPriceList - Giá bình quân gia quyền & Giá nhập
 * Dành cho: Kế Toán, Giám Đốc
 * Dữ liệu: GET /api/InventoryReport/weighted-average
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Button,
    CircularProgress,
    Alert,
} from '@mui/material';
import { DollarSign, TrendingUp, Package, Warehouse, RefreshCw } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { getWarehouses } from '../lib/warehouseService';
import { getWeightedAverageReport } from '../lib/inventoryReportService';
import '../styles/ListView.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const formatQty = (value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '0';
    if (Number.isInteger(n)) return n.toLocaleString('vi-VN');
    return n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
};

const COLUMNS = [
    { id: 'stt', label: 'STT', width: 60 },
    { id: 'itemCode', label: 'Mã vật tư', width: 140 },
    { id: 'itemName', label: 'Tên vật tư', width: 280 },
    { id: 'warehouseName', label: 'Kho', width: 180 },
    { id: 'purchasePrice', label: 'Giá nhập mới nhất', width: 160 },
    { id: 'avgPrice', label: 'Giá bình quân gia quyền', width: 180 },
    { id: 'totalQty', label: 'Tổng tồn', width: 120 },
    { id: 'totalValue', label: 'Giá trị tồn kho', width: 160 },
];

const ROWS_PER_PAGE_OPTIONS = [20, 50, 100];

const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
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
        </Box>
    </Box>
);

const emptyReport = {
    totalMaterials: 0,
    totalInventory: 0,
    averageWeightedPrice: 0,
    totalInventoryValue: 0,
    totalRecords: 0,
    page: 1,
    pageSize: 20,
    items: [],
};

export default function ViewItemPriceList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [warehouseOptions, setWarehouseOptions] = useState([]);
    const [report, setReport] = useState(emptyReport);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedKeyword(searchTerm.trim()), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadWarehouses = useCallback(async () => {
        try {
            const res = await getWarehouses({ pageNumber: 1, pageSize: 200 });
            setWarehouseOptions(res?.items ?? []);
        } catch {
            setWarehouseOptions([]);
        }
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const warehouseId = selectedWarehouse === 'all' ? null : Number(selectedWarehouse);
            const data = await getWeightedAverageReport({
                keyword: debouncedKeyword || undefined,
                warehouseId: warehouseId && warehouseId > 0 ? warehouseId : undefined,
                page,
                pageSize,
            });
            setReport(data);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                err?.message ||
                'Không tải được báo cáo giá vật tư.';
            setError(typeof msg === 'string' ? msg : 'Không tải được báo cáo giá vật tư.');
            setReport(emptyReport);
        } finally {
            setLoading(false);
        }
    }, [debouncedKeyword, selectedWarehouse, page, pageSize]);

    useEffect(() => {
        loadWarehouses();
    }, [loadWarehouses]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const totalPages = Math.max(1, Math.ceil((report.totalRecords || 0) / pageSize));
    const start = report.totalRecords > 0 ? (page - 1) * pageSize + 1 : 0;
    const end = Math.min(page * pageSize, report.totalRecords);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handleWarehouseChange = (e) => {
        setSelectedWarehouse(e.target.value);
        setPage(1);
    };

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(1);
    };

    const summary = useMemo(
        () => ({
            totalItems: report.totalMaterials,
            totalQty: report.totalInventory,
            avgPrice: report.averageWeightedPrice,
            totalValue: report.totalInventoryValue,
        }),
        [report],
    );

    return (
        <Box
            className="list-view"
            sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
            <Box sx={{ px: 3, py: 2.5, bgcolor: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DollarSign size={20} color="#6b7280" />
                    <Typography variant="h5" fontWeight={600} sx={{ fontSize: '22px', color: '#111827', lineHeight: 1.3 }}>
                        Giá bình quân gia quyền
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Giá nhập mới nhất theo lô & đơn giá BQGQ theo từng vật tư — kho
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2.5, gap: 2 }}>
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <SummaryCard
                        icon={Package}
                        label="Tổng vật tư (bộ lọc)"
                        value={summary.totalItems.toLocaleString('vi-VN')}
                        color="#6b7280"
                        bgColor="rgba(107,114,128,0.1)"
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Tổng tồn kho"
                        value={formatQty(summary.totalQty)}
                        color="#0284c7"
                        bgColor="rgba(2,132,199,0.1)"
                    />
                    <SummaryCard
                        icon={DollarSign}
                        label="Giá BQGQ trung bình"
                        value={formatCurrency(summary.avgPrice)}
                        color="#059669"
                        bgColor="rgba(5,150,105,0.1)"
                    />
                    <SummaryCard
                        icon={Warehouse}
                        label="Tổng giá trị tồn kho"
                        value={formatCurrency(summary.totalValue)}
                        color="#d97706"
                        bgColor="rgba(217,119,6,0.1)"
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput
                        placeholder="Tìm theo mã, tên vật tư…"
                        value={searchTerm}
                        onChange={handleSearch}
                        sx={{
                            flex: '1 1 240px',
                            minWidth: 200,
                            maxWidth: 420,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                borderRadius: '10px',
                                fontSize: '13px',
                                '& fieldset': { border: 'none' },
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                '&.Mui-focused': {
                                    bgcolor: '#fff',
                                    borderColor: '#3b82f6',
                                    boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                                },
                                '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                            },
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="item-price-wh-label" sx={{ fontSize: '13px' }}>
                            Kho
                        </InputLabel>
                        <Select
                            labelId="item-price-wh-label"
                            label="Kho"
                            value={selectedWarehouse}
                            onChange={handleWarehouseChange}
                            sx={{
                                borderRadius: '10px',
                                fontSize: '13px',
                                bgcolor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                '&.Mui-focused': { bgcolor: '#fff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                            }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px' }}>
                                Tất cả kho
                            </MenuItem>
                            {warehouseOptions.map((w) => (
                                <MenuItem key={w.warehouseId} value={String(w.warehouseId)} sx={{ fontSize: '13px' }}>
                                    {w.warehouseCode ? `${w.warehouseCode} — ` : ''}
                                    {w.warehouseName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        variant="outlined"
                        startIcon={<RefreshCw size={16} />}
                        onClick={fetchReport}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontSize: '13px',
                            borderRadius: '8px',
                            borderColor: 'rgba(0,0,0,0.1)',
                            ml: { xs: 0, sm: 'auto' },
                        }}
                    >
                        Tải lại
                    </Button>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 240,
                        overflow: 'auto',
                        bgcolor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        position: 'relative',
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
                            <CircularProgress size={36} sx={{ color: '#0284c7' }} />
                        </Box>
                    ) : report.items.length === 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 8,
                                color: 'text.secondary',
                            }}
                        >
                            <Package size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                            <Typography sx={{ fontSize: '14px' }}>Không có dữ liệu tồn kho phù hợp bộ lọc</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small" stickyHeader sx={{ minWidth: '100%', tableLayout: 'fixed' }}>
                                <TableHead>
                                    <TableRow>
                                        {COLUMNS.map((col) => (
                                            <TableCell
                                                key={col.id}
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    bgcolor: '#fafafa',
                                                    borderBottom: '2px solid #e5e7eb',
                                                    width: col.width,
                                                    whiteSpace: 'nowrap',
                                                    py: 1.5,
                                                    px: 2,
                                                }}
                                            >
                                                {col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.items.map((row, index) => (
                                        <TableRow
                                            key={`${row.itemId}-${row.warehouseId}`}
                                            hover
                                            sx={{
                                                '&:hover': { bgcolor: '#f9fafb' },
                                                '&:last-child td': { borderBottom: 0 },
                                            }}
                                        >
                                            <TableCell
                                                sx={{
                                                    textAlign: 'center',
                                                    color: '#9ca3af',
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {(page - 1) * pageSize + index + 1}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    fontWeight: 500,
                                                    color: '#374151',
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {row.itemCode}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: '#374151',
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    maxWidth: 280,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                                title={row.itemName}
                                            >
                                                {row.itemName}
                                            </TableCell>
                                            <TableCell sx={{ py: 1.75, px: 2, borderBottom: '1px solid #f3f4f6' }}>
                                                <Chip
                                                    label={row.warehouseName}
                                                    size="small"
                                                    sx={{
                                                        fontSize: '11px',
                                                        height: '22px',
                                                        bgcolor: '#f3f4f6',
                                                        color: '#374151',
                                                        border: 'none',
                                                        borderRadius: '999px',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: '#2563eb',
                                                    fontWeight: 500,
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {formatCurrency(row.latestImportPrice)}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: '#059669',
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {formatCurrency(row.weightedAveragePrice)}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: '#374151',
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {formatQty(row.totalInventory)}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: '#d97706',
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    py: 1.75,
                                                    px: 2,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    borderBottom: '1px solid #f3f4f6',
                                                }}
                                            >
                                                {formatCurrency(row.inventoryValue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexShrink: 0, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        Số dòng / trang:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            sx={{
                                height: 32,
                                fontSize: '13px',
                                borderRadius: '8px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
                            }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                                    {n}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {start}–{end} / {report.totalRecords} (Trang {page}/{totalPages})
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        sx={{
                            minWidth: 36,
                            textTransform: 'none',
                            fontSize: '13px',
                            borderRadius: '8px',
                            borderColor: 'rgba(0,0,0,0.1)',
                        }}
                    >
                        Trước
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page >= totalPages || loading || report.totalRecords === 0}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        sx={{
                            minWidth: 36,
                            textTransform: 'none',
                            fontSize: '13px',
                            borderRadius: '8px',
                            borderColor: 'rgba(0,0,0,0.1)',
                        }}
                    >
                        Sau
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
