import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    InputBase,
    CircularProgress,
    Chip,
} from '@mui/material';
import { X, Search, RefreshCw, RotateCcw } from 'lucide-react';
import { getGoodReceiptNotes } from '../lib/goodReceiptNoteService';
import { formatDate } from '../lib/dateUtils';

const STATUS_STYLE = {
    DRAFT:        { bgColor: 'rgba(107,114,128,0.15)', label: 'Bản nháp', color: '#6b7280' },
    PENDING_ACC: { bgColor: 'rgba(251,191,36,0.20)',  label: 'Đợi duyệt', color: '#b45309' },
    APPROVED:     { bgColor: 'rgba(16,185,129,0.18)',  label: 'Đã duyệt', color: '#047857' },
    REJECTED:     { bgColor: 'rgba(239,68,68,0.15)',   label: 'Từ chối', color: '#dc2626' },
    POSTED:       { bgColor: 'rgba(139,92,246,0.15)',  label: 'Đã ghi sổ', color: '#7c3aed' },
};

const ROWS_PER_PAGE = 10;

const GRNListPopup = ({ open, onClose, onSelect }) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const fetchGRNs = async (searchKeyword = '') => {
        setLoading(true);
        try {
            const result = await getGoodReceiptNotes({ page: 1, pageSize: 100 });
            let grnList = result.items || [];

            // Lọc chỉ lấy GRN đã duyệt (APPROVED/POSTED) để có thể trả hàng
            grnList = grnList.filter(grn => {
                const status = (grn.status || '').toUpperCase();
                return status === 'APPROVED' || status === 'POSTED';
            });

            // Lọc theo search
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                grnList = grnList.filter(grn =>
                    (grn.grnCode || '').toLowerCase().includes(kw) ||
                    (grn.supplierName || '').toLowerCase().includes(kw) ||
                    (grn.warehouseName || '').toLowerCase().includes(kw)
                );
            }

            setItems(grnList);
            setTotalItems(grnList.length);
            setTotalPages(Math.ceil(grnList.length / ROWS_PER_PAGE));
        } catch (err) {
            console.error('Lỗi tải GRN:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchGRNs();
        }
    }, [open]);

    const handleSearch = () => {
        setSearch(searchInput);
        fetchGRNs(searchInput);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleRefresh = () => {
        setSearchInput('');
        setSearch('');
        fetchGRNs('');
    };

    if (!open) return null;

    // Pagination
    const startIndex = (page - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const paginatedItems = items.slice(startIndex, endIndex);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Paper sx={{
                width: '90vw', maxWidth: 1000, maxHeight: '85vh',
                borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 3, py: 2, borderBottom: '1px solid #e5e7eb',
                    bgcolor: '#f9fafb',
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>
                        Chọn phiếu nhập kho để trả hàng
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <X size={20} />
                    </IconButton>
                </Box>

                {/* Search bar */}
                <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1.5, alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        bgcolor: '#f3f4f6', borderRadius: '10px',
                        px: 1.5, py: 0.5, flex: 1,
                    }}>
                        <Search size={16} color="#9ca3af" />
                        <InputBase
                            placeholder="Tìm mã phiếu nhập, nhà cung cấp, kho..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            sx={{ flex: 1, fontSize: '13px', ml: 0.5 }}
                        />
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleSearch}
                        sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '13px', px: 2 }}
                    >
                        Tìm kiếm
                    </Button>
                    <IconButton onClick={handleRefresh} size="small" title="Làm mới">
                        <RefreshCw size={16} />
                    </IconButton>
                </Box>

                {/* Table */}
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2, width: 50 }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>Mã phiếu nhập</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>Ngày nhập</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>Nhà cung cấp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>Kho nhập</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', py: 1.5, px: 2, textAlign: 'center' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: '#9ca3af' }}>
                                        Không có phiếu nhập kho nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((grn, idx) => {
                                    const status = (grn.status || '').toUpperCase();
                                    const statusStyle = STATUS_STYLE[status] || { bgColor: 'rgba(107,114,128,0.15)', label: grn.status || '-', color: '#6b7280' };
                                    return (
                                        <TableRow
                                            key={grn.grnId || grn.GrnId || idx}
                                            hover
                                            sx={{ '&:hover': { bgcolor: '#f9fafb' } }}
                                        >
                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: '13px', color: '#374151' }}>
                                                {startIndex + idx + 1}
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
                                                {grn.grnCode || grn.GrnCode || '-'}
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: '13px', color: '#374151' }}>
                                                {formatDate(grn.receiptDate || grn.ReceiptDate) || '-'}
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: '13px', color: '#374151' }}>
                                                {grn.supplierName || grn.SupplierName || '-'}
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: '13px', color: '#374151' }}>
                                                {grn.warehouseName || grn.WarehouseName || '-'}
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5 }}>
                                                <Chip
                                                    label={statusStyle.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: statusStyle.bgColor,
                                                        color: statusStyle.color,
                                                        fontWeight: 600,
                                                        fontSize: '11px',
                                                        height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => onSelect(grn)}
                                                    sx={{
                                                        bgcolor: '#10b981',
                                                        '&:hover': { bgcolor: '#059669' },
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        px: 1.5,
                                                        py: 0.5,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    Trả hàng
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f9fafb' }}>
                        <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                            Tổng: {totalItems} phiếu nhập kho
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Button
                                size="small"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                sx={{ minWidth: 0, px: 1, fontSize: '12px' }}
                            >
                                ‹
                            </Button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (page <= 3) p = i + 1;
                                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                    else p = page - 2 + i;
                                }
                                return (
                                    <Button
                                        key={p}
                                        size="small"
                                        onClick={() => setPage(p)}
                                        sx={{
                                            minWidth: 0, px: 1.25, fontSize: '12px',
                                            bgcolor: page === p ? '#3b82f6' : 'transparent',
                                            color: page === p ? '#fff' : '#374151',
                                            '&:hover': { bgcolor: page === p ? '#2563eb' : '#f3f4f6' },
                                        }}
                                    >
                                        {p}
                                    </Button>
                                );
                            })}
                            <Button
                                size="small"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                sx={{ minWidth: 0, px: 1, fontSize: '12px' }}
                            >
                                ›
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>
        </div>
    );
};

export default GRNListPopup;
