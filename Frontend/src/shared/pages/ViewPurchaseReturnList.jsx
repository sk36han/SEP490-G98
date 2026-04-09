import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import {
    Box, Paper, Button, Typography, IconButton, Tooltip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Popover, FormGroup,
    FormControlLabel, Checkbox, Chip, TableSortLabel, CircularProgress,
    Alert, FormControl, Select, MenuItem
} from '@mui/material';
import { FileText, Filter, Columns, Plus, GripVertical, RotateCcw, PackageCheck, Clock, CheckCircle2 } from 'lucide-react';
import GRNListPopup from '../components/GRNListPopup';
import SearchInput from '../components/SearchInput';
import PurchaseReturnFilterPopup from '../components/PurchaseReturnFilterPopup';
import { getPurchaseReturnNotes } from '../lib/purchaseReturnNoteService';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';

// Import CSS mới
import '../styles/PurchaseReturnList.css';

// Constants & Configs
const STATUS_STYLE = {
    DRAFT: { bgColor: '#f1f5f9', color: '#64748b', label: 'Nháp' },
    SUBMITTED: { bgColor: '#fef3c7', color: '#b45309', label: 'Chờ duyệt' },
    APPROVED: { bgColor: '#dcfce7', color: '#166534', label: 'Đã duyệt' },
    POSTED: { bgColor: '#f3e8ff', color: '#6b21a8', label: 'Hoàn thành' },
    CANCELLED: { bgColor: '#fee2e2', color: '#991b1b', label: 'Đã hủy' },
};

export default function ViewPurchaseReturnList() {
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [showGRNListPopup, setShowGRNListPopup] = useState(false);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    // Bổ sung các states quản lý cột (vẫn giữ logic cũ của bạn)
    const [visibleColumnIds, setVisibleColumnIds] = useState(new Set(['stt', 'returnCode', 'supplierName', 'status', 'totalReturnedAmount']));

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getPurchaseReturnNotes({ page: 1, pageSize: 1000 });
            setList(result.items);
        } catch (err) {
            setError('Không thể tải danh sách phiếu trả hàng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    usePolling('purchaseReturns', () => fetchDataRef.current?.());

    // Helper render Summary Card
    // Helper render Summary Card (Đã xóa type annotations)
    const renderSummaryCard = (icon, label, value, color, bgColor) => (
        <div className="summary-card">
            <div className="summary-icon-box" style={{ backgroundColor: bgColor }}>
                {React.createElement(icon, { size: 22, color: color })}
            </div>
            <div className="summary-content">
                <Typography className="summary-label" variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    {label}
                </Typography>
                <Typography className="summary-value" variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {value}
                </Typography>
            </div>
        </div>
    );

    return (
        <div className="list-page-container">
            {/* Header & Stats */}
            <div className="list-header-section">
                <div className="list-title-group">
                    <h1>Danh sách phiếu trả hàng</h1>
                    <span>Quản lý nghiệp vụ trả hàng nhà cung cấp</span>
                </div>

                <div className="summary-grid">
                    {renderSummaryCard(PackageCheck, "Tổng phiếu", list.length, "#64748b", "#f1f5f9")}
                    {renderSummaryCard(Clock, "Đang xử lý", list.filter(x => x.status === 'SUBMITTED').length, "#d97706", "#fffbeb")}
                    {renderSummaryCard(CheckCircle2, "Hoàn thành", list.filter(x => x.status === 'POSTED').length, "#059669", "#ecfdf5")}
                </div>
            </div>

            {/* Main Table Area */}
            <div className="list-main-content">
                <div className="list-paper-wrapper">
                    {/* Toolbar */}
                    <div className="list-toolbar">
                        <SearchInput
                            placeholder="Tìm nhanh mã phiếu, NCC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, maxWidth: 400 }}
                        />
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Bộ lọc">
                                <IconButton onClick={() => setFilterOpen(true)} className="toolbar-btn">
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Cấu hình cột">
                                <IconButton onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}>
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={18} />}
                                onClick={() => setShowGRNListPopup(true)}
                                className="create-btn"
                                sx={{ bgcolor: '#0284c7', textTransform: 'none', borderRadius: '8px' }}
                            >
                                Tạo phiếu trả hàng
                            </Button>
                        </Box>
                    </div>

                    {/* Table */}
                    <TableContainer className="custom-table-container">
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
                        ) : (
                            <Table stickyHeader size="small">
                                <TableHead className="custom-table-head">
                                    <TableRow>
                                        <TableCell align="center" width={60}>STT</TableCell>
                                        <TableCell>Mã phiếu</TableCell>
                                        <TableCell>Nhà cung cấp</TableCell>
                                        <TableCell>Ngày trả</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="right">Tổng tiền hoàn</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {list.slice(page * pageSize, (page + 1) * pageSize).map((row, idx) => {
                                        const status = STATUS_STYLE[row.status] || STATUS_STYLE.DRAFT;
                                        return (
                                            <TableRow key={row.purchaseReturnId} className="custom-table-row">
                                                <TableCell align="center" className="custom-table-cell">
                                                    {page * pageSize + idx + 1}
                                                </TableCell>
                                                <TableCell className="custom-table-cell">
                                                    <a href={`/purchase-returns/${row.purchaseReturnId}`} className="link-cell">
                                                        {row.returnCode}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="custom-table-cell">{row.supplierName}</TableCell>
                                                <TableCell className="custom-table-cell">{row.returnDate}</TableCell>
                                                <TableCell className="custom-table-cell">
                                                    <Chip 
                                                        label={status.label} 
                                                        className="status-chip-custom"
                                                        style={{ backgroundColor: status.bgColor, color: status.color }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" className="custom-table-cell font-bold">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.totalReturnedAmount)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>

                    {/* Pagination */}
                    <div className="list-pagination">
                        <Typography variant="caption" color="text.secondary">
                            Hiển thị {page * pageSize + 1} - {Math.min((page + 1) * pageSize, list.length)} trên {list.length}
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select value={pageSize} onChange={(e) => setPageSize(e.target.value)} sx={{ height: 32, fontSize: 12 }}>
                                {[10, 20, 50, 100].map(v => <MenuItem key={v} value={v}>{v} dòng/trang</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
                            <Button size="small" disabled={(page + 1) * pageSize >= list.length} onClick={() => setPage(p => p + 1)}>Sau</Button>
                        </Box>
                    </div>
                </div>
            </div>

            {/* Popups & Dialogs */}
            <GRNListPopup open={showGRNListPopup} onClose={() => setShowGRNListPopup(false)} onSelect={(grn) => navigate(`/purchase-returns/create?grnId=${grn.grnId}`)} />
            <PurchaseReturnFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} onApply={(v) => setFilterValues(v)} />
        </div>
    );
}