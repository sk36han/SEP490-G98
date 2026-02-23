import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Chip,
} from '@mui/material';
import { Filter, Columns, Eye, Edit } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import PurchaseOrderFilterPopup from '../components/PurchaseOrderFilterPopup';
import '../styles/PurchaseOrderView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Màu pill trạng thái đơn mua – tham khảo ViewUserAccountList */
const PO_STATUS_STYLE = {
    Draft: { color: 'text.secondary', borderColor: 'grey.400', label: 'Nháp' },
    Submitted: { color: 'warning.main', borderColor: 'warning.main', label: 'Đã gửi' },
    Approved: { color: 'success.main', borderColor: 'success.main', label: 'Đã duyệt' },
};

const PO_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: () => '' },
    { id: 'orderCode', label: 'Mã đơn mua', getValue: (row) => row.orderCode ?? '' },
    { id: 'createdBy', label: 'Người gửi đơn', getValue: (row) => row.createdBy ?? '' },
    { id: 'supplierName', label: 'Nhà cung cấp', getValue: (row) => row.supplierName ?? '' },
    { id: 'purchaseDate', label: 'Ngày mua', getValue: (row) => row.purchaseDate ?? '' },
    { id: 'status', label: 'Trạng thái', getValue: (row) => PO_STATUS_STYLE[row.status]?.label ?? row.status ?? '' },
    { id: 'createdAt', label: 'Ngày tạo đơn', getValue: (row) => row.createdAt ?? '' },
    { id: 'submittedAt', label: 'Ngày gửi đơn', getValue: (row) => row.submittedAt ?? '-' },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = PO_COLUMNS.map((c) => c.id);

/** Mock danh sách đơn mua – UI only, chưa call API */
const MOCK_PO_LIST = [
    { purchaseOrderId: 1, orderCode: 'PO-2025-001', createdBy: 'Nguyễn Văn A', supplierName: 'Công ty TNHH ABC', purchaseDate: '2025-02-10', status: 'Draft', createdAt: '2025-02-09', submittedAt: null },
    { purchaseOrderId: 2, orderCode: 'PO-2025-002', createdBy: 'Trần Thị B', supplierName: 'Công ty CP XYZ', purchaseDate: '2025-02-12', status: 'Submitted', createdAt: '2025-02-11', submittedAt: '2025-02-12' },
    { purchaseOrderId: 3, orderCode: 'PO-2025-003', createdBy: 'Lê Văn C', supplierName: 'Công ty TNHH ABC', purchaseDate: '2025-02-14', status: 'Approved', createdAt: '2025-02-13', submittedAt: '2025-02-14' },
    { purchaseOrderId: 4, orderCode: 'PO-2025-004', createdBy: 'Phạm Thị D', supplierName: 'Công ty CP XYZ', purchaseDate: '2025-02-15', status: 'Draft', createdAt: '2025-02-14', submittedAt: null },
];

export default function ViewPurchaseOrder() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());
    };

    const visibleColumns = PO_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const filteredRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';
        let list = [...MOCK_PO_LIST];

        if (term) {
            list = list.filter((row) => {
                const matchCode = normalize(row.orderCode).includes(term);
                const matchCreator = normalize(row.createdBy).includes(term);
                const matchSupplier = normalize(row.supplierName).includes(term);
                return matchCode || matchCreator || matchSupplier;
            });
        }

        if (filterValues.status) {
            list = list.filter((row) => row.status === filterValues.status);
        }
        if (filterValues.fromDate) {
            list = list.filter((row) => {
                const d = row.purchaseDate || row.createdAt;
                return d && d >= filterValues.fromDate;
            });
        }
        if (filterValues.toDate) {
            list = list.filter((row) => {
                const d = row.purchaseDate || row.createdAt;
                return d && d <= filterValues.toDate;
            });
        }

        return list;
    }, [searchTerm, filterValues]);

    const totalRows = filteredRows.length;
    const start = totalRows === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalRows);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalRows / pageSize)) : 0;
    const rows = useMemo(
        () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
        [filteredRows, page, pageSize]
    );

    const handleSearch = useCallback(() => setPage(0), []);
    const handleFilterApply = useCallback((values) => {
        setFilterValues(values);
        setPage(0);
    }, []);
    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <PurchaseOrderFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    fontWeight="800"
                    sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Quản lý đơn mua (PO)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    Tra cứu và quản lý đơn mua hàng.
                </Typography>
            </Box>

            <Box
                className="po-view"
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
                <Card
                    className="po-filter-card"
                    sx={{
                        mb: 1,
                        borderRadius: 3,
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                    }}
                >
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: 1.5,
                                alignItems: isMobile ? 'stretch' : 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <SearchInput
                                placeholder="Tìm theo mã đơn mua, nhà cung cấp, người gửi…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="po-search-input"
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={() => setFilterOpen(true)}
                                    aria-label="Bộ lọc"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                                    aria-label="Chọn cột"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    className="po-page-btn"
                                    variant="contained"
                                    onClick={() => navigate('/purchase-orders/create')}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        minHeight: 36,
                                        px: 2,
                                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
                                            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
                                        },
                                    }}
                                    startIcon={<span style={{ fontSize: 18, fontWeight: 700 }}>+</span>}
                                >
                                    Tạo mới
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover
                    open={columnSelectorOpen}
                    anchorEl={columnSelectorAnchor}
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>
                        Chọn cột hiển thị
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={visibleColumnIds.size === PO_COLUMNS.length}
                                    indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PO_COLUMNS.length}
                                    onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                />
                            }
                            label="Tất cả"
                        />
                        {PO_COLUMNS.map((col) => (
                            <FormControlLabel
                                key={col.id}
                                control={
                                    <Checkbox
                                        checked={visibleColumnIds.has(col.id)}
                                        onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                    />
                                }
                                label={col.label}
                            />
                        ))}
                    </FormGroup>
                </Popover>

                <Card
                    className="po-grid-card"
                    sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                        p: 1,
                    }}
                >
                    <Box className="po-grid-wrapper" sx={{ position: 'relative', minHeight: 'calc(100vh - 220px)' }}>
                        {rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                                <Typography>Chưa có dữ liệu đơn mua</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id} sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align={col.id === 'actions' ? 'right' : 'left'}>
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.purchaseOrderId} hover>
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                {page * pageSize + index + 1}
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'status') {
                                                        const style = PO_STATUS_STYLE[row.status] ?? { color: 'text.secondary', borderColor: 'grey.400', label: row.status ?? '' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Chip
                                                                    label={style.label}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        fontWeight: 600,
                                                                        borderRadius: '50px',
                                                                        px: 1.25,
                                                                        bgcolor: 'transparent',
                                                                        color: style.color,
                                                                        border: '1px solid',
                                                                        borderColor: style.borderColor,
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Tooltip title="Xem">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => navigate(`/purchase-orders/${row.purchaseOrderId}`)}
                                                                        aria-label="Xem"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Sửa">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => navigate(`/purchase-orders/edit/${row.purchaseOrderId}`)}
                                                                        aria-label="Sửa"
                                                                    >
                                                                        <Edit size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
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
                        <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            sx={{ height: 32, fontSize: '0.875rem' }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                <MenuItem key={n} value={n}>{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
                        {start}–{end} / {totalRows} (Tổng {totalPages} trang)
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
                        disabled={end >= totalRows || totalRows === 0}
                        onClick={() => handlePageChange(page + 1)}
                        sx={{ minWidth: 36, textTransform: 'none' }}
                    >
                        Sau
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
