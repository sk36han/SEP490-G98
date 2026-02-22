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
import { Plus, Eye, Edit, Columns } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import '../styles/ListView.css';

const MOCK_POS = [
    { purchaseOrderId: 1, pocode: 'PO-2025-001', supplierId: 1, supplierName: 'Công ty A', requestedDate: '2025-02-10', status: 'Draft', currentStageNo: 0, createdAt: '2025-02-10T08:00:00' },
    { purchaseOrderId: 2, pocode: 'PO-2025-002', supplierId: 2, supplierName: 'Công ty B', requestedDate: '2025-02-12', status: 'Submitted', currentStageNo: 1, createdAt: '2025-02-12T09:00:00' },
    { purchaseOrderId: 3, pocode: 'PO-2025-003', supplierId: 1, supplierName: 'Công ty A', requestedDate: '2025-02-14', status: 'Approved', currentStageNo: 2, createdAt: '2025-02-14T10:00:00' },
];

const PO_LIST_COLUMNS = [
    { id: 'pocode', label: 'PO Code', getValue: (row) => row.pocode ?? '' },
    { id: 'supplierName', label: 'Nhà cung cấp', getValue: (row) => row.supplierName ?? '' },
    { id: 'requestedDate', label: 'Ngày yêu cầu', getValue: (row) => row.requestedDate ?? '' },
    { id: 'status', label: 'Trạng thái', getValue: (row) => row.status ?? '' },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];
const DEFAULT_VISIBLE_PO_COLUMN_IDS = PO_LIST_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const PurchaseOrderList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_PO_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    useEffect(() => setList(MOCK_POS), []);

    const filteredList = React.useMemo(() => {
        if (!searchTerm.trim()) return list;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = normalize(searchTerm.trim());
        return list.filter((po) => {
            const matchPocode = normalize(po.pocode).includes(term);
            const matchSupplier = normalize(po.supplierName).includes(term);
            const matchDate = (po.requestedDate && String(po.requestedDate).toLowerCase().includes(term)) || normalize(po.requestedDate).includes(term);
            return matchPocode || matchSupplier || matchDate;
        });
    }, [list, searchTerm]);

    useEffect(() => setPage(0), [searchTerm]);

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
    const handleSelectAllPOColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_PO_COLUMN_IDS) : new Set());
    };
    const visibleColumns = PO_LIST_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const statusColor = (s) => (s === 'Approved' ? 'success' : s === 'Submitted' ? 'info' : 'default');

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                    Quản lý đơn mua hàng
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>Danh sách đơn mua hàng – tìm kiếm theo PO code, nhà cung cấp, ngày yêu cầu.</Typography>
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
                            placeholder="Tìm theo PO code, nhà cung cấp, ngày yêu cầu…"
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
                            <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/purchase-orders/create')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>
                                Tạo đơn mua hàng
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị</Typography>
                <FormGroup>
                    <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === PO_LIST_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PO_LIST_COLUMNS.length} onChange={(e) => handleSelectAllPOColumns(e.target.checked)} />} label="Tất cả" />
                    {PO_LIST_COLUMNS.map((col) => (
                        <FormControlLabel key={col.id} control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} />} label={col.label} />
                    ))}
                </FormGroup>
            </Popover>

            <Card className="list-grid-card" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1 }}>
                <Box className="list-grid-wrapper" sx={{ position: 'relative', minHeight: 'calc(100vh - 220px)' }}>
                    {paginatedList.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                            <Typography>Chưa có dữ liệu đơn mua hàng</Typography>
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
                                    {paginatedList.map((po) => (
                                        <TableRow key={po.purchaseOrderId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            {visibleColumns.map((col) => {
                                                if (col.id === 'status') return <TableCell key={col.id} align="left"><Chip label={po.status} size="small" color={statusColor(po.status)} /></TableCell>;
                                                if (col.id === 'actions') {
                                                    return (
                                                        <TableCell key={col.id} align="right">
                                                            <Tooltip title="Xem"><IconButton size="small" onClick={() => navigate(`/purchase-orders/${po.purchaseOrderId}`)}><Eye size={18} /></IconButton></Tooltip>
                                                            <Tooltip title="Sửa"><IconButton size="small" onClick={() => navigate(`/purchase-orders/edit/${po.purchaseOrderId}`)}><Edit size={18} /></IconButton></Tooltip>
                                                        </TableCell>
                                                    );
                                                }
                                                return <TableCell key={col.id} align="left">{col.getValue(po)}</TableCell>;
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Card>

            {/* Pagination – gom hết bên phải: Số dòng/trang + dropdown + range + Trước/Sau */}
            <Box
                sx={{
                    mt: 0,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 2,
                }}
            >
                <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
                <FormControl size="small" sx={{ minWidth: 72 }}>
                    <Select value={pageSize} onChange={handlePageSizeChange} sx={{ height: 32, fontSize: '0.875rem' }}>
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
                    {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page <= 0}
                    onClick={() => handlePageChange(page - 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Trước
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={end >= totalCount || totalCount === 0}
                    onClick={() => handlePageChange(page + 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Sau
                </Button>
            </Box>
            </Box>
        </Box>
    );
};

export default PurchaseOrderList;
