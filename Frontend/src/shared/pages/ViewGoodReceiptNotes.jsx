import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    Select,
    MenuItem,
    Chip,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Plus, Eye, Edit, Columns, Package } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import '../styles/ListView.css';

/** Mock phiếu nhập hàng (GRN) – có thể thay bằng API */
const MOCK_GRN = [
    { grnid: 1, grncode: 'GRN-2025-001', purchaseOrderCode: 'PO-2025-001', supplierName: 'Công ty A', warehouseName: 'Kho chính', receiptDate: '2025-02-10', status: 'Draft', submittedAt: null, approvedAt: null },
    { grnid: 2, grncode: 'GRN-2025-002', purchaseOrderCode: 'PO-2025-002', supplierName: 'Công ty B', warehouseName: 'Kho phụ', receiptDate: '2025-02-12', status: 'Submitted', submittedAt: '2025-02-12T09:00:00', approvedAt: null },
    { grnid: 3, grncode: 'GRN-2025-003', purchaseOrderCode: 'PO-2025-003', supplierName: 'Công ty A', warehouseName: 'Kho chính', receiptDate: '2025-02-14', status: 'Approved', submittedAt: '2025-02-14T10:00:00', approvedAt: '2025-02-14T11:00:00' },
];

const GRN_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: () => '' },
    { id: 'grncode', label: 'Mã phiếu nhập', getValue: (row) => row.grncode ?? '' },
    { id: 'purchaseOrderCode', label: 'Đơn mua hàng', getValue: (row) => row.purchaseOrderCode ?? '-' },
    { id: 'supplierName', label: 'Nhà cung cấp', getValue: (row) => row.supplierName ?? '' },
    { id: 'warehouseName', label: 'Kho nhận', getValue: (row) => row.warehouseName ?? '' },
    { id: 'receiptDate', label: 'Ngày nhập', getValue: (row) => row.receiptDate ?? '' },
    { id: 'status', label: 'Trạng thái', getValue: (row) => row.status ?? '' },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];
const DEFAULT_VISIBLE_IDS = GRN_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const ViewGoodReceiptNotes = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    useEffect(() => {
        setList(MOCK_GRN);
    }, []);

    const filteredList = React.useMemo(() => {
        if (!searchTerm.trim()) return list;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = normalize(searchTerm.trim());
        return list.filter((row) => {
            const matchCode = normalize(row.grncode).includes(term);
            const matchPO = normalize(row.purchaseOrderCode).includes(term);
            const matchSupplier = normalize(row.supplierName).includes(term);
            const matchWarehouse = normalize(row.warehouseName).includes(term);
            const matchDate = String(row.receiptDate || '').toLowerCase().includes(term);
            return matchCode || matchPO || matchSupplier || matchWarehouse || matchDate;
        });
    }, [list, searchTerm]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    const totalCount = filteredList.length;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const paginatedList = filteredList.slice(page * pageSize, (page + 1) * pageSize);

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };
    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_IDS) : new Set());
    };
    const visibleColumns = GRN_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const statusColor = (s) => (s === 'Approved' ? 'success' : s === 'Submitted' ? 'info' : 'default');

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                    Phiếu nhập hàng
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    Danh sách phiếu nhập hàng – tìm theo mã phiếu, đơn mua hàng, nhà cung cấp, kho, ngày nhập.
                </Typography>
            </Box>
            <Box
                className="list-view"
                sx={{
                    width: '100%',
                    maxWidth: '100%',
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                    borderRadius: 3,
                    p: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (t) => t.shadows[1],
                    boxSizing: 'border-box',
                }}
            >
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã phiếu, đơn mua hàng, nhà cung cấp, kho, ngày nhập…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 420 }}
                            />
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: 1, borderColor: 'divider' }}>
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>
                                    Tạo phiếu nhập hàng
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị</Typography>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === GRN_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < GRN_COLUMNS.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} />} label="Tất cả" />
                        {GRN_COLUMNS.map((col) => (
                            <FormControlLabel key={col.id} control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} />} label={col.label} />
                        ))}
                    </FormGroup>
                </Popover>

                <Card className="list-grid-card" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1 }}>
                    <Box className="list-grid-wrapper" sx={{ position: 'relative', minHeight: 'calc(100vh - 220px)' }}>
                        {paginatedList.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                                <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography>Chưa có phiếu nhập hàng</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id} sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align={col.id === 'actions' ? 'right' : 'left'}>{col.label}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedList.map((row, index) => (
                                            <TableRow key={row.grnid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') return <TableCell key={col.id} align="left">{page * pageSize + index + 1}</TableCell>;
                                                    if (col.id === 'status') return <TableCell key={col.id} align="left"><Chip label={row.status} size="small" color={statusColor(row.status)} /></TableCell>;
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Tooltip title="Xem"><IconButton size="small"><Eye size={18} /></IconButton></Tooltip>
                                                                <Tooltip title="Sửa"><IconButton size="small"><Edit size={18} /></IconButton></Tooltip>
                                                            </TableCell>
                                                        );
                                                    }
                                                    return <TableCell key={col.id} align="left">{col.getValue(row)}</TableCell>;
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Card>

                <Box sx={{ mt: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select value={pageSize} onChange={handlePageSizeChange} sx={{ height: 32, fontSize: '0.875rem' }}>
                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                <MenuItem key={n} value={n}>{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>{start}–{end} / {totalCount} (Tổng {totalPages} trang)</Typography>
                    <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
                    <Button size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
                </Box>
            </Box>
        </Box>
    );
};

export default ViewGoodReceiptNotes;
