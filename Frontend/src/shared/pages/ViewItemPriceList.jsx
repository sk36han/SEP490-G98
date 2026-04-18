/**
 * ViewItemPriceList - Giá bình quân gia quyền & Giá nhập
 * Dành cho: Kế Toán, Giám Đốc
 * Xem giá nhập và giá bình quân gia quyền theo từng vật tư trong kho
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    InputAdornment,
} from '@mui/material';
import { DollarSign, TrendingUp, Package, Warehouse, RefreshCw } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import '../styles/ListView.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const COLUMNS = [
    { id: 'stt',           label: 'STT',          width: 60  },
    { id: 'itemCode',      label: 'Mã vật tư',    width: 140 },
    { id: 'itemName',      label: 'Tên vật tư',   width: 280 },
    { id: 'warehouseName', label: 'Kho',           width: 180 },
    { id: 'purchasePrice', label: 'Giá nhập mới nhất', width: 160 },
    { id: 'avgPrice',      label: 'Giá bình quân gia quyền', width: 180 },
    { id: 'totalQty',      label: 'Tổng tồn',     width: 120 },
    { id: 'totalValue',    label: 'Giá trị tồn kho', width: 160 },
];

// Mock data — thay bằng API khi backend sẵn sàng
const MOCK_DATA = [
    { itemId: 1,  itemCode: 'PEN-001',  itemName: 'Bút bi Thiên Long TL-057',  warehouseId: 1, warehouseName: 'Kho Hà Nội',  purchasePrice: 3500,  avgPrice: 3420, totalQty: 500,  totalValue: 1710000  },
    { itemId: 2,  itemCode: 'NOTE-001', itemName: 'Vở note 5 chấm A5',        warehouseId: 1, warehouseName: 'Kho Hà Nội',  purchasePrice: 22000, avgPrice: 21500, totalQty: 120,  totalValue: 2580000  },
    { itemId: 3,  itemCode: 'COVER-001', itemName: 'Bìa còng A4 10mm',       warehouseId: 2, warehouseName: 'Kho TP.HCM',  purchasePrice: 8500,  avgPrice: 8200, totalQty: 80,   totalValue: 656000   },
    { itemId: 4,  itemCode: 'PAPER-001', itemName: 'Giấy A4 Double A 80gsm', warehouseId: 1, warehouseName: 'Kho Hà Nội',  purchasePrice: 62000, avgPrice: 60000, totalQty: 45,   totalValue: 2700000  },
    { itemId: 5,  itemCode: 'CLIP-001',  itemName: 'Kẹp giấy 33mm (hộp 50)', warehouseId: 3, warehouseName: 'Kho Đà Nẵng', purchasePrice: 18000, avgPrice: 17500, totalQty: 200,  totalValue: 3500000  },
    { itemId: 6,  itemCode: 'GLUE-001',  itemName: 'Keo dán thiên long 15g',  warehouseId: 2, warehouseName: 'Kho TP.HCM',  purchasePrice: 7000,  avgPrice: 6800, totalQty: 350,  totalValue: 2380000  },
    { itemId: 7,  itemCode: 'RULER-001', itemName: 'Thước kẻ 30cm nhựa trong',warehouseId: 1, warehouseName: 'Kho Hà Nội',  purchasePrice: 5000,  avgPrice: 4900, totalQty: 150,  totalValue: 735000   },
    { itemId: 8,  itemCode: 'ERASER-001', itemName: 'Tẩy thiên long 7122',     warehouseId: 3, warehouseName: 'Kho Đà Nẵng', purchasePrice: 4000,  avgPrice: 3900, totalQty: 400,  totalValue: 1560000  },
    { itemId: 9,  itemCode: 'PEN-002',   itemName: 'Bút chì 2B Thiên Long',    warehouseId: 1, warehouseName: 'Kho Hà Nội',  purchasePrice: 5000,  avgPrice: 4800, totalQty: 300,  totalValue: 1440000  },
    { itemId: 10, itemCode: 'NOTE-002',  itemName: 'Sổ tay A5 200 trang',     warehouseId: 2, warehouseName: 'Kho TP.HCM',  purchasePrice: 35000, avgPrice: 34000, totalQty: 60,   totalValue: 2040000  },
];

const ROWS_PER_PAGE_OPTIONS = [20, 50, 100];

const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <Box sx={{
        flex: '1 1 200px', minWidth: 200, bgcolor: '#fff',
        border: '1px solid #e5e7eb', borderRadius: '14px', p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
        <Box sx={{
            width: 48, height: 48, borderRadius: '12px', bgcolor: bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
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

export default function ViewItemPriceList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const uniqueWarehouses = useMemo(() => {
        const seen = new Set();
        return MOCK_DATA.filter(d => { if (seen.has(d.warehouseId)) return false; seen.add(d.warehouseId); return true; })
            .map(d => ({ warehouseId: d.warehouseId, warehouseName: d.warehouseName }));
    }, []);

    const filteredData = useMemo(() => {
        let result = [...MOCK_DATA];
        if (selectedWarehouse !== 'all') {
            result = result.filter(d => d.warehouseId === Number(selectedWarehouse));
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(d =>
                (d.itemCode ?? '').toLowerCase().includes(term) ||
                (d.itemName ?? '').toLowerCase().includes(term)
            );
        }
        return result;
    }, [searchTerm, selectedWarehouse]);

    const summary = useMemo(() => {
        const totalItems = filteredData.length;
        const totalQty = filteredData.reduce((s, d) => s + d.totalQty, 0);
        const totalValue = filteredData.reduce((s, d) => s + d.totalValue, 0);
        const avgPrice = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;
        return { totalItems, totalQty, totalValue, avgPrice };
    }, [filteredData]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const start = filteredData.length > 0 ? page * pageSize + 1 : 0;
    const end = Math.min((page + 1) * pageSize, filteredData.length);
    const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleWarehouseChange = (e) => {
        setSelectedWarehouse(e.target.value);
        setPage(0);
    };

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Page Header */}
            <Box sx={{ px: 3, py: 2.5, bgcolor: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DollarSign size={20} color="#6b7280" />
                    <Typography variant="h5" fontWeight={600} sx={{ fontSize: '20px', color: '#111827' }}>
                        Giá bình quân gia quyền
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.25 }}>
                    Giá nhập & giá bình quân gia quyền theo vật tư trong kho
                </Typography>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2.5, gap: 2 }}>
                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <SummaryCard
                        icon={Package}
                        label="Tổng vật tư"
                        value={summary.totalItems.toLocaleString()}
                        color="#6b7280"
                        bgColor="rgba(107,114,128,0.1)"
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Tổng tồn kho"
                        value={summary.totalQty.toLocaleString()}
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

                {/* Filter Bar */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput
                        placeholder="Tìm theo mã, tên vật tư…"
                        value={searchTerm}
                        onChange={handleSearch}
                        sx={{
                            flex: '1 1 240px', minWidth: 200, maxWidth: 420,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px',
                                fontSize: '13px', '& fieldset': { border: 'none' },
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                '&.Mui-focused': { bgcolor: '#fff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                                '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                            },
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={selectedWarehouse}
                            onChange={handleWarehouseChange}
                            sx={{
                                borderRadius: '10px', fontSize: '13px', bgcolor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                '&.Mui-focused': { bgcolor: '#fff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                            }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px' }}>Tất cả kho</MenuItem>
                            {uniqueWarehouses.map(w => (
                                <MenuItem key={w.warehouseId} value={w.warehouseId} sx={{ fontSize: '13px' }}>
                                    {w.warehouseName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Table */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                    {paginatedData.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
                            <Package size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                            <Typography sx={{ fontSize: '14px' }}>Không có dữ liệu</Typography>
                        </Box>
                    ) : (
                        <Table size="small" stickyHeader sx={{ minWidth: '100%', tableLayout: 'fixed' }}>
                            <TableHead>
                                <TableRow>
                                    {COLUMNS.map(col => (
                                        <TableCell
                                            key={col.id}
                                            sx={{
                                                fontWeight: 600, fontSize: '12px', color: '#6b7280',
                                                bgcolor: '#fafafa', borderBottom: '1px solid #e5e7eb',
                                                width: col.width, whiteSpace: 'nowrap', py: 1.5, px: 2,
                                            }}
                                        >
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.map((row, index) => (
                                    <TableRow
                                        key={`${row.itemId}-${row.warehouseId}`}
                                        hover
                                        sx={{ '&:hover': { bgcolor: '#f9fafb' }, '&:last-child td': { borderBottom: 0 } }}
                                    >
                                        <TableCell sx={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {(page * pageSize) + index + 1}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500, color: '#374151', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {row.itemCode}
                                        </TableCell>
                                        <TableCell sx={{ color: '#374151', fontSize: '13px', py: 1.5, px: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row.itemName}
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280', fontSize: '13px', py: 1.5, px: 2 }}>
                                            <Chip
                                                label={row.warehouseName}
                                                size="small"
                                                sx={{
                                                    fontSize: '11px', height: '22px', bgcolor: '#f3f4f6',
                                                    color: '#374151', border: 'none', borderRadius: '999px',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: '#2563eb', fontWeight: 500, fontSize: '13px', py: 1.5, px: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatCurrency(row.purchasePrice)}
                                        </TableCell>
                                        <TableCell sx={{ color: '#059669', fontWeight: 600, fontSize: '13px', py: 1.5, px: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatCurrency(row.avgPrice)}
                                        </TableCell>
                                        <TableCell sx={{ color: '#374151', fontSize: '13px', py: 1.5, px: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {row.totalQty.toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ color: '#d97706', fontWeight: 600, fontSize: '13px', py: 1.5, px: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatCurrency(row.totalValue)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Box>

                {/* Pagination */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        Số dòng / trang:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' } }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map(n => (
                                <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {start}–{end} / {filteredData.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <button
                            disabled={page <= 0}
                            onClick={() => setPage(p => p - 1)}
                            style={{
                                minWidth: 36, height: 32, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: page <= 0 ? '#f9fafb' : '#fff', cursor: page <= 0 ? 'default' : 'pointer',
                                color: page <= 0 ? '#d1d5db' : '#374151', fontSize: '13px', padding: 0,
                            }}
                        >
                            ‹
                        </button>
                        <button
                            disabled={end >= filteredData.length || filteredData.length === 0}
                            onClick={() => setPage(p => p + 1)}
                            style={{
                                minWidth: 36, height: 32, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: (end >= filteredData.length || filteredData.length === 0) ? '#f9fafb' : '#fff',
                                cursor: (end >= filteredData.length || filteredData.length === 0) ? 'default' : 'pointer',
                                color: (end >= filteredData.length || filteredData.length === 0) ? '#d1d5db' : '#374151', fontSize: '13px', padding: 0,
                            }}
                        >
                            ›
                        </button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
